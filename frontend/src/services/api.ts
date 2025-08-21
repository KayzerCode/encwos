import { api } from '../lib/api';

export async function apiLogin(email: string, password: string) {
  return api.post('/auth/login', { email, password });
}

export async function apiRegister(email: string, password: string) {
  return api.post('/auth/register', { email, password });
}

export async function apiLogout() {
  await api.post('/auth/logout');
}

export async function apiMe() {
  return api.get('/auth/me');
}
