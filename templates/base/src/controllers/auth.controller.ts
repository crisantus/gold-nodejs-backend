import { StatusCodes } from "http-status-codes";
import type { UserRole } from "../utils/user-roles.js";
import { UnauthenticatedError, ForbiddenError, ERROR_CODES } from "../errors/index.js";
import type { Request, Response } from "express";
import { signup, login, changePassword } from "../services/auth/auth.service.js";
import {
  rotateSession,
  revokeSession,
  sessionIdForRefresh,
} from "../services/auth/session.service.js";
import {
  requireActor,
  clearSessionCookies,
  readCookies,
  setSessionCookies,
  verifyCsrf,
  wantsCookieSession,
} from "../middlewares/auth.js";
import { sendResponse } from "../utils/send-response.js";

import {
  signupSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
} from "../validators/auth.schema.js";
import { validatedBody } from "../middlewares/validate-request.js";

/** Browser sessions receive HTTP-only credentials; mobile sessions receive token JSON. */
function respondWithSession(
  req: Request,
  res: Response,
  result: {
    user: { id: string; name: string; email: string; role: UserRole; emailVerified: boolean };
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    accessTokenExpiresInSeconds: number;
  },
  message: string,
  statusCode = StatusCodes.OK,
): void {
  const { sessionId } = result;
  const data = {
    user: result.user,
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
    access_token_expires_in: result.accessTokenExpiresInSeconds,
  };
  if (wantsCookieSession(req)) {
    setSessionCookies(res, result.accessToken, result.refreshToken, sessionId);
    sendResponse(res, {
      statusCode,
      message,
      data: { user: result.user, access_token_expires_in: result.accessTokenExpiresInSeconds },
    });
  } else sendResponse(res, { statusCode, message, data });
}
/** Create an account using only the schema's accepted fields. */
export async function signUpController(req: Request, res: Response): Promise<void> {
  wantsCookieSession(req);
  const result = await signup(validatedBody(req, signupSchema));
  respondWithSession(req, res, result, "Signup successful", StatusCodes.CREATED);
}
/** Authenticate and return credentials in the selected client transport. */
export async function loginController(req: Request, res: Response): Promise<void> {
  wantsCookieSession(req);
  respondWithSession(req, res, await login(validatedBody(req, loginSchema)), "Login successful");
}
/** A refresh cookie requires Origin and a session-bound CSRF header, even after access expiry. */
export async function refreshController(req: Request, res: Response): Promise<void> {
  const input = validatedBody(req, refreshSchema);
  const cookieMode = !input.refresh_token;
  const token = input.refresh_token ?? readCookies(req).refreshToken;
  if (!token)
    throw new UnauthenticatedError("Refresh token is required", ERROR_CODES.REFRESH_TOKEN_REQUIRED);
  if (cookieMode) {
    if (!wantsCookieSession(req))
      throw new ForbiddenError("Browser session transport is required", ERROR_CODES.CSRF_INVALID);
    verifyCsrf(req, await sessionIdForRefresh(token));
  }
  const result = await rotateSession(token);
  respondWithSession(req, res, result, "Session refreshed");
}
/** Revoke the current session and clear local cookie credentials. */
export async function logoutController(req: Request, res: Response): Promise<void> {
  await revokeSession(requireActor(req).sessionId);
  clearSessionCookies(res);
  sendResponse(res, { message: "Logout successful" });
}
/** Expose only the authenticated user's selected public fields. */
export function meController(req: Request, res: Response): void {
  const { sessionId: _sessionId, ...user } = requireActor(req);
  sendResponse(res, { message: "Current user fetched", data: user });
}
/** Password changes terminate existing sessions, including this one. */
export async function changePasswordController(req: Request, res: Response): Promise<void> {
  await changePassword(requireActor(req), validatedBody(req, changePasswordSchema));
  clearSessionCookies(res);
  sendResponse(res, { message: "Password changed. Please sign in again" });
}
