import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import express from "express";
vi.mock("../../src/utils/prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn().mockRejectedValue(new Error("private database credentials")),
    session: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}));
import { createApp } from "../../src/app.js";
import { errorHandlerMiddleware } from "../../src/middlewares/errors-handler.js";
import { signAccessToken, verifyAccessToken } from "../../src/utils/jwt.js";
import { hashPassword, verifyPassword } from "../../src/utils/password.js";

const app = createApp();
describe("foundation behavior", () => {
  it("provides liveness and a correlation header without a database connection", async () => {
    const result = await request(app).get("/api/health");
    expect(result.status).toBe(200);
    expect(result.body.status).toBe(true);
    expect(result.headers["x-request-id"]).toBeTruthy();
  });
  it("reports unavailable database readiness safely", async () => {
    const result = await request(app).get("/api/ready");
    expect(result.status).toBe(503);
    expect(result.body.errorCode).toBe("NOT_READY");
    expect(JSON.stringify(result.body)).not.toContain("credentials");
  });
  it("uses the envelope for unknown routes and malformed JSON", async () => {
    expect((await request(app).get("/not-a-route")).body.errorCode).toBe("NOT_FOUND");
    const result = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{");
    expect(result.status).toBe(400);
    expect(result.body.errorCode).toBe("INVALID_JSON");
  });
  it("rejects untrusted admin signup and invalid inputs before persistence", async () => {
    const result = await request(app).post("/api/auth/sign-up").send({
      name: "User",
      email: "user@example.com",
      password: "long-password-for-test",
      role: "admin",
    });
    expect(result.status).toBe(400);
    expect(result.body.errorCode).toBe("VALIDATION_ERROR");
  });
  it("protects current-user routes and rejects unapproved origins", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    expect(
      (
        await request(app)
          .post("/api/auth/login")
          .set("Origin", "https://untrusted.example")
          .send({})
      ).status,
    ).toBe(403);
  });
  it("does not reveal unexpected internal messages", async () => {
    const router = express();
    router.get("/failure", () => {
      throw new Error("private provider token");
    });
    router.use(errorHandlerMiddleware);
    const result = await request(router).get("/failure");
    expect(result.status).toBe(500);
    expect(result.body.message).not.toContain("private");
  });
  it("hashes passwords with per-password salts and compares safely", async () => {
    const hash = await hashPassword("long-password-for-test");
    expect(hash).not.toContain("long-password");
    expect(await verifyPassword("long-password-for-test", hash)).toBe(true);
    expect(await verifyPassword("incorrect", hash)).toBe(false);
    expect(await verifyPassword("anything", "malformed")).toBe(false);
  });
  it("verifies access purpose and fails closed on tampered tokens", () => {
    const token = signAccessToken("user-id", "session-id");
    expect(verifyAccessToken(token)).toEqual({ userId: "user-id", sessionId: "session-id" });
    expect(() => verifyAccessToken(`${token}tampered`)).toThrow();
  });
});
