import { StatusCodes } from "http-status-codes";
import { CustomAPIError, type ValidationIssue } from "./custom-api.js";
import { ERROR_CODES, type ErrorCode } from "./error-codes.js";

/** An expected bad gateway failure with a safe public message. */
export class ProviderError extends CustomAPIError {
  constructor(
    message = "The provider could not complete the request",
    code: ErrorCode = ERROR_CODES.PROVIDER_ERROR,
    errors?: ValidationIssue[],
  ) {
    super(message, StatusCodes.BAD_GATEWAY, code, errors);
  }
}
