import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import {
  BadRequestError,
  ConflictError,
  CustomAPIError,
  NotFoundError,
  PayloadTooLargeError,
  ServiceUnavailableError,
  UnauthenticatedError,
  ERROR_CODES,
} from "./index.js";
__UPLOAD_ERROR_IMPORT__

/** Convert ORM failures without revealing tables, credentials, queries or constraints. */
function databaseError(error: unknown): CustomAPIError | undefined {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new ServiceUnavailableError(
      "The database is temporarily unavailable",
      ERROR_CODES.DATABASE_UNAVAILABLE,
    );
  }
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return undefined;
  switch (error.code) {
    case "P2002":
      return new ConflictError(
        "A record with these details already exists",
        ERROR_CODES.DATABASE_CONFLICT,
      );
    case "P2025":
      return new NotFoundError("The requested record could not be found");
    case "P2003":
      return new BadRequestError(
        "A related record is missing or still in use",
        ERROR_CODES.DATABASE_REFERENCE_INVALID,
      );
    case "P2024":
      return new ServiceUnavailableError(
        "The database is temporarily unavailable",
        ERROR_CODES.DATABASE_UNAVAILABLE,
      );
    default:
      return undefined;
  }
}

/** Translate known boundary failures; unexpected errors always receive a generic response. */
export function normalizeError(error: unknown): CustomAPIError {
  if (error instanceof CustomAPIError) return error;
  if (error instanceof ZodError) {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return new BadRequestError(
      "Please check the submitted information",
      ERROR_CODES.VALIDATION_ERROR,
      issues,
    );
  }
  if (error instanceof jwt.TokenExpiredError)
    return new UnauthenticatedError("Your token has expired", ERROR_CODES.ACCESS_TOKEN_EXPIRED);
  if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.NotBeforeError)
    return new UnauthenticatedError(
      "Authentication token is invalid",
      ERROR_CODES.ACCESS_TOKEN_INVALID,
    );
  __UPLOAD_ERROR_NORMALIZE__
  if (typeof error === "object" && error !== null && "type" in error) {
    if (error.type === "entity.too.large") return new PayloadTooLargeError();
    if (error.type === "entity.parse.failed")
      return new BadRequestError("Request body must be valid JSON", ERROR_CODES.INVALID_JSON);
  }
  return databaseError(error) ?? new CustomAPIError("Something went wrong. Please try again later");
}
