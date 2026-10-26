import { UnauthenticatedError, ERROR_CODES } from "../errors/index.js";
import jwt from "jsonwebtoken";
import { env, tokenAudience, tokenIssuer } from "../config/env.js";

/** Access credentials identify a persistent session; roles are rechecked in the database. */
export function signAccessToken(userId: string, sessionId: string): string {
  return jwt.sign({ sid: sessionId }, env.JWT_SECRET, {
    subject: userId,
    algorithm: "HS256",
    issuer: tokenIssuer,
    audience: tokenAudience,
    expiresIn: env.ACCESS_TOKEN_SECONDS,
  });
}
/** Enforce token purpose, algorithm, audience, issuer and expiration at every boundary. */
export function verifyAccessToken(token: string): { userId: string; sessionId: string } {
  try {
    const value = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: tokenIssuer,
      audience: tokenAudience,
    });
    if (typeof value === "string" || typeof value.sub !== "string" || typeof value.sid !== "string")
      throw new Error("Invalid claims");
    return { userId: value.sub, sessionId: value.sid };
  } catch (error) {
    throw new UnauthenticatedError(
      "Authentication token is invalid or expired",
      error instanceof jwt.TokenExpiredError
        ? ERROR_CODES.ACCESS_TOKEN_EXPIRED
        : ERROR_CODES.ACCESS_TOKEN_INVALID,
    );
  }
}
