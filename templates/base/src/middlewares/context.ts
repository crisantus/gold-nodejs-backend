import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

/** Generate correlation IDs locally and log selected metadata, never bodies or URLs. */
export const requestContext: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  res.setHeader('X-Request-ID', requestId);
  res.locals.requestId = requestId;
  const started = performance.now();
  res.once('finish', () => {
    if (process.env.NODE_ENV !== 'test') console.log(JSON.stringify({ level: 'info', requestId, method: req.method, statusCode: res.statusCode, durationMs: Math.round(performance.now() - started) }));
  });
  next();
};
