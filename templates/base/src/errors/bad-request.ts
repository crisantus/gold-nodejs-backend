import { StatusCodes } from "http-status-codes";
import { CustomAPIError, type ValidationIssue } from "./custom-api.js";
import { ERROR_CODES, type ErrorCode } from "./error-codes.js";

/** An expected bad request failure with a safe public message. */
export class BadRequestError extends CustomAPIError {
  constructor(
    message = "Bad request",
    code: ErrorCode = ERROR_CODES.BAD_REQUEST,
    errors?: ValidationIssue[],
  ) {
    super(message, StatusCodes.BAD_REQUEST, code, errors);
  }
}
