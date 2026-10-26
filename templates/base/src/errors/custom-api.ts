import { StatusCodes } from "http-status-codes";
import { ERROR_CODES, type ErrorCode } from "./error-codes.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

/** Expected application failures carry a safe public message and stable identifier. */
export class CustomAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    public readonly code: ErrorCode = ERROR_CODES.INTERNAL_ERROR,
    public readonly errors?: ValidationIssue[],
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Keep existing internal consumers compatible with the public errorCode field. */
  get errorCode(): ErrorCode {
    return this.code;
  }
}
