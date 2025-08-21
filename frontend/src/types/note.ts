export type Note = {
  id: number
  folderId: number
  title: string
  body: string
  createdAt?: string
  updatedAt?: string
  flag: 0 | 1
}
