import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';

/** Unknown routes use the same error envelope without reflecting private URLs. */
export const notFound: RequestHandler = (_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'The requested route was not found'));

/** Normalize parser and expected failures; internal messages never reach clients. */
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) { next(error); return; }
  const typed = error instanceof AppError ? error : undefined;
  const parser = typeof error === 'object' && error !== null && 'type' in error ? error.type : undefined;
  const statusCode = typed?.statusCode ?? (parser === 'entity.too.large' ? 413 : parser === 'entity.parse.failed' ? 400 : 500);
  const errorCode = typed?.errorCode ?? (statusCode === 413 ? 'PAYLOAD_TOO_LARGE' : statusCode === 400 ? 'INVALID_JSON' : 'INTERNAL_ERROR');
  const message = typed?.message ?? (statusCode === 413 ? 'Request body is too large' : statusCode === 400 ? 'Request body must be valid JSON' : 'Something went wrong. Please try again later');
  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') console.error(JSON.stringify({ level: 'error', requestId: res.locals.requestId, errorCode }));
  res.status(statusCode).json({ status: false, message, errorCode, ...(typed?.errors ? { errors: typed.errors } : {}) });
};
