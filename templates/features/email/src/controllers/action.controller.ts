import { validatedBody } from "../middlewares/validate-request.js";
__ACTION_CONTROLLER_IMPORTS__
import { StatusCodes } from "http-status-codes";
import { CustomAPIError, ERROR_CODES } from "../errors/index.js";
import type { Request, Response } from "express";
import {
  requestAction,
  consumeAction,
  type ActionPurpose,
} from "../services/auth/action.service.js";

import { sendResponse } from "../utils/send-response.js";

/** Preserve account privacy while requesting the selected email action. */
async function requestEmailAction(
  res: Response,
  email: string,
  purpose: ActionPurpose,
): Promise<void> {
  try {
    await requestAction(email, purpose);
  } catch (error) {
    if (
      !(error instanceof CustomAPIError) ||
      (error.code !== ERROR_CODES.EMAIL_UNAVAILABLE &&
        error.code !== ERROR_CODES.EMAIL_PROVIDER_ERROR)
    )
      throw error;
    if (process.env.NODE_ENV !== "test") console.error("Email action could not be delivered");
  }
  sendResponse(res, {
    statusCode: StatusCodes.ACCEPTED,
    message: "Request accepted. If an eligible account exists, check your email",
  });
}
/** Complete only the declared action purpose; credentials cannot cross action families. */
async function completeEmailAction(
  res: Response,
  token: string,
  purpose: ActionPurpose,
  password?: string,
): Promise<void> {
  await consumeAction(token, purpose, password);
  sendResponse(res, {
    message: purpose === "verify" ? "Email verified" : "Password reset. Please sign in again",
  });
}

__ACTION_CONTROLLERS__
