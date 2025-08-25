// comments in English only
import { SignJWT, jwtVerify } from 'jose';

export const COOKIE = 'session';
export const COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

export function isHttps(url: string) {
  try { return new URL(url).protocol === 'https:' } catch { return false }
}

export function isSameSite(reqUrl: string, origin?: string | null) {
  if (!origin) return true;
  try {
    const u = new URL(reqUrl);
    const o = new URL(origin);
    return u.hostname === o.hostname;
  } catch { return true; }
}

export function cookieOptsFor(reqUrl: string, origin?: string | null) {
  const sameSite = isSameSite(reqUrl, origin) ? 'Lax' : 'None';
  const mustSecure = sameSite === 'None';
  const secure = mustSecure ? true : isHttps(reqUrl);
  return { sameSite: sameSite as 'Lax' | 'None', secure };
}

export async function signJwt(payload: any, secret: string) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(new TextEncoder().encode(secret));
}

export async function verifyJwt(token: string, secret: string) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  return payload;
}
