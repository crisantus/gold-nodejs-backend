import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { AppError } from '../errors/app-error.js';

/** Preserve parsed values separately because Express 5 query parameters are read-only. */
export function validateRequest(schemas: { body?: z.ZodType; query?: z.ZodType; params?: z.ZodType }): RequestHandler {
  return (req, _res, next) => {
    req.validated = {};
    for (const location of ['body', 'query', 'params'] as const) {
      const schema = schemas[location]; if (!schema) continue;
      const result = schema.safeParse(req[location]);
      if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Please check the submitted information', result.error.issues.map((issue) => ({ path: `${location}.${issue.path.join('.')}`, message: issue.message })));
      req.validated[location] = result.data;
    }
    next();
  };
}
