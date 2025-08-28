// src/lib/types.ts
export type Folder = { id: number; name: string; parentId: number | null; createdAt?: string; updatedAt?: string };
export type Note   = { id: number; folderId: number; title: string; body: string; flag?: number; createdAt?: string; updatedAt?: string };

export type Env = {
  Bindings: {
    DB: D1Database
    JWT_SECRET: string
    CONTENT_API_BASE: string
  }
};
