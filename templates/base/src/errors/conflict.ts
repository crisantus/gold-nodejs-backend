import { StatusCodes } from "http-status-codes";
import { CustomAPIError, type ValidationIssue } from "./custom-api.js";
import { ERROR_CODES, type ErrorCode } from "./error-codes.js";

/** An expected conflict failure with a safe public message. */
export class ConflictError extends CustomAPIError {
  constructor(
    message = "Resource already exists",
    code: ErrorCode = ERROR_CODES.CONFLICT,
    errors?: ValidationIssue[],
  ) {
    super(message, StatusCodes.CONFLICT, code, errors);
  }
}
