// comments in English only
import { Hono } from 'hono';
import { q, one, nowUtc } from '../lib/db';
import { jsonError } from '../lib/json';
import type { Env, Note } from '../lib/types';

export const notesRoutes = new Hono<Env>();

notesRoutes.get('/', async c => {
  const folderIdStr = c.req.query('folderId');
  const deep = c.req.query('deep') === '1';

  if (!folderIdStr) {
    const allNotes = await c.env.DB
      .prepare('SELECT id, folderId, title, body, flag, createdAt, updatedAt FROM notes ORDER BY id DESC')
      .all<Note>();
    return c.json(allNotes.results ?? []);
  }

  const folderId = Number(folderIdStr);
  if (!Number.isFinite(folderId)) return jsonError(c, 400, 'invalid-folderId', 'Bad folderId.');

  if (!deep) {
    const res = await c.env.DB
      .prepare('SELECT id, folderId, title, body, flag, createdAt, updatedAt FROM notes WHERE folderId = ?1 ORDER BY id DESC')
      .bind(folderId)
      .all<Note>();
    return c.json(res.results ?? []);
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
  `;
  const res = await c.env.DB.prepare(sql).bind(folderId).all<Note>();
  return c.json(res.results ?? []);
});

notesRoutes.post('/', async c => {
  const { folderId, title, body = '' } = await c.req.json().catch(() => ({}));
  if (!Number.isFinite(folderId)) return jsonError(c, 400, 'invalid-folderId', 'folderId is required and must be a number.');
  if (!title || typeof title !== 'string' || !title.trim()) {
    return jsonError(c, 400, 'invalid-title', 'Field "title" is required and must be a non-empty string.');
  }

  const folder = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM folders WHERE id = ?1', [folderId]));
  if (!folder) return jsonError(c, 404, 'folder-not-found', 'Folder does not exist.');

  await q(
    c.env.DB,
    `INSERT INTO notes (folderId, title, body, createdAt, updatedAt)
     VALUES (?1, ?2, ?3, ${nowUtc}, ${nowUtc})`,
    [folderId, title.trim(), typeof body === 'string' ? body : String(body ?? '')]
  ).run();

  const row = await one<Note>(q(c.env.DB, 'SELECT * FROM notes WHERE id = last_insert_rowid()'));
  return c.json(row, 201);
});

notesRoutes.patch('/:id', async c => {
  const id = Number(c.req.param('id'));
  if (!Number.isFinite(id)) return jsonError(c, 400, 'invalid-id', 'Invalid note id.');

  const exists = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM notes WHERE id = ?1', [id]));
  if (!exists) return jsonError(c, 404, 'not-found', 'Note not found.');

  const payload = await c.req.json().catch(() => ({}));
  const title = typeof payload.title === 'string' ? payload.title.trim() : undefined;
  const content = payload.hasOwnProperty('body') ? (typeof payload.body === 'string' ? payload.body : String(payload.body ?? '')) : undefined;
  const folderId = payload.hasOwnProperty('folderId') ? payload.folderId : undefined;

  if (folderId !== undefined) {
    if (!Number.isFinite(folderId)) return jsonError(c, 400, 'invalid-folderId', 'folderId must be a number.');
    const folder = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM folders WHERE id = ?1', [folderId]));
    if (!folder) return jsonError(c, 404, 'folder-not-found', 'Target folder does not exist.');
  }

  const flag = payload.hasOwnProperty('flag') ? payload.flag : undefined;
  if (flag !== undefined) {
    const fnum = Number(flag);
    if (!(fnum === 0 || fnum === 1)) {
      return jsonError(c, 400, 'invalid-flag', 'flag must be 0 or 1.');
    }
  }

  const sets: string[] = [];
  const params: any[] = [];
  if (title   !== undefined) sets.push('title = ?'    + (params.push(title)));
  if (content !== undefined) sets.push('body  = ?'    + (params.push(content)));
  if (folderId!== undefined) sets.push('folderId = ?' + (params.push(folderId)));
  if (flag    !== undefined) sets.push('flag = ?'     + (params.push(Number(flag))));
  if (sets.length === 0) {
    const row = await one<Note>(q(c.env.DB, 'SELECT * FROM notes WHERE id = ?1', [id]));
    return c.json(row);
  }
  sets.push(`updatedAt = ${nowUtc}`);
  params.push(id);

  await q(c.env.DB, `UPDATE notes SET ${sets.join(', ')} WHERE id = ?${params.length}`, params).run();
  const row = await one<Note>(q(c.env.DB, 'SELECT * FROM notes WHERE id = ?1', [id]));
  return c.json(row);
});

notesRoutes.delete('/:id', async c => {
  const id = Number(c.req.param('id'));
  if (!Number.isFinite(id)) return jsonError(c, 400, 'invalid-id', 'Invalid note id.');
  const exists = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM notes WHERE id = ?1', [id]));
  if (!exists) return jsonError(c, 404, 'not-found', 'Note not found.');
  await q(c.env.DB, 'DELETE FROM notes WHERE id = ?1', [id]).run();
  return c.body(null, 204);
});
