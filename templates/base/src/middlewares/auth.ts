import { createHmac } from 'node:crypto';
import type { Request, RequestHandler, Response } from 'express';
import { parse } from 'cookie';
import { env, allowedOrigins, features } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { equalSecret } from '../utils/crypto.js';
import { authenticateAccess } from '../services/auth/session.service.js';

/** Tie CSRF credentials to an authenticated session rather than trusting a client-selected cookie. */
export function csrfForSession(sessionId: string): string { return createHmac('sha256', env.CSRF_SECRET).update(sessionId).digest('base64url'); }
/** Keep cookie parsing consistent across access and refresh boundaries. */
export function readCookies(req: Request): Record<string, string | undefined> { return parse(req.headers.cookie ?? ''); }

/** Protected HTTP groups always recheck session activity and the current account. */
export const authenticateUser: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const cookie = features.clients !== 'mobile' ? readCookies(req).accessToken : undefined;
  const token = bearer ?? cookie;
  if (!token) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Please sign in to continue');
  req.actor = await authenticateAccess(token);
  req.authTransport = bearer ? 'bearer' : 'cookie';
  if (req.authTransport === 'cookie' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) verifyCsrf(req, req.actor.sessionId);
  next();
};

/** Role checks supplement service-level ownership checks. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.actor?.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'This action requires an administrator');
  next();
};

/** Browser mutations require an explicit allowed Origin, even before login. */
export const checkOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) throw new AppError(403, 'ORIGIN_NOT_ALLOWED', 'This request origin is not allowed');
  next();
};

/** Cookie mutations require both a permitted Origin and the session-bound token. */
export function verifyCsrf(req: Request, sessionId: string): void {
  if (!req.headers.origin || !allowedOrigins.includes(req.headers.origin) || !equalSecret(req.get('X-CSRF-Token') ?? '', csrfForSession(sessionId))) throw new AppError(403, 'CSRF_INVALID', 'The request could not be verified');
}

/** Cookies are issued only for an explicitly requested browser session from an allowed Origin. */
export function wantsCookieSession(req: Request): boolean {
  if (features.clients === 'mobile' || req.get('X-Auth-Transport') !== 'cookie') return false;
  if (!req.headers.origin || !allowedOrigins.includes(req.headers.origin)) throw new AppError(403, 'ORIGIN_NOT_ALLOWED', 'A permitted browser origin is required');
  return true;
}

/** Keep session credentials HTTP-only and expose only the CSRF companion token. */
export function setSessionCookies(res: Response, accessToken: string, refreshToken: string, sessionId: string): void {
  const base = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
  res.cookie('accessToken', accessToken, { ...base, maxAge: env.ACCESS_TOKEN_SECONDS * 1000 });
  res.cookie('refreshToken', refreshToken, { ...base, maxAge: env.REFRESH_IDLE_DAYS * 86400000 });
  res.cookie('csrfToken', csrfForSession(sessionId), { ...base, httpOnly: false, maxAge: env.REFRESH_IDLE_DAYS * 86400000 });
}
/** Match the original cookie scope when clearing browser credentials. */
export function clearSessionCookies(res: Response): void {
  const options = { secure: env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
  for (const name of ['accessToken', 'refreshToken', 'csrfToken']) res.clearCookie(name, options);
}
