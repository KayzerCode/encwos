// comments in English only
import { getCookie } from 'hono/cookie';
import { jsonError } from './json';
import { verifyJwt } from './cookies';
import { COOKIE } from './cookies';

export function authGuard() {
  return async (c: any, next: any) => {
    const tok = getCookie(c, COOKIE);
    if (!tok) return jsonError(c, 401, 'unauthorized', 'No session.');
    try {
      await verifyJwt(tok, c.env.JWT_SECRET);
      return next();
    } catch {
      return jsonError(c, 401, 'unauthorized', 'Invalid session.');
    }
  };
}
