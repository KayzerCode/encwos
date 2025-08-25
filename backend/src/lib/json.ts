// comments in English only
export const jsonError = (c: any, status: number, error: string, message: string, details?: any) =>
  c.json({ error, message, ...(details ? { details } : {}) }, status);

export const jsonOk = (c: any, data: unknown, status = 200) =>
  c.json(data, status);
