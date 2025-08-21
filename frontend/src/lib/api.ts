// Single place to configure API base and request behavior
const API_BASE = (import.meta.env.VITE_API_BASE || '/').replace(/\/+$/, '');

function joinUrl(base: string, path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

function withQuery(url: string, query?: Record<string, unknown>) {
  if (!query) return url;
  const u = new URL(url, window.location.origin);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach(x => u.searchParams.append(k, String(x)));
    else u.searchParams.set(k, String(v));
  }
  return u.toString();
}

type HttpOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: any;                 // auto-JSON if object and no explicit Content-Type
  signal?: AbortSignal;
  credentials?: RequestCredentials; // defaults to 'include'
  cache?: RequestCache;       // defaults to 'no-store'
};

async function http<T = unknown>(path: string, opts: HttpOptions = {}): Promise<T> {
  const url = withQuery(joinUrl(API_BASE, path), opts.query);
  const headers = new Headers({ Accept: 'application/json', ...(opts.headers || {}) });

  let body: BodyInit | undefined = opts.body;
  if (body !== undefined && !headers.has('Content-Type')) {
    // Default to JSON only if plain object or array
    const isPlainObject = Object.prototype.toString.call(body) === '[object Object]';
    if (isPlainObject || Array.isArray(body)) {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(body);
    }
  }

  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body,
    credentials: opts.credentials ?? 'include',
    signal: opts.signal,
    cache: opts.cache ?? 'no-store',
  });

  if (res.status === 204) return undefined as T;

  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const err: any = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, query?: Record<string, unknown>, opts?: Omit<HttpOptions, 'method' | 'query'>) =>
    http<T>(path, { ...opts, method: 'GET', query }),
  post: <T = unknown>(path: string, body?: any, opts?: Omit<HttpOptions, 'method' | 'body'>) =>
    http<T>(path, { ...opts, method: 'POST', body }),
  patch: <T = unknown>(path: string, body?: any, opts?: Omit<HttpOptions, 'method' | 'body'>) =>
    http<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T = unknown>(path: string, body?: any, opts?: Omit<HttpOptions, 'method' | 'body'>) =>
    http<T>(path, { ...opts, method: 'PUT', body }),
  del: <T = unknown>(path: string, query?: Record<string, unknown>, opts?: Omit<HttpOptions, 'method' | 'query'>) =>
    http<T>(path, { ...opts, method: 'DELETE', query }),
};
