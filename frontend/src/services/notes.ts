import { api } from '../lib/api';
import type { Note } from '../types/note';

export async function fetchNotes(folderId?: string | number | null, deep = false): Promise<Note[]> {
  const query: Record<string, unknown> = {};
  if (folderId !== null && folderId !== undefined) query.folderId = String(folderId);
  if (deep) query.deep = 1;
  const data = await api.get<unknown>('/notes', query);
  if (!Array.isArray(data)) throw new Error('Invalid /notes format: expected an array');
  return data as Note[];
}

export async function createNote(folderId: string | number, title: string, body = '') {
  return api.post<Note>('/notes', { folderId, title, body });
}

export async function updateNote(
  id: number,
  patch: Partial<{ title: string; body: string; folderId: number; flag: number }>
): Promise<Note> {
  return api.patch<Note>(`/notes/${id}`, patch);
}

export async function deleteNote(id: number) {
  return api.del<null | unknown>(`/notes/${id}`);
}
