import { StatusCodes } from "http-status-codes";
import { CustomAPIError, type ValidationIssue } from "./custom-api.js";
import { ERROR_CODES, type ErrorCode } from "./error-codes.js";

/** An expected request too long failure with a safe public message. */
export class PayloadTooLargeError extends CustomAPIError {
  constructor(
    message = "Request exceeds the allowed size",
    code: ErrorCode = ERROR_CODES.PAYLOAD_TOO_LARGE,
    errors?: ValidationIssue[],
  ) {
    super(message, StatusCodes.REQUEST_TOO_LONG, code, errors);
  }
}
