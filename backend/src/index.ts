// comments in English only
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth';
import { foldersRoutes } from './routes/folders';
import { notesRoutes } from './routes/notes';
import { authGuard } from './lib/authGuard';
import type { Env } from './lib/types';

const app = new Hono<Env>();

app.use('*', cors({
  origin: (origin) => origin ?? '',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/health', (c) => c.json({ ok: true, service: 'encwos-backend' }));

// public /auth/*
app.route('/auth', authRoutes);

// protected routes
app.use('/*', authGuard());
app.route('/folders', foldersRoutes);
app.route('/notes', notesRoutes);

export default app;
