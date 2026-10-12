import type { Response } from 'express';

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Both tokens are HttpOnly, so page scripts cannot read them.
 * The refresh cookie is scoped to the auth path to limit where it is sent.
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const secure = process.env.COOKIE_SECURE === 'true';
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: ACCESS_MAX_AGE_MS,
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: '/api/v1/auth',
    maxAge: REFRESH_MAX_AGE_MS,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/v1/auth' });
}
