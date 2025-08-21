import type { Folder } from '../types/folder'

/**
 * For now returns either flat list or tree; ids can be string or number until migration finishes.
 */
export async function fetchFolders(tree = false): Promise<Folder[] | any[]> {
  const url = tree ? '/api/folders?tree=1' : '/api/folders'
  const r = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error(`Failed to load ${url} (${r.status})`)
  return r.json()
}

export async function createFolder(name: string, parentId: string | number | null) {
  const r = await fetch('/api/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentId }),
  })
  if (!r.ok) throw new Error(`Failed to create folder (${r.status})`)
  return r.json() as Promise<Folder>
}

export async function renameFolder(id: string | number, name: string) {
  const r = await fetch(`/api/folders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!r.ok) throw new Error(`Failed to rename folder (${r.status})`)
  return r.json() as Promise<Folder>
}

export async function moveFolder(id: string | number, parentId: string | number | null) {
  const r = await fetch(`/api/folders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentId }),
  })
  if (!r.ok) throw new Error(`Failed to move folder (${r.status})`)
  return r.json() as Promise<Folder>
}

export async function deleteFolder(id: number, cascade: boolean) {
  const res = await fetch(`/api/folders/${id}?cascade=${cascade ? 1 : 0}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE /api/folders/${id} -> ${res.status}`);
  return res.status === 204 ? null : await res.json();
}
