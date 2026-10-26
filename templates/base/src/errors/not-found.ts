import { StatusCodes } from "http-status-codes";
import { CustomAPIError, type ValidationIssue } from "./custom-api.js";
import { ERROR_CODES, type ErrorCode } from "./error-codes.js";

/** An expected not found failure with a safe public message. */
export class NotFoundError extends CustomAPIError {
  constructor(
    message = "Resource not found",
    code: ErrorCode = ERROR_CODES.NOT_FOUND,
    errors?: ValidationIssue[],
  ) {
    super(message, StatusCodes.NOT_FOUND, code, errors);
  }
}
