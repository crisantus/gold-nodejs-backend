import type { ErrorRequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { normalizeError } from "../errors/normalize-error.js";
import type { ErrorCode } from "../errors/index.js";

interface ErrorLogMetadata {
  requestId?: string;
  statusCode: number;
  errorCode: ErrorCode;
}
export type ErrorLogSink = (message: string, metadata: ErrorLogMetadata) => void;
const defaultLogger: ErrorLogSink = (message, metadata) => {
  if (process.env.NODE_ENV !== "test") console.error(message, metadata);
};

/** Central error boundary: format safe failures and log only approved metadata. */
export function createErrorHandlerMiddleware(
  logError: ErrorLogSink = defaultLogger,
): ErrorRequestHandler {
  return (error: unknown, _req, res, next) => {
    // Express must finish an already-started response; a second JSON response would fail.
    if (res.headersSent) {
      next(normalizeError(error));
      return;
    }
    const failure = normalizeError(error);
    if (failure.statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
      logError("Request failed", {
        requestId: res.locals.requestId,
        statusCode: failure.statusCode,
        errorCode: failure.code,
      });
    }
    res.status(failure.statusCode).json({
      status: false,
      message: failure.message,
      errorCode: failure.code,
      ...(failure.errors ? { errors: failure.errors } : {}),
    });
  };
}
export const errorHandlerMiddleware = createErrorHandlerMiddleware();
