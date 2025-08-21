// services/notes.ts
import type { Note } from '../types/note'

/**
 * Accepts string or number ids to ease migration to numeric PKs.
 * Coerces to string for the current querystring usage.
 */
export async function fetchNotes(folderId?: string | number | null, deep = false): Promise<Note[]> {
  const qs = new URLSearchParams()
  if (folderId !== null && folderId !== undefined) qs.set('folderId', String(folderId))
  if (deep) qs.set('deep', '1')
  const url = `/api/notes${qs.toString() ? `?${qs}` : ''}`

  const r = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error(`Failed to load ${url} (${r.status})`)

  const data = await r.json()
  if (!Array.isArray(data)) throw new Error('Invalid /api/notes format: expected an array')
  return data as Note[]
}

export async function createNote(folderId: string | number, title: string, body = '') {
  const r = await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderId, title, body }),
  })
  if (!r.ok) throw new Error(`Failed to create note (${r.status})`)
  return r.json() as Promise<Note>
}

export async function updateNote(
  id: number,
  patch: Partial<{ title: string; body: string; folderId: number; flag: number }>
): Promise<Note> { // ← Добавить возвращаемый тип
  const response = await fetch(`/api/notes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })

  if (!response.ok) {
    throw new Error(`Failed to update note (${response.status})`)
  }

  return response.json() as Promise<Note> // ← Вернуть JSON, а не Response
}

export async function deleteNote(id: number) {
  const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE /api/notes/${id} -> ${res.status}`);
  return res.status === 204 ? null : await res.json();
}
