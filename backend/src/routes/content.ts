// backend/src/routes/content.ts
import { Hono } from 'hono';
import type { Env } from '../lib/types';

const contentRoutes = new Hono<Env>();

// Proxy to api-server for content-seeds
contentRoutes.all('/content-seeds/*', async (c) => {
  const url = new URL(c.req.url);

  // Extract path after /content-seeds
  const apiPath = url.pathname.replace('/content-seeds', '');

  // URL of your api-server - replace with actual address
  // Example: 'https://your-api-server.com' or 'http://localhost:3000'
  const API_SERVER_BASE = 'http://91.99.201.12:5000'; // Change this to your api-server URL
  const apiServerUrl = `${API_SERVER_BASE}/api/content-seeds${apiPath}${url.search}`;

  try {
    const requestHeaders: Record<string, string> = {};

    // Copy relevant headers from original request
    const headerEntries = Object.entries(c.req.header());
    for (const [key, value] of headerEntries) {
      // Skip host and other headers that shouldn't be proxied
      if (!['host', 'origin', 'referer'].includes(key.toLowerCase())) {
        requestHeaders[key] = value;
      }
    }

    const response = await fetch(apiServerUrl, {
      method: c.req.method,
      headers: requestHeaders,
      body: c.req.method !== 'GET' && c.req.method !== 'HEAD'
        ? await c.req.arrayBuffer()
        : undefined,
    });

    // Get response data
    const responseData = await response.arrayBuffer();

    // Copy response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Ensure CORS headers are set
    responseHeaders['Access-Control-Allow-Origin'] = '*';
    responseHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    responseHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';

    return new Response(responseData, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return c.json({
      error: 'API Server unavailable',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 503);
  }
});

// Handle OPTIONS requests for CORS preflight
contentRoutes.options('/content-seeds/*', (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
});

export { contentRoutes };