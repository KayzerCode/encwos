// src/services/api.ts
import { api } from '../lib/api';
import type { AuthUser } from '../types/auth';

export async function apiLogin(email: string, password: string) {
  return api.post<AuthUser>('/auth/login', { email, password });
}

export async function apiRegister(email: string, password: string) {
  return api.post<AuthUser>('/auth/register', { email, password });
}

export async function apiLogout() {
  return api.post<void>('/auth/logout');
}

export async function apiMe() {
  return api.get<AuthUser | null>('/auth/me');
}
