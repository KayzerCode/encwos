import { api } from '../lib/api';
import type { Folder } from '../types/folder';

export async function fetchFolders(tree = false): Promise<Folder[] | any[]> {
  return api.get('/folders', tree ? { tree: 1 } : undefined);
}

export async function createFolder(name: string, parentId: string | number | null) {
  return api.post<Folder>('/folders', { name, parentId });
}

export async function renameFolder(id: string | number, name: string) {
  return api.patch<Folder>(`/folders/${id}`, { name });
}

export async function moveFolder(id: string | number, parentId: string | number | null) {
  return api.patch<Folder>(`/folders/${id}`, { parentId });
}

export async function deleteFolder(id: number, cascade: boolean) {
  // If backend returns 204 No Content, api.del will resolve to undefined
  return api.del<null | unknown>(`/folders/${id}`, { cascade: cascade ? 1 : 0 });
}
