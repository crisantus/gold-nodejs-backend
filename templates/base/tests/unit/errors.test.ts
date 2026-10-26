import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import { Prisma } from "../../src/generated/prisma/client.js";
import {
  BadRequestError,
  ConflictError,
  CustomAPIError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ProviderError,
  ServiceUnavailableError,
  ERROR_CODES,
} from "../../src/errors/index.js";
import { normalizeError } from "../../src/errors/normalize-error.js";
import { createErrorHandlerMiddleware } from "../../src/middlewares/errors-handler.js";
import { notFound } from "../../src/middlewares/not-found.js";
import { requestContext } from "../../src/middlewares/context.js";

describe("central error handling", () => {
  it.each([
    [new BadRequestError("Invalid details"), StatusCodes.BAD_REQUEST],
    [new ConflictError("Already exists"), StatusCodes.CONFLICT],
    [new UnauthenticatedError("Please sign in"), StatusCodes.UNAUTHORIZED],
    [new ForbiddenError("Not permitted"), StatusCodes.FORBIDDEN],
    [new NotFoundError("Not found"), StatusCodes.NOT_FOUND],
    [new ProviderError("Provider unavailable"), StatusCodes.BAD_GATEWAY],
    [new ServiceUnavailableError("Try again later"), StatusCodes.SERVICE_UNAVAILABLE],
  ])("formats %s with its declared HTTP status", async (failure, statusCode) => {
    const app = express();
    app.get("/failure", () => {
      throw failure;
    });
    app.use(createErrorHandlerMiddleware(vi.fn()));
    const response = await request(app).get("/failure");
    expect(failure).toBeInstanceOf(CustomAPIError);
    expect(response.status).toBe(statusCode);
    expect(response.body).toEqual({
      status: false,
      message: failure.message,
      errorCode: failure.code,
    });
  });

  it("normalizes database conflicts, missing records and unavailable connections safely", () => {
    for (const [code, expectedStatus] of [
      ["P2002", StatusCodes.CONFLICT],
      ["P2025", StatusCodes.NOT_FOUND],
      ["P2003", StatusCodes.BAD_REQUEST],
      ["P2024", StatusCodes.SERVICE_UNAVAILABLE],
    ] as const) {
      const failure = normalizeError(
        new Prisma.PrismaClientKnownRequestError("private SQL and credentials", {
          code,
          clientVersion: "test",
          meta: { target: ["private_field"] },
        }),
      );
      expect(failure.statusCode).toBe(expectedStatus);
      expect(failure.message).not.toContain("private");
    }
    const failure = normalizeError(
      new Prisma.PrismaClientInitializationError("private database URL", "test", "P1000"),
    );
    expect(failure.statusCode).toBe(StatusCodes.SERVICE_UNAVAILABLE);
    expect(failure.code).toBe(ERROR_CODES.DATABASE_UNAVAILABLE);
  });

  it("keeps unexpected database and application failures generic", () => {
    const failures = [
      new Error("private provider token"),
      new Prisma.PrismaClientValidationError("private query", { clientVersion: "test" }),
      { statusCode: StatusCodes.FORBIDDEN, message: "untrusted private response", code: "SECRET" },
    ];
    for (const input of failures) {
      const failure = normalizeError(input);
      expect(failure.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(failure.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(failure.message).not.toMatch(/private|SECRET/);
    }
  });

  it("preserves field validation and distinguishes expired and invalid JWTs", () => {
    const result = z.object({ email: z.email() }).safeParse({ email: "invalid" });
    if (result.success) throw new Error("Expected invalid fixture");
    const failure = normalizeError(result.error);
    expect(failure.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(failure.errors?.[0]?.path).toBe("email");
    expect(normalizeError(new jwt.TokenExpiredError("private token", new Date())).code).toBe(
      ERROR_CODES.ACCESS_TOKEN_EXPIRED,
    );
    expect(normalizeError(new jwt.JsonWebTokenError("private token")).code).toBe(
      ERROR_CODES.ACCESS_TOKEN_INVALID,
    );
  });

  it("formats malformed JSON, body limits and unknown routes through the same boundary", async () => {
    const app = express();
    app.use(express.json({ limit: "32b" }));
    app.use(notFound);
    app.use(createErrorHandlerMiddleware(vi.fn()));
    const malformed = await request(app)
      .post("/input")
      .set("Content-Type", "application/json")
      .send("{");
    expect(malformed.status).toBe(StatusCodes.BAD_REQUEST);
    expect(malformed.body.errorCode).toBe(ERROR_CODES.INVALID_JSON);
    const oversized = await request(app)
      .post("/input")
      .send({ text: "a".repeat(64) });
    expect(oversized.status).toBe(StatusCodes.REQUEST_TOO_LONG);
    expect(oversized.body.errorCode).toBe(ERROR_CODES.PAYLOAD_TOO_LARGE);
    const missing = await request(app).get("/private-token?token=secret");
    expect(missing.status).toBe(StatusCodes.NOT_FOUND);
    expect(JSON.stringify(missing.body)).not.toContain("secret");
  });

  it("logs only safe metadata and forwards errors after headers are sent", async () => {
    const logError = vi.fn();
    const app = express();
    app.use(requestContext);
    app.get("/failure", () => {
      throw new Error("private-provider-secret");
    });
    app.get("/started", (_req, res, next) => {
      res.write("started");
      next(new Error("private"));
    });
    app.use(createErrorHandlerMiddleware(logError));
    app.use(
      (
        error: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        expect(error).toBeInstanceOf(CustomAPIError);
        expect(JSON.stringify(error)).not.toContain("private");
        if (!(error instanceof CustomAPIError)) throw new Error("Expected normalized failure");
        expect(error.message).not.toContain("private");
        res.end(" completed");
      },
    );
    const result = await request(app).get("/failure").set("Authorization", "Bearer private-token");
    expect(result.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(logError).toHaveBeenCalledWith("Request failed", {
      requestId: result.headers["x-request-id"],
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      errorCode: ERROR_CODES.INTERNAL_ERROR,
    });
    expect(JSON.stringify(logError.mock.calls)).not.toContain("private");
    expect((await request(app).get("/started")).text).toBe("started completed");
  });
});
