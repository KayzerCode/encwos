// utils/noteHelpers.ts
import type { Folder, FolderRaw } from '../types/folder';
import { fetchFolders } from '../services/folders';

export function isInSubtreeFlat(
  folders: Folder[],
  ancestorId: number,
  targetFolderId: number
): boolean {
  if (ancestorId === targetFolderId) return true;
  const byId = new Map(folders.map(f => [f.id, f]));
  let cur = byId.get(targetFolderId);
  while (cur) {
    if (cur.parentId == null) return false;
    if (cur.parentId === ancestorId) return true;
    cur = byId.get(cur.parentId) || undefined;
  }
  return false;
}

export function normalizeFolders(list: FolderRaw[]): Folder[] {
  return list.map(f => ({
    id: typeof f.id === 'string' ? Number(f.id) : f.id,
    name: f.name,
    parentId:
      f.parentId !== undefined
        ? typeof f.parentId === 'string'
          ? Number(f.parentId)
          : f.parentId ?? null
        : typeof f.parent_id === 'string'
          ? Number(f.parent_id)
          : f.parent_id ?? null,
  }));
}

export async function pickDefaultFolderIdCached(folders: Folder[]): Promise<number> {
  if (folders.length) {
    const inbox =
      folders.find(f => f.name.toLowerCase() === 'inbox') ??
      folders.find(f => f.parentId === 1) ??
      folders[0];
    return inbox?.id ?? 1;
  }
  const list = (await fetchFolders(false)) as FolderRaw[];
  const norm: Folder[] = list.map(f => ({
    id: typeof f.id === 'string' ? Number(f.id) : f.id,
    name: f.name,
    parentId:
      f.parentId !== undefined
        ? typeof f.parentId === 'string'
          ? Number(f.parentId)
          : f.parentId ?? null
        : typeof f.parent_id === 'string'
          ? Number(f.parent_id)
          : f.parent_id ?? null,
  }));
  const inbox =
    norm.find(f => f.name.toLowerCase() === 'inbox') ??
    norm.find(f => f.parentId === 1) ??
    norm[0];
  return inbox?.id ?? 1;
}