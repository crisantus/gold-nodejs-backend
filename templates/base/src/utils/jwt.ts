import jwt from 'jsonwebtoken';
import { env, tokenAudience, tokenIssuer } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

/** Access credentials identify a persistent session; roles are rechecked in the database. */
export function signAccessToken(userId: string, sessionId: string): string {
  return jwt.sign({ sid: sessionId }, env.JWT_SECRET, { subject: userId, algorithm: 'HS256', issuer: tokenIssuer, audience: tokenAudience, expiresIn: env.ACCESS_TOKEN_SECONDS });
}
/** Enforce token purpose, algorithm, audience, issuer and expiration at every boundary. */
export function verifyAccessToken(token: string): { userId: string; sessionId: string } {
  try {
    const value = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], issuer: tokenIssuer, audience: tokenAudience });
    if (typeof value === 'string' || typeof value.sub !== 'string' || typeof value.sid !== 'string') throw new Error('Invalid claims');
    return { userId: value.sub, sessionId: value.sid };
  } catch (error) {
    throw new AppError(401, error instanceof jwt.TokenExpiredError ? 'ACCESS_TOKEN_EXPIRED' : 'ACCESS_TOKEN_INVALID', 'Authentication token is invalid or expired');
  }
}
