import type { Response } from 'express';

/** Keep every successful HTTP response compatible with Gold clients. */
export function sendResponse<T>(res: Response, { statusCode = 200, message, data, meta }: { statusCode?: number; message: string; data?: T; meta?: unknown }): void {
  res.status(statusCode).json({ status: true, message, ...(data === undefined ? {} : { data }), ...(meta === undefined ? {} : { meta }) });
}
