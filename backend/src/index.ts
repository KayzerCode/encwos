// backend/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './routes/auth';
import { foldersRoutes } from './routes/folders';
import { notesRoutes } from './routes/notes';
import { contentRoutes } from './routes/content';
import { authGuard } from './lib/authGuard';
import type { Env } from './lib/types';

const app = new Hono<Env>();

app.use('*', cors({
  // Important: with credentials true, do NOT set '*'
  origin: (origin) => origin || '',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/health', (c) => c.json({ ok: true, service: 'encwos-backend' }));

// Public auth
app.route('/auth', authRoutes);

// Protected routes (Workspace + Content)
app.use('/*', authGuard());
app.route('/folders', foldersRoutes); // Workspace
app.route('/notes', notesRoutes);     // Workspace
app.route('/content', contentRoutes); // Content → VPS proxy

export default app;
