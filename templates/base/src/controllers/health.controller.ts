import { ServiceUnavailableError, ERROR_CODES } from "../errors/index.js";
import type { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";
import { sendResponse } from "../utils/send-response.js";

/** Liveness is independent of providers and the database. */
export function health(_req: Request, res: Response): void {
  sendResponse(res, { message: "API is healthy", data: { service: __DISPLAY_NAME_JSON__ } });
}
/** Readiness checks the required database without exposing its connection settings. */
export async function ready(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new ServiceUnavailableError("The service is not ready", ERROR_CODES.NOT_READY);
  }
  sendResponse(res, { message: "API is ready" });
}
