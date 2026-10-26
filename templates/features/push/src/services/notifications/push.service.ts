import { env } from "../../config/env.js";
import { ProviderError, ERROR_CODES } from "../../errors/index.js";
import { prisma } from "../../utils/prisma.js";
import { getFirebaseMessaging } from "../../utils/firebase/messaging.js";
import { decryptDeviceToken } from "../../utils/firebase/device-token.js";
import type { NotificationInput, PushResult } from "./notification.types.js";

const invalidTokenCodes = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

/** Send to this user's registered devices, preserving provider acceptance as a distinct outcome. */
export async function sendPush(
  userId: string,
  notification: NotificationInput,
): Promise<PushResult> {
  if (!env.PUSH_ENABLED) return { outcome: "skipped", accepted: 0 };
  const devices = await prisma.deviceToken.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  if (!devices.length) return { outcome: "skipped", accepted: 0 };
  try {
    const result = await getFirebaseMessaging().sendEachForMulticast({
      tokens: devices.map((device) => decryptDeviceToken(device.encryptedToken)),
      notification: { title: notification.title, body: notification.body },
      data: notification.data,
      android: {
        priority: "high",
        notification: { channelId: env.FCM_ANDROID_CHANNEL_ID, sound: "default" },
      },
      apns: { headers: { "apns-priority": "10" }, payload: { aps: { sound: "default" } } },
    });
    // Delete only registrations explicitly rejected as invalid; transient failures remain retryable.
    const invalidIds = result.responses.flatMap((response, index) => {
      const device = devices[index];
      if (!device || !invalidTokenCodes.has(response.error?.code ?? "")) return [];
      return [device.id];
    });
    if (invalidIds.length)
      await prisma.deviceToken.deleteMany({ where: { id: { in: invalidIds } } });
    return { outcome: result.successCount ? "accepted" : "failed", accepted: result.successCount };
  } catch {
    throw new ProviderError(
      "Push provider could not accept the request",
      ERROR_CODES.PUSH_PROVIDER_ERROR,
    );
  }
}
