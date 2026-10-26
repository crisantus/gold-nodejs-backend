import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import {
  signupSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
  publicUserSchema,
  sessionResponseSchema,
} from "../validators/auth.schema.js";
__CONTRACT_IMPORTS__

/** Documentation only: HTTP routes are registered explicitly in routes/*.ts. */
export interface ApiContract {
  method: "get" | "post" | "patch" | "delete";
  path: string;
  operationId: string;
  tag: string;
  summary: string;
  access: "public" | "user" | "admin";
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
  response: z.ZodType;
  statusCode?: number;
}
export const authContracts: ApiContract[] = [
  {
    method: "post",
    path: "/auth/sign-up",
    operationId: "signup",
    tag: "Authentication",
    summary: "Create a regular user account",
    access: "public",
    body: signupSchema,
    response: sessionResponseSchema,
    statusCode: StatusCodes.CREATED,
  },
  {
    method: "post",
    path: "/auth/sign-in",
    operationId: "signIn",
    tag: "Authentication",
    summary: "Sign in",
    access: "public",
    body: loginSchema,
    response: sessionResponseSchema,
  },
  {
    method: "post",
    path: "/auth/login",
    operationId: "login",
    tag: "Authentication",
    summary: "Sign in (login alias)",
    access: "public",
    body: loginSchema,
    response: sessionResponseSchema,
  },
  {
    method: "post",
    path: "/auth/refresh",
    operationId: "refreshSession",
    tag: "Authentication",
    summary: "Rotate a refresh token",
    access: "public",
    body: refreshSchema,
    response: sessionResponseSchema,
  },
  {
    method: "post",
    path: "/auth/logout",
    operationId: "logout",
    tag: "Authentication",
    summary: "Revoke the current session",
    access: "user",
    response: z.unknown(),
  },
  {
    method: "get",
    path: "/auth/me",
    operationId: "currentUser",
    tag: "Authentication",
    summary: "Get the current user",
    access: "user",
    response: publicUserSchema,
  },
  {
    method: "patch",
    path: "/auth/password",
    operationId: "changePassword",
    tag: "Authentication",
    summary: "Change password and revoke sessions",
    access: "user",
    body: changePasswordSchema,
    response: z.unknown(),
  },
];

export const healthContracts: ApiContract[] = [
  {
    method: "get",
    path: "/health",
    operationId: "health",
    tag: "Health",
    summary: "Process liveness",
    access: "public",
    response: z.object({ service: z.string() }),
  },
  {
    method: "get",
    path: "/ready",
    operationId: "readiness",
    tag: "Health",
    summary: "Database readiness",
    access: "public",
    response: z.unknown(),
  },
];

/** Share validation schemas with the routers and keep stable export identities. */
const featureContracts: ApiContract[] = [__FEATURE_CONTRACTS__];
const actionContracts: ApiContract[] = [__ACTION_CONTRACTS__];
export const apiContracts: ApiContract[] = [
  ...healthContracts,
  ...authContracts,
  ...featureContracts,
  ...actionContracts,
];
