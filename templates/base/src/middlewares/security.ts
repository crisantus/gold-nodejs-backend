import rateLimit from 'express-rate-limit';

const response = { status: false, message: 'Too many requests. Please try again later', errorCode: 'RATE_LIMITED' };
/** Limit shared API load; multi-instance deployments need a shared rate-limit store. */
export const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, message: response });
/** Credential-sensitive endpoints have a tighter limiter and never log credentials. */
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: response });
