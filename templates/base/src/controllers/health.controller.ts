import type { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { sendResponse } from '../utils/send-response.js';
import { AppError } from '../errors/app-error.js';

/** Liveness is independent of providers and the database. */
export function health(_req: Request, res: Response): void { sendResponse(res, { message: 'API is healthy', data: { service: __DISPLAY_NAME_JSON__ } }); }
/** Readiness checks the required database without exposing its connection settings. */
export async function ready(_req: Request, res: Response): Promise<void> {
  try { await prisma.$queryRaw`SELECT 1`; } catch { throw new AppError(503, 'NOT_READY', 'The service is not ready'); }
  sendResponse(res, { message: 'API is ready' });
}
