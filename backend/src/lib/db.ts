// comments in English only
// src/lib/db.ts
export const q = (db: D1Database, sql: string, params: unknown[] = []) =>
  db.prepare(sql).bind(...params);

export const one = async <T>(stmt: D1PreparedStatement): Promise<T | null> =>
  (await stmt.first<T>()) ?? null;

export const all = async <T>(stmt: D1PreparedStatement): Promise<T[]> => {
  const r = await stmt.all<T>();
  // @ts-ignore D1 typing
  return (r.results as T[]) ?? [];
};

export const nowUtc = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
