import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/utils/prisma.js";
import {
  createNotification,
  listNotifications,
  readNotification,
} from "../../src/services/notifications/inbox.service.js";
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: "@gold-inbox-test.invalid" } } });
  await prisma.$disconnect();
});
it("persists inbox items and denies cross-account mutation", async () => {
  const first = await prisma.user.create({
    data: {
      name: "First",
      email: `${randomUUID()}@gold-inbox-test.invalid`,
      passwordHash: "unused",
    },
  });
  const second = await prisma.user.create({
    data: {
      name: "Second",
      email: `${randomUUID()}@gold-inbox-test.invalid`,
      passwordHash: "unused",
    },
  });
  const item = await createNotification(first.id, {
    title: "Confirmed",
    body: "Your booking is confirmed",
  });
  expect((await listNotifications(first.id, 1, 20)).unread).toBe(1);
  expect((await listNotifications(second.id, 1, 20)).items).toHaveLength(0);
  await expect(readNotification(second.id, item.id)).rejects.toMatchObject({ statusCode: 404 });
  await readNotification(first.id, item.id);
  expect((await listNotifications(first.id, 1, 20)).unread).toBe(0);
});
