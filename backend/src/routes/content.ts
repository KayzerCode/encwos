// backend/src/routes/content.ts
import { Hono } from 'hono';
import type { Env } from '../lib/types';

const contentRoutes = new Hono<Env>();

// Preflight first
contentRoutes.options('/content-seeds/*', (c) => c.body(null, 204));

contentRoutes.all('/content-seeds/*', async (c) => {
  // This router is mounted under /content
  const reqUrl = new URL(c.req.url);
  const mountPrefix = '/content/content-seeds';
  if (!reqUrl.pathname.startsWith(mountPrefix)) {
    return c.json({ error: 'Bad route' }, 400);
  }

  const tailPath = reqUrl.pathname.slice(mountPrefix.length) || '/';

  // Env binding (now properly typed)
  const base = c.env.CONTENT_API_BASE; // e.g. "http://91.99.201.12:5000"
  const upstreamUrl = `${base}/api/content-seeds${tailPath}${reqUrl.search}`;

  try {
    // Build safe request headers
    const fwdHeaders = new Headers();
    const inHeaders = c.req.header(); // Record<string, string>
    for (const [k, v] of Object.entries(inHeaders)) {
      const key = k.toLowerCase();
      if (key === 'host' || key === 'origin' || key === 'referer' || key === 'connection' || key === 'content-length') continue;
      fwdHeaders.set(k, v);
    }

    const init: RequestInit = {
      method: c.req.method,
      headers: fwdHeaders,
    };

    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      init.body = c.req.raw.body ?? (await c.req.arrayBuffer());
    }

    const upstream = await fetch(upstreamUrl, init);

    // Copy safe response headers
    const outHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      const lkey = key.toLowerCase();
      if (lkey === 'connection' || lkey === 'transfer-encoding' || lkey === 'content-encoding') return;
      outHeaders.set(key, value);
    });

    // Do NOT set CORS here; global cors() handles it
    return new Response(upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch (err) {
    console.error('Content proxy error:', err);
    return c.json(
      {
        error: 'API Server unavailable',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      503
    );
  }
});

export { contentRoutes };
