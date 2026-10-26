import { StatusCodes } from "http-status-codes";
import { CustomAPIError, type ValidationIssue } from "./custom-api.js";
import { ERROR_CODES, type ErrorCode } from "./error-codes.js";

/** An expected service unavailable failure with a safe public message. */
export class ServiceUnavailableError extends CustomAPIError {
  constructor(
    message = "The service is temporarily unavailable",
    code: ErrorCode = ERROR_CODES.SERVICE_UNAVAILABLE,
    errors?: ValidationIssue[],
  ) {
    super(message, StatusCodes.SERVICE_UNAVAILABLE, code, errors);
  }
}
