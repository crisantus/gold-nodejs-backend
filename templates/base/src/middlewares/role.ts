import type { RequestHandler } from "express";
import { ForbiddenError } from "../errors/index.js";
import type { UserRole } from "../utils/user-roles.js";

/** Apply after authentication; the actor's role is read from the current persisted account. */
export function requireRole(allowedRoles: readonly UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.actor || !allowedRoles.includes(req.actor.role))
      throw new ForbiddenError("This action requires an authorized role");
    next();
  };
}
