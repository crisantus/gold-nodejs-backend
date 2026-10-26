import { StatusCodes } from "http-status-codes";
import { CustomAPIError, type ValidationIssue } from "./custom-api.js";
import { ERROR_CODES, type ErrorCode } from "./error-codes.js";

/** An expected forbidden failure with a safe public message. */
export class ForbiddenError extends CustomAPIError {
  constructor(
    message = "Forbidden",
    code: ErrorCode = ERROR_CODES.FORBIDDEN,
    errors?: ValidationIssue[],
  ) {
    super(message, StatusCodes.FORBIDDEN, code, errors);
  }
}
