import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { z } from "zod";
const session = vi.hoisted(() => ({ authenticateAccess: vi.fn() }));
vi.mock("../../src/services/auth/session.service.js", () => ({
  ...session,
  rotateSession: vi.fn(),
  revokeSession: vi.fn(),
  sessionIdForRefresh: vi.fn(),
}));
vi.mock("../../src/utils/prisma.js", () => ({ prisma: {} }));
import { createApp } from "../../src/app.js";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../src/middlewares/validate-request.js";
import { errorHandlerMiddleware } from "../../src/middlewares/errors-handler.js";
import { features } from "../../src/config/env.js";
const app = createApp();
beforeEach(() => {
  session.authenticateAccess.mockReset();
  session.authenticateAccess.mockResolvedValue({
    id: "user-id",
    sessionId: "session-id",
    role: "user",
  });
});
describe("explicit Express routing", () => {
  it("retains parsed body, query and params across separate validators", async () => {
    const app = express();
    app.use(express.json());
    app.post(
      "/items/:id",
      validateBody(z.strictObject({ name: z.string().trim() })),
      validateQuery(z.object({ page: z.coerce.number().int() })),
      validateParams(z.object({ id: z.string().uuid() })),
      (req, res) => {
        res.json(req.validated);
      },
    );
    app.use(errorHandlerMiddleware);
    const id = "a932b71e-8f18-4df4-91ce-17916c1f09eb";
    const result = await request(app).post(`/items/${id}?page=2`).send({ name: " Example " });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ body: { name: "Example" }, query: { page: 2 }, params: { id } });
    expect(
      (await request(app).post(`/items/${id}?page=invalid`).send({ name: "Example" })).body
        .errorCode,
    ).toBe("VALIDATION_ERROR");
  });
  it.each(["/api/auth/sign-in", "/api/auth/login"])("validates credentials on %s", async (path) => {
    const result = await request(app).post(path).send({ email: "invalid", password: "" });
    expect(result.status).toBe(400);
    expect(result.body.errorCode).toBe("VALIDATION_ERROR");
  });
  it("protects every selected feature before invoking its controller", async () => {
    const routes: [string, string][] = [
      ["get", "/api/auth/me"],
      ["post", "/api/auth/logout"],
      ["patch", "/api/auth/password"],
    ];
    if (features.roles === "admin") routes.push(["get", "/api/admin/users"]);
    if (["push", "both"].includes(features.notifications))
      routes.push(["post", "/api/devices"], ["delete", "/api/devices"]);
    if (["inbox", "both"].includes(features.notifications))
      routes.push(["get", "/api/notifications"], ["patch", "/api/notifications/invalid/read"]);
    if (features.uploads)
      routes.push(
        ["post", "/api/files"],
        ["get", "/api/files/invalid/download"],
        ["delete", "/api/files/invalid"],
      );
    for (const [method, path] of routes) {
      const result =
        method === "post"
          ? await request(app).post(path)
          : method === "patch"
            ? await request(app).patch(path)
            : method === "delete"
              ? await request(app).delete(path)
              : await request(app).get(path);
      expect(result.status, `${method} ${path}`).toBe(401);
      expect(result.body.errorCode).toBe("AUTHENTICATION_REQUIRED");
    }
  });
  it("enforces admin authorization and selected query/identifier validators", async () => {
    if (features.roles === "admin") {
      expect(
        (await request(app).get("/api/admin/users").auth("test-token", { type: "bearer" })).status,
      ).toBe(403);
      session.authenticateAccess.mockResolvedValue({
        id: "admin-id",
        sessionId: "session-id",
        role: "admin",
      });
      expect(
        (
          await request(app)
            .get("/api/admin/users?limit=101")
            .auth("test-token", { type: "bearer" })
        ).body.errorCode,
      ).toBe("VALIDATION_ERROR");
    }
    if (["push", "both"].includes(features.notifications))
      expect(
        (
          await request(app)
            .post("/api/devices")
            .auth("test-token", { type: "bearer" })
            .send({ token: "short" })
        ).body.errorCode,
      ).toBe("VALIDATION_ERROR");
    if (["inbox", "both"].includes(features.notifications)) {
      expect(
        (await request(app).get("/api/notifications?page=0").auth("test-token", { type: "bearer" }))
          .body.errorCode,
      ).toBe("VALIDATION_ERROR");
      expect(
        (
          await request(app)
            .patch("/api/notifications/invalid/read")
            .auth("test-token", { type: "bearer" })
        ).body.errorCode,
      ).toBe("VALIDATION_ERROR");
    }
    if (features.uploads)
      expect(
        (
          await request(app)
            .get("/api/files/invalid/download")
            .auth("test-token", { type: "bearer" })
        ).body.errorCode,
      ).toBe("VALIDATION_ERROR");
  });
});

it("reads typed validation output once and rejects missing or mismatched schemas", async () => {
  const { validatedBody, validatedQuery, validatedParams } =
    await import("../../src/middlewares/validate-request.js");
  const transform = vi.fn((value: string) => ({ count: value.length }));
  const bodySchema = z.string().transform(transform);
  const otherSchema = z.object({ count: z.number() });
  const querySchema = z.object({ page: z.coerce.number().int() });
  const paramsSchema = z.object({ id: z.string().uuid() });
  const app = express();
  app.use(express.json({ strict: false }));
  app.post(
    "/typed/:id",
    validateBody(bodySchema),
    validateQuery(querySchema),
    validateParams(paramsSchema),
    (req, res) => {
      const first = validatedBody(req, bodySchema);
      const second = validatedBody(req, bodySchema);
      res.json({
        first,
        second,
        page: validatedQuery(req, querySchema).page,
        id: validatedParams(req, paramsSchema).id,
      });
    },
  );
  app.post("/mismatch", validateBody(bodySchema), (req, res) => {
    res.json(validatedBody(req, otherSchema));
  });
  app.post("/missing", (req, res) => {
    res.json(validatedBody(req, bodySchema));
  });
  app.use(errorHandlerMiddleware);
  const id = "a932b71e-8f18-4df4-91ce-17916c1f09eb";
  const result = await request(app)
    .post(`/typed/${id}?page=2`)
    .set("Content-Type", "application/json")
    .send('"abc"');
  expect(result.status).toBe(200);
  expect(result.body).toEqual({ first: { count: 3 }, second: { count: 3 }, page: 2, id });
  expect(transform).toHaveBeenCalledTimes(1);
  for (const path of ["/mismatch", "/missing"]) {
    const result = await request(app)
      .post(path)
      .set("Content-Type", "application/json")
      .send('"abc"');
    expect(result.status).toBe(500);
    expect(result.body.errorCode).toBe("INTERNAL_ERROR");
  }
});

it("requires an authenticated actor even when a controller is called without its router", async () => {
  const { meController } = await import("../../src/controllers/auth.controller.js");
  const app = express();
  app.get("/unwired", meController);
  app.use(errorHandlerMiddleware);
  const result = await request(app).get("/unwired");
  expect(result.status).toBe(401);
  expect(result.body.errorCode).toBe("AUTHENTICATION_REQUIRED");
});
