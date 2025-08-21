// backend/src/index.tsx
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import * as bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

// Workers env
type Env = {
  Bindings: {
    DB: D1Database
    JWT_SECRET: string
  }
}

type Folder = { id: number; name: string; parentId: number | null; createdAt?: string; updatedAt?: string }
type Note = { id: number; folderId: number; title: string; body: string; flag?: number; createdAt?: string; updatedAt?: string }

const app = new Hono<Env>()

/* ---------------------------- small helpers ---------------------------- */
// comments in English only
const q = (db: D1Database, sql: string, params: unknown[] = []) => db.prepare(sql).bind(...params)
const one = async <T>(stmt: D1PreparedStatement): Promise<T | null> => (await stmt.first<T>()) ?? null
const all = async <T>(stmt: D1PreparedStatement): Promise<T[]> => {
  const r = await stmt.all<T>()
  // @ts-ignore D1 typing
  return (r.results as T[]) ?? []
}
const jsonError = (c: any, status: number, error: string, message: string, details?: any) =>
  c.json({ error, message, details }, status)
const nowUtc = "strftime('%Y-%m-%dT%H:%M:%fZ','now')"

/* ------------------------------- CORS ---------------------------------- */
// If frontend is on another origin, echo that origin so cookies are allowed.
app.use('*', cors({
  origin: (origin) => origin ?? '',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

/* -------------------------- auth: jwt + cookie ------------------------- */
const COOKIE = 'session'
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24h

async function signJwt(payload: any, secret: string) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(new TextEncoder().encode(secret))
}

async function verifyJwt(token: string, secret: string) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
  return payload
}

/* ---------------------------- health check ----------------------------- */
app.get('/api/health', async (c) => {
  try {
    const f = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM folders').first<{ cnt: number }>()
    const n = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM notes').first<{ cnt: number }>()
    return c.json({ ok: true, service: 'encwos-backend', d1: { folders: f?.cnt ?? 0, notes: n?.cnt ?? 0 } })
  } catch (e) {
    return c.json({ ok: false, error: (e as Error).message }, 500)
  }
})

/* =============================== AUTH ================================== */
const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
})

// POST /api/auth/register
app.post('/api/auth/register', zValidator('json', credsSchema), async (c) => {
  const { email, password } = await c.req.json()
  const exists = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM users WHERE email = ?1', [email]))
  if (exists) return jsonError(c, 409, 'email-exists', 'Email already registered.')

  const hash = await bcrypt.hash(password, 10)
  const ins = await q(c.env.DB, 'INSERT INTO users (email, password_hash) VALUES (?1, ?2)', [email, hash]).run()
  if (!ins.success) return jsonError(c, 500, 'register-failed', 'Failed to register.')

  const row = await one<{ id: number; email: string }>(q(c.env.DB, 'SELECT id, email FROM users WHERE email = ?1', [email]))
  if (!row) return jsonError(c, 500, 'register-failed', 'User not found after insert.')

  const token = await signJwt({ id: row.id, email: row.email }, c.env.JWT_SECRET)
  setCookie(c, COOKIE, token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: COOKIE_MAX_AGE })
  return c.json(row)
})

// POST /api/auth/login
app.post('/api/auth/login', zValidator('json', credsSchema), async (c) => {
  const { email, password } = await c.req.json()
  const row = await one<{ id: number; email: string; password_hash: string }>(
    q(c.env.DB, 'SELECT id, email, password_hash FROM users WHERE email = ?1', [email])
  )
  if (!row) return jsonError(c, 401, 'invalid-credentials', 'Invalid email or password.')
  const ok = await bcrypt.compare(password, row.password_hash)
  if (!ok) return jsonError(c, 401, 'invalid-credentials', 'Invalid email or password.')

  const token = await signJwt({ id: row.id, email: row.email }, c.env.JWT_SECRET)
  setCookie(c, COOKIE, token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: COOKIE_MAX_AGE })
  return c.json({ id: row.id, email: row.email })
})

// POST /api/auth/logout
app.post('/api/auth/logout', (c) => {
  deleteCookie(c, COOKIE, { path: '/' })
  return c.json({ ok: true })
})

// GET /api/auth/me
app.get('/api/auth/me', async (c) => {
  const tok = getCookie(c, COOKIE)
  if (!tok) return jsonError(c, 401, 'unauthorized', 'No session.')
  try {
    const p: any = await verifyJwt(tok, c.env.JWT_SECRET)
    return c.json({ id: Number(p.id), email: String(p.email) })
  } catch {
    return jsonError(c, 401, 'unauthorized', 'Invalid session.')
  }
})

/* -------------------------- API auth guard ----------------------------- */
// Protect everything under /api/* except /api/auth/* and /api/health
app.use('/api/*', async (c, next) => {
  const p = c.req.path
  if (p === '/api/health' || p.startsWith('/api/auth/')) return next()

  const tok = getCookie(c, COOKIE)
  if (!tok) return jsonError(c, 401, 'unauthorized', 'No session.')
  try {
    await verifyJwt(tok, c.env.JWT_SECRET)
    return next()
  } catch {
    return jsonError(c, 401, 'unauthorized', 'Invalid session.')
  }
})

/* =============================== FOLDERS =============================== */
/** GET /api/folders
 *  GET /api/folders?tree=1
 *  - Without ?tree: flat list
 *  - With   ?tree=1: hierarchical tree built in memory
 */
app.get('/api/folders', async c => {
  const asTree = c.req.query('tree') === '1'
  const rows = await c.env.DB
    .prepare('SELECT id, name, parentId, createdAt, updatedAt FROM folders ORDER BY name')
    .all<Folder>()
  const folders: Folder[] = rows.results ?? []

  if (!asTree) return c.json(folders)

  type Node = Folder & { children?: Node[] }
  const byParent = new Map<number | null, Node[]>()
  for (const f of folders) {
    const k = (f.parentId ?? null) as number | null
    if (!byParent.has(k)) byParent.set(k, [])
    byParent.get(k)!.push({ ...f })
  }
  const build = (parentId: number | null): Node[] =>
    (byParent.get(parentId) ?? []).map(f => ({ ...f, children: build(f.id) }))

  return c.json(build(null))
})

/** POST /api/folders
 *  Body: { name: string, parentId?: number|null }
 */
app.post('/api/folders', async c => {
  const { name, parentId = null } = await c.req.json().catch(() => ({}))
  if (!name || typeof name !== 'string' || !name.trim()) {
    return jsonError(c, 400, 'invalid-name', 'Field "name" is required and must be a non-empty string.')
  }
  if (parentId !== null) {
    const parent = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM folders WHERE id = ?1', [parentId]))
    if (!parent) return jsonError(c, 404, 'parent-not-found', 'Parent folder does not exist.')
  }

  await q(
    c.env.DB,
    `INSERT INTO folders (name, parentId, createdAt, updatedAt)
     VALUES (?1, ?2, ${nowUtc}, ${nowUtc})`,
    [name.trim(), parentId]
  ).run()

  const row = await one<Folder>(q(c.env.DB, 'SELECT * FROM folders WHERE id = last_insert_rowid()'))
  return c.json(row, 201)
})

/** PATCH /api/folders/:id
 *  Body: { name?: string, parentId?: number|null }
 */
app.patch('/api/folders/:id', async c => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return jsonError(c, 400, 'invalid-id', 'Invalid folder id.')
  const exists = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM folders WHERE id = ?1', [id]))
  if (!exists) return jsonError(c, 404, 'not-found', 'Folder not found.')

  const body = await c.req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : undefined
  const parentId = body.hasOwnProperty('parentId') ? (body.parentId ?? null) : undefined

  // Validate parent existence and cycle
  if (parentId !== undefined) {
    if (parentId !== null) {
      const parent = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM folders WHERE id = ?1', [parentId]))
      if (!parent) return jsonError(c, 404, 'parent-not-found', 'Parent folder does not exist.')
    }
    if (parentId !== null) {
      // Cycle check: new parent cannot be inside the subtree of the current folder
      const cycle = await one<{ hit: number }>(
        q(
          c.env.DB,
          `
          WITH RECURSIVE anc(id) AS (
            SELECT ?1
            UNION ALL
            SELECT f.parentId FROM folders f JOIN anc a ON f.id = a.id
          )
          SELECT 1 AS hit FROM anc WHERE id = ?2 LIMIT 1;
          `,
          [parentId, id]
        )
      )
      if (cycle) return jsonError(c, 409, 'cycle-detected', 'Cannot move a folder into its own descendant.')
    }
  }

  const sets: string[] = []
  const params: any[] = []
  if (name !== undefined) sets.push('name = ?' + (params.push(name)))
  if (parentId !== undefined) sets.push('parentId = ?' + (params.push(parentId)))
  if (sets.length === 0) {
    const row = await one<Folder>(q(c.env.DB, 'SELECT * FROM folders WHERE id = ?1', [id]))
    return c.json(row)
  }
  sets.push(`updatedAt = ${nowUtc}`)
  params.push(id)

  await q(c.env.DB, `UPDATE folders SET ${sets.join(', ')} WHERE id = ?${params.length}`, params).run()
  const row = await one<Folder>(q(c.env.DB, 'SELECT * FROM folders WHERE id = ?1', [id]))
  return c.json(row)
})

/** DELETE /api/folders/:id[?cascade=1] */
app.delete('/api/folders/:id', async c => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return jsonError(c, 400, 'invalid-id', 'Invalid folder id.')
  const cascade = c.req.query('cascade') === '1'

  const exists = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM folders WHERE id = ?1', [id]))
  if (!exists) return jsonError(c, 404, 'not-found', 'Folder not found.')

  const stats = await one<{ nestedFolders: number; nestedNotes: number }>(
    q(
      c.env.DB,
      `
      WITH RECURSIVE sub(id) AS (
        SELECT ?1
        UNION ALL
        SELECT f.id FROM folders f JOIN sub s ON f.parentId = s.id
      )
      SELECT
        (SELECT COUNT(*) FROM folders WHERE parentId IN (SELECT id FROM sub)) AS nestedFolders,
        (SELECT COUNT(*) FROM notes   WHERE folderId IN (SELECT id FROM sub)) AS nestedNotes;
      `,
      [id]
    )
  )

  if (!cascade && stats && (stats.nestedFolders > 0 || stats.nestedNotes > 0)) {
    return jsonError(c, 409, 'folder-not-empty', 'Folder is not empty; use ?cascade=1 to delete with contents.', stats)
  }

  if (cascade) {
    const delNotes = q(
      c.env.DB,
      `
      WITH RECURSIVE sub(id) AS (
        SELECT ?1
        UNION ALL
        SELECT f.id FROM folders f JOIN sub s ON f.parentId = s.id
      )
      DELETE FROM notes WHERE folderId IN (SELECT id FROM sub);
      `,
      [id]
    )
    const delFolders = q(
      c.env.DB,
      `
      WITH RECURSIVE sub(id) AS (
        SELECT ?1
        UNION ALL
        SELECT f.id FROM folders f JOIN sub s ON f.parentId = s.id
      )
      DELETE FROM folders WHERE id IN (SELECT id FROM sub);
      `,
      [id]
    )
    await c.env.DB.batch([delNotes, delFolders])
    return c.json({ deleted: true, cascade: true })
  } else {
    await q(c.env.DB, 'DELETE FROM folders WHERE id = ?1', [id]).run()
    return c.body(null, 204)
  }
})

/* ================================ NOTES ================================ */
/** GET /api/notes
 *  GET /api/notes?folderId=3
 *  GET /api/notes?folderId=3&deep=1  — include descendants via CTE
 */
app.get('/api/notes', async c => {
  const folderIdStr = c.req.query('folderId')
  const deep = c.req.query('deep') === '1'

  if (!folderIdStr) {
    const allNotes = await c.env.DB
      .prepare('SELECT id, folderId, title, body, flag, createdAt, updatedAt FROM notes ORDER BY id DESC')
      .all<Note>()
    return c.json(allNotes.results ?? [])
  }

  const folderId = Number(folderIdStr)
  if (!Number.isFinite(folderId)) return jsonError(c, 400, 'invalid-folderId', 'Bad folderId.')

  if (!deep) {
    const res = await c.env.DB
      .prepare('SELECT id, folderId, title, body, flag, createdAt, updatedAt FROM notes WHERE folderId = ?1 ORDER BY id DESC')
      .bind(folderId)
      .all<Note>()
    return c.json(res.results ?? [])
  }

  const sql = `
    WITH RECURSIVE subtree(id) AS (
      SELECT ?1
      UNION ALL
      SELECT f.id
      FROM folders f
      JOIN subtree s ON f.parentId = s.id
    )
    SELECT n.id, n.folderId, n.title, n.body, n.flag, n.createdAt, n.updatedAt
    FROM notes n
    WHERE n.folderId IN (SELECT id FROM subtree)
    ORDER BY n.id DESC;
  `
  const res = await c.env.DB.prepare(sql).bind(folderId).all<Note>()
  return c.json(res.results ?? [])
})

/** POST /api/notes
 *  Body: { folderId: number, title: string, body?: string }
 */
app.post('/api/notes', async c => {
  const { folderId, title, body = '' } = await c.req.json().catch(() => ({}))
  if (!Number.isFinite(folderId)) return jsonError(c, 400, 'invalid-folderId', 'folderId is required and must be a number.')
  if (!title || typeof title !== 'string' || !title.trim()) {
    return jsonError(c, 400, 'invalid-title', 'Field "title" is required and must be a non-empty string.')
  }
  const folder = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM folders WHERE id = ?1', [folderId]))
  if (!folder) return jsonError(c, 404, 'folder-not-found', 'Folder does not exist.')

  await q(
    c.env.DB,
    `INSERT INTO notes (folderId, title, body, createdAt, updatedAt)
     VALUES (?1, ?2, ?3, ${nowUtc}, ${nowUtc})`,
    [folderId, title.trim(), typeof body === 'string' ? body : String(body ?? '')]
  ).run()

  const row = await one<Note>(q(c.env.DB, 'SELECT * FROM notes WHERE id = last_insert_rowid()'))
  return c.json(row, 201)
})

/** PATCH /api/notes/:id
 *  Body: { title?: string, body?: string, folderId?: number, flag?: 0|1 }
 */
app.patch('/api/notes/:id', async c => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return jsonError(c, 400, 'invalid-id', 'Invalid note id.')

  const exists = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM notes WHERE id = ?1', [id]))
  if (!exists) return jsonError(c, 404, 'not-found', 'Note not found.')

  const payload = await c.req.json().catch(() => ({}))
  const title = typeof payload.title === 'string' ? payload.title.trim() : undefined
  const content = payload.hasOwnProperty('body') ? (typeof payload.body === 'string' ? payload.body : String(payload.body ?? '')) : undefined
  const folderId = payload.hasOwnProperty('folderId') ? payload.folderId : undefined

  if (folderId !== undefined) {
    if (!Number.isFinite(folderId)) return jsonError(c, 400, 'invalid-folderId', 'folderId must be a number.')
    const folder = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM folders WHERE id = ?1', [folderId]))
    if (!folder) return jsonError(c, 404, 'folder-not-found', 'Target folder does not exist.')
  }

  const flag = payload.hasOwnProperty('flag') ? payload.flag : undefined
  if (flag !== undefined) {
    const fnum = Number(flag)
    if (!(fnum === 0 || fnum === 1)) {
      return jsonError(c, 400, 'invalid-flag', 'flag must be 0 or 1.')
    }
  }

  const sets: string[] = []
  const params: any[] = []
  if (title !== undefined) sets.push('title = ?' + (params.push(title)))
  if (content !== undefined) sets.push('body = ?' + (params.push(content)))
  if (folderId !== undefined) sets.push('folderId = ?' + (params.push(folderId)))
  if (flag !== undefined) sets.push('flag = ?' + (params.push(Number(flag))))
  if (sets.length === 0) {
    const row = await one<Note>(q(c.env.DB, 'SELECT * FROM notes WHERE id = ?1', [id]))
    return c.json(row)
  }
  sets.push(`updatedAt = ${nowUtc}`)
  params.push(id)

  await q(c.env.DB, `UPDATE notes SET ${sets.join(', ')} WHERE id = ?${params.length}`, params).run()
  const row = await one<Note>(q(c.env.DB, 'SELECT * FROM notes WHERE id = ?1', [id]))
  return c.json(row)
})

/** DELETE /api/notes/:id */
app.delete('/api/notes/:id', async c => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return jsonError(c, 400, 'invalid-id', 'Invalid note id.')
  const exists = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM notes WHERE id = ?1', [id]))
  if (!exists) return jsonError(c, 404, 'not-found', 'Note not found.')
  await q(c.env.DB, 'DELETE FROM notes WHERE id = ?1', [id]).run()
  return c.body(null, 204)
})

/* ------------------------------ export app ----------------------------- */
export default app
