import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../../config/env.js";

/** Authenticate encrypted token storage using a fresh nonce for each write. */
export function encryptDeviceToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(env.PUSH_TOKEN_KEY, "hex"), iv);
  const data = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv.toString("hex"), cipher.getAuthTag().toString("hex"), data.toString("hex")].join(".");
}

/** Reject corrupted ciphertext before a token reaches Firebase. */
export function decryptDeviceToken(value: string): string {
  const [iv, tag, data] = value.split(".");
  if (!iv || !tag || !data) throw new Error("Invalid encrypted device token");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(env.PUSH_TOKEN_KEY, "hex"),
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(data, "hex")), decipher.final()]).toString(
    "utf8",
  );
}
