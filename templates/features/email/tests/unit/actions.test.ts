import { ServiceUnavailableError, ERROR_CODES } from "../../src/errors/index.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
const actions = vi.hoisted(() => ({ requestAction: vi.fn(), consumeAction: vi.fn() }));
vi.mock("../../src/services/auth/action.service.js", () => actions);
vi.mock("../../src/utils/prisma.js", () => ({ prisma: {} }));
import { createApp } from "../../src/app.js";
import { features } from "../../src/config/env.js";

const app = createApp();
beforeEach(() => {
  actions.requestAction.mockReset();
  actions.consumeAction.mockReset();
});
const flows = [
  {
    enabled: features.verifyEmail,
    purpose: "verify",
    requestPath: "resend-verification",
    completePath: "verify-email",
  },
  {
    enabled: features.passwordReset,
    purpose: "reset",
    requestPath: "forgot-password",
    completePath: "reset-password",
  },
];
for (const flow of flows.filter(({ enabled }) => enabled))
  describe(`${flow.purpose} routes`, () => {
    it("validates email before requesting the correct action", async () => {
      const bad = await request(app)
        .post(`/api/auth/${flow.requestPath}`)
        .send({ email: "invalid" });
      expect(bad.status).toBe(400);
      expect(actions.requestAction).not.toHaveBeenCalled();
      const result = await request(app)
        .post(`/api/auth/${flow.requestPath}`)
        .send({ email: " User@Example.com " });
      expect(result.status).toBe(202);
      expect(result.body.status).toBe(true);
      expect(actions.requestAction).toHaveBeenCalledWith("user@example.com", flow.purpose);
    });
    it("keeps the accepted response private when email is unavailable", async () => {
      actions.requestAction.mockRejectedValueOnce(
        new ServiceUnavailableError("private provider detail", ERROR_CODES.EMAIL_UNAVAILABLE),
      );
      const result = await request(app)
        .post(`/api/auth/${flow.requestPath}`)
        .send({ email: "user@example.com" });
      expect(result.status).toBe(202);
      expect(JSON.stringify(result.body)).not.toContain("private");
    });
    it("validates the token and dispatches the matching completion", async () => {
      const bad = await request(app)
        .post(`/api/auth/${flow.completePath}`)
        .send({ token: "short" });
      expect(bad.status).toBe(400);
      expect(actions.consumeAction).not.toHaveBeenCalled();
      const token = "one-time-test-token-at-least-20-characters";
      const password = flow.purpose === "reset" ? "new-test-password-12345" : undefined;
      const result = await request(app)
        .post(`/api/auth/${flow.completePath}`)
        .send({ token, ...(password ? { password } : {}) });
      expect(result.status).toBe(200);
      expect(actions.consumeAction).toHaveBeenCalledWith(token, flow.purpose, password);
    });
  });
