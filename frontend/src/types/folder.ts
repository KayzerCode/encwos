export type Folder = {
  id: number
  name: string
  parentId: number | null
}

export type FolderRaw = {
  id: number | string;
  name: string;
  parentId?: number | string | null;
  parent_id?: number | string | null;
};
