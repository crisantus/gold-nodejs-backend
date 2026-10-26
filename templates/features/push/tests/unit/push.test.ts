import { getFirebaseMessaging } from "../../src/utils/firebase/messaging.js";
import { registerDevice } from "../../src/services/notifications/device.service.js";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  findMany: vi.fn(),
  deleteMany: vi.fn(),
  send: vi.fn(),
  getApps: vi.fn((): { name: string }[] => []),
  initializeApp: vi.fn(() => ({ name: "gold-push" })),
}));
vi.mock("../../src/utils/prisma.js", () => ({
  prisma: {
    deviceToken: { upsert: mocks.upsert, findMany: mocks.findMany, deleteMany: mocks.deleteMany },
  },
}));
vi.mock("firebase-admin/app", () => ({
  applicationDefault: vi.fn(),
  cert: vi.fn(),
  getApps: mocks.getApps,
  initializeApp: mocks.initializeApp,
}));
vi.mock("firebase-admin/messaging", () => ({
  getMessaging: () => ({ sendEachForMulticast: mocks.send }),
}));
import { env } from "../../src/config/env.js";
import { sendPush } from "../../src/services/notifications/push.service.js";
const initialEnabled = env.PUSH_ENABLED;
const initialKey = env.PUSH_TOKEN_KEY;
afterEach(() => {
  env.PUSH_ENABLED = initialEnabled;
  env.PUSH_TOKEN_KEY = initialKey;
  vi.clearAllMocks();
  mocks.getApps.mockReturnValue([]);
});
it("does not call Firebase when disabled", async () => {
  env.PUSH_ENABLED = false;
  expect(await sendPush("user", { title: "Test", body: "Test" })).toEqual({
    outcome: "skipped",
    accepted: 0,
  });
  expect(mocks.send).not.toHaveBeenCalled();
  expect(mocks.initializeApp).not.toHaveBeenCalled();
});
it("encrypts device tokens at rest and removes invalid registrations", async () => {
  env.PUSH_ENABLED = true;
  env.PUSH_TOKEN_KEY = "a".repeat(64);
  const token = "private-device-token-for-test";
  await registerDevice("user", token);
  const call = mocks.upsert.mock.calls[0]![0] as {
    create: { encryptedToken: string; tokenHash: string };
  };
  expect(call.create.encryptedToken).not.toContain(token);
  expect(call.create.tokenHash).not.toBe(token);
  mocks.findMany.mockResolvedValue([{ id: "device", encryptedToken: call.create.encryptedToken }]);
  mocks.send.mockResolvedValue({
    successCount: 0,
    responses: [{ error: { code: "messaging/registration-token-not-registered" } }],
  });
  expect(
    await sendPush("user", { title: "Test", body: "Test", data: { screen: "inbox" } }),
  ).toEqual({ outcome: "failed", accepted: 0 });
  expect(mocks.send.mock.calls[0]![0]).toMatchObject({
    tokens: [token],
    data: { screen: "inbox" },
    android: { notification: { channelId: env.FCM_ANDROID_CHANNEL_ID } },
    apns: { payload: { aps: { sound: "default" } } },
  });
  expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["device"] } } });
});

it("reuses an existing Firebase app without initializing another client", () => {
  env.PUSH_ENABLED = true;
  mocks.getApps.mockReturnValue([{ name: "gold-push" }]);
  expect(getFirebaseMessaging()).toBeDefined();
  expect(mocks.initializeApp).not.toHaveBeenCalled();
});
