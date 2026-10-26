import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/utils/prisma.js";
import { hashPassword } from "../../src/utils/password.js";

const app = createApp();
const password = "integration-password-12345";
async function account() {
  const email = `${randomUUID()}@gold-test.invalid`;
  // Email actions are tested separately; normal auth tests use verified fixtures.
  const user = await prisma.user.create({
    data: {
      name: "Test User",
      email,
      passwordHash: await hashPassword(password),
      emailVerified: true,
    },
  });
  const login = await request(app).post("/api/auth/sign-in").send({ email, password });
  expect(login.status).toBe(200);
  return {
    user,
    tokens: {
      accessToken: login.body.data.access_token as string,
      refreshToken: login.body.data.refresh_token as string,
    },
  };
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: "@gold-test.invalid" } } });
  await prisma.$disconnect();
});
describe("real database auth guarantees", () => {
  it("creates regular accounts and rejects duplicate signup", async () => {
    const email = `${randomUUID()}@gold-test.invalid`;
    const first = await request(app)
      .post("/api/auth/sign-up")
      .send({ name: "User", email, password });
    __SIGNUP_INTEGRATION_ASSERT__
    const duplicate = await request(app)
      .post("/api/auth/sign-up")
      .send({ name: "User", email, password });
    expect(duplicate.status).toBe(409);
    const stored = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(stored.role).toBe("user");
    expect(stored.passwordHash).not.toBe(password);
  });
  it("revokes access and refresh credentials on logout", async () => {
    const { tokens } = await account();
    expect(
      (await request(app).get("/api/auth/me").auth(tokens.accessToken, { type: "bearer" })).status,
    ).toBe(200);
    expect(
      (await request(app).post("/api/auth/logout").auth(tokens.accessToken, { type: "bearer" }))
        .status,
    ).toBe(200);
    expect(
      (await request(app).get("/api/auth/me").auth(tokens.accessToken, { type: "bearer" })).status,
    ).toBe(401);
    expect(
      (await request(app).post("/api/auth/refresh").send({ refresh_token: tokens.refreshToken }))
        .status,
    ).toBe(401);
  });
  it("detects refresh replay and revokes its replacement", async () => {
    const { tokens } = await account();
    const first = await request(app)
      .post("/api/auth/refresh")
      .send({ refresh_token: tokens.refreshToken });
    expect(first.status).toBe(200);
    const replay = await request(app)
      .post("/api/auth/refresh")
      .send({ refresh_token: tokens.refreshToken });
    expect(replay.status).toBe(401);
    expect(replay.body.errorCode).toBe("REFRESH_TOKEN_REUSED");
    expect(
      (
        await request(app)
          .get("/api/auth/me")
          .auth(first.body.data.access_token, { type: "bearer" })
      ).status,
    ).toBe(401);
  });
  it("allows only one concurrent consumption of a refresh token", async () => {
    const { tokens } = await account();
    const results = await Promise.all([
      request(app).post("/api/auth/refresh").send({ refresh_token: tokens.refreshToken }),
      request(app).post("/api/auth/refresh").send({ refresh_token: tokens.refreshToken }),
    ]);
    expect(results.map((response) => response.status).sort()).toEqual([200, 401]);
  });
  it("rejects blocked accounts even with an existing access token", async () => {
    const { user, tokens } = await account();
    await prisma.user.update({ where: { id: user.id }, data: { active: false } });
    expect(
      (await request(app).get("/api/auth/me").auth(tokens.accessToken, { type: "bearer" })).status,
    ).toBe(401);
  });
  it("revokes all sessions after password change", async () => {
    const { tokens } = await account();
    expect(
      (
        await request(app)
          .patch("/api/auth/password")
          .auth(tokens.accessToken, { type: "bearer" })
          .send({ currentPassword: password, newPassword: "new-integration-password-12345" })
      ).status,
    ).toBe(200);
    expect(
      (await request(app).get("/api/auth/me").auth(tokens.accessToken, { type: "bearer" })).status,
    ).toBe(401);
  });
  __COOKIE_INTEGRATION_TEST__
  __ADMIN_INTEGRATION_TEST__
});
