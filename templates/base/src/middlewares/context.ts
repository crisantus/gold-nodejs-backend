import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

/** Assign a server-generated request ID before parsing input or invoking other middleware. */
export const requestContext: RequestHandler = (_req, res, next) => {
  const requestId = randomUUID();
  res.setHeader("X-Request-ID", requestId);
  res.locals.requestId = requestId;
  next();
};
