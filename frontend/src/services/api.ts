// src/services/api.ts
async function request(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    credentials: 'include',              // <- send cookies
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  })
  if (res.status === 401) throw new Error('Unauthorized')
  return res
}

export async function apiLogin(email: string, password: string) {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return res.json()
}

export async function apiRegister(email: string, password: string) {
  const res = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return res.json()
}

export async function apiLogout() {
  await request('/api/auth/logout', { method: 'POST' })
}

export async function apiMe() {
  const res = await request('/api/auth/me')
  return res.json()
}
