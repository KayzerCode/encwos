// comments in English only
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import * as bcrypt from 'bcryptjs';
import { COOKIE, COOKIE_MAX_AGE, cookieOptsFor, signJwt, verifyJwt } from '../lib/cookies';
import { q, one } from '../lib/db';
import { jsonError } from '../lib/json';
import type { Env } from '../lib/types';

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export const authRoutes = new Hono<Env>();

authRoutes.post('/register', zValidator('json', credsSchema), async (c) => {
  const { email, password } = await c.req.json();
  const exists = await one<{ id: number }>(q(c.env.DB, 'SELECT id FROM users WHERE email = ?1', [email]));
  if (exists) return jsonError(c, 409, 'email-exists', 'Email already registered.');

  const hash = await bcrypt.hash(password, 10);
  const ins = await q(c.env.DB, 'INSERT INTO users (email, password_hash) VALUES (?1, ?2)', [email, hash]).run();
  if (!ins.success) return jsonError(c, 500, 'register-failed', 'Failed to register.');

  const row = await one<{ id: number; email: string }>(q(c.env.DB, 'SELECT id, email FROM users WHERE email = ?1', [email]));
  if (!row) return jsonError(c, 500, 'register-failed', 'User not found after insert.');

  const token = await signJwt({ id: row.id, email: row.email }, c.env.JWT_SECRET);
  const { sameSite, secure } = cookieOptsFor(c.req.url, c.req.header('Origin'));
  setCookie(c, COOKIE, token, { httpOnly: true, secure, sameSite, path: '/', maxAge: COOKIE_MAX_AGE });
  return c.json(row);
});

authRoutes.post('/login', zValidator('json', credsSchema), async (c) => {
  const { email, password } = await c.req.json();
  const row = await one<{ id: number; email: string; password_hash: string }>(
    q(c.env.DB, 'SELECT id, email, password_hash FROM users WHERE email = ?1', [email])
  );
  if (!row) return jsonError(c, 401, 'invalid-credentials', 'Invalid email or password.');
  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return jsonError(c, 401, 'invalid-credentials', 'Invalid email or password.');

  const token = await signJwt({ id: row.id, email: row.email }, c.env.JWT_SECRET);
  const { sameSite, secure } = cookieOptsFor(c.req.url, c.req.header('Origin'));
  setCookie(c, COOKIE, token, { httpOnly: true, secure, sameSite, path: '/', maxAge: COOKIE_MAX_AGE });
  return c.json({ id: row.id, email: row.email });
});

authRoutes.post('/logout', async (c) => {
  const { sameSite, secure } = cookieOptsFor(c.req.url, c.req.header('Origin'));
  deleteCookie(c, COOKIE, { path: '/', secure, sameSite });
  return c.json({ ok: true });
});

authRoutes.get('/me', async (c) => {
  const tok = getCookie(c, COOKIE);
  if (!tok) return jsonError(c, 401, 'unauthorized', 'No session.');
  try {
    const p: any = await verifyJwt(tok, c.env.JWT_SECRET);
    return c.json({ id: Number(p.id), email: String(p.email) });
  } catch {
    return jsonError(c, 401, 'unauthorized', 'Invalid session.');
  }
});
