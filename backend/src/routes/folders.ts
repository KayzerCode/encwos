// comments in English only
import { Hono } from 'hono';
import { q, one, nowUtc } from '../lib/db';
import { jsonError } from '../lib/json';
import type { Env, Folder } from '../lib/types';

export const foldersRoutes = new Hono<Env>();

foldersRoutes.get('/', async c => {
  const asTree = c.req.query('tree') === '1';
  const rows = await c.env.DB
    .prepare('SELECT id, name, parentId, createdAt, updatedAt FROM folders ORDER BY name')
    .all<Folder>();
  const folders: Folder[] = rows.results ?? [];
  if (!asTree) return c.json(folders);

  type Node = Folder & { children?: Node[] }
  const byParent = new Map<number | null, Node[]>();
  for (const f of folders) {
    const k = (f.parentId ?? null) as number | null;
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k)!.push({ ...f });
  }
  const build = (parentId: number | null): Node[] =>
    (byParent.get(parentId) ?? []).map(f => ({ ...f, children: build(f.id) }));
  return c.json(build(null));
});

foldersRoutes.post('/', async c => {
  const { name, parentId = null } = await c.req.json().catch(() => ({}));
  if (!name || typeof name !== 'string' || !name.trim()) {
    return jsonError(c, 400, 'invalid-name', 'Field "name" is required and must be a non-empty string.');
  }
  if (parentId !== null) {
    const parent = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM folders WHERE id = ?1', [parentId]));
    if (!parent) return jsonError(c, 404, 'parent-not-found', 'Parent folder does not exist.');
  }

  await q(
    c.env.DB,
    `INSERT INTO folders (name, parentId, createdAt, updatedAt)
     VALUES (?1, ?2, ${nowUtc}, ${nowUtc})`,
    [name.trim(), parentId]
  ).run();

  const row = await one<Folder>(q(c.env.DB, 'SELECT * FROM folders WHERE id = last_insert_rowid()'));
  return c.json(row, 201);
});

foldersRoutes.patch('/:id', async c => {
  const id = Number(c.req.param('id'));
  if (!Number.isFinite(id)) return jsonError(c, 400, 'invalid-id', 'Invalid folder id.');
  const exists = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM folders WHERE id = ?1', [id]));
  if (!exists) return jsonError(c, 404, 'not-found', 'Folder not found.');

  const body = await c.req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : undefined;
  const parentId = body.hasOwnProperty('parentId') ? (body.parentId ?? null) : undefined;

  if (parentId !== undefined) {
    if (parentId !== null) {
      const parent = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM folders WHERE id = ?1', [parentId]));
      if (!parent) return jsonError(c, 404, 'parent-not-found', 'Parent folder does not exist.');
    }
    if (parentId !== null) {
      const cycle = await one<{ hit: number }>(q(
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
      ));
      if (cycle) return jsonError(c, 409, 'cycle-detected', 'Cannot move a folder into its own descendant.');
    }
  }

  const sets: string[] = [];
  const params: any[] = [];
  if (name !== undefined)     sets.push('name = ?'     + (params.push(name)));
  if (parentId !== undefined) sets.push('parentId = ?' + (params.push(parentId)));
  if (sets.length === 0) {
    const row = await one<Folder>(q(c.env.DB, 'SELECT * FROM folders WHERE id = ?1', [id]));
    return c.json(row);
  }
  sets.push(`updatedAt = ${nowUtc}`);
  params.push(id);

  await q(c.env.DB, `UPDATE folders SET ${sets.join(', ')} WHERE id = ?${params.length}`, params).run();
  const row = await one<Folder>(q(c.env.DB, 'SELECT * FROM folders WHERE id = ?1', [id]));
  return c.json(row);
});

foldersRoutes.delete('/:id', async c => {
  const id = Number(c.req.param('id'));
  if (!Number.isFinite(id)) return jsonError(c, 400, 'invalid-id', 'Invalid folder id.');
  const cascade = c.req.query('cascade') === '1';

  const exists = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM folders WHERE id = ?1', [id]));
  if (!exists) return jsonError(c, 404, 'not-found', 'Folder not found.');

  const stats = await one<{ nestedFolders: number; nestedNotes: number }>(q(
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
  ));

  if (!cascade && stats && (stats.nestedFolders > 0 || stats.nestedNotes > 0)) {
    return jsonError(c, 409, 'folder-not-empty', 'Folder is not empty; use ?cascade=1 to delete with contents.', stats);
  }

  if (cascade) {
    const delNotes = q(c.env.DB, `
      WITH RECURSIVE sub(id) AS (
        SELECT ?1
        UNION ALL
        SELECT f.id FROM folders f JOIN sub s ON f.parentId = s.id
      )
      DELETE FROM notes WHERE folderId IN (SELECT id FROM sub);
    `, [id]);

    const delFolders = q(c.env.DB, `
      WITH RECURSIVE sub(id) AS (
        SELECT ?1
        UNION ALL
        SELECT f.id FROM folders f JOIN sub s ON f.parentId = s.id
      )
      DELETE FROM folders WHERE id IN (SELECT id FROM sub);
    `, [id]);

    await c.env.DB.batch([delNotes, delFolders]);
    return c.json({ deleted: true, cascade: true });
  } else {
    await q(c.env.DB, 'DELETE FROM folders WHERE id = ?1', [id]).run();
    return c.body(null, 204);
  }
});
