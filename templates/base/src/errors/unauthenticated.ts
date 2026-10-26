import { StatusCodes } from "http-status-codes";
import { CustomAPIError, type ValidationIssue } from "./custom-api.js";
import { ERROR_CODES, type ErrorCode } from "./error-codes.js";

/** An expected unauthorized failure with a safe public message. */
export class UnauthenticatedError extends CustomAPIError {
  constructor(
    message = "Authentication failed",
    code: ErrorCode = ERROR_CODES.UNAUTHENTICATED,
    errors?: ValidationIssue[],
  ) {
    super(message, StatusCodes.UNAUTHORIZED, code, errors);
  }
}
