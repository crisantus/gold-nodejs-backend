import { env } from "../../config/env.js";
import { ServiceUnavailableError, ERROR_CODES } from "../../errors/index.js";
import { prisma } from "../../utils/prisma.js";
import { hashSecret } from "../../utils/crypto.js";
import { encryptDeviceToken } from "../../utils/firebase/device-token.js";

/** Bind a device token to the current account; multiple devices are supported. */
export async function registerDevice(userId: string, token: string): Promise<void> {
  if (!env.PUSH_ENABLED)
    throw new ServiceUnavailableError(
      "Push notifications are not configured",
      ERROR_CODES.PUSH_UNAVAILABLE,
    );
  const tokenHash = hashSecret(token);
  const encryptedToken = encryptDeviceToken(token);
  await prisma.deviceToken.upsert({
    where: { tokenHash },
    create: { userId, tokenHash, encryptedToken },
    update: { userId, encryptedToken },
  });
}

/** Remove only a token currently owned by the authenticated user. */
export async function removeDevice(userId: string, token: string): Promise<void> {
  await prisma.deviceToken.deleteMany({ where: { userId, tokenHash: hashSecret(token) } });
}
