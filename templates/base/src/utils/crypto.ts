import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Create unguessable opaque credentials; only hashes belong in persistent storage. */
export function randomSecret(): string {
  return randomBytes(32).toString("base64url");
}
/** Hash high-entropy session secrets before persisting them. */
export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}
/** Constant-time comparison also rejects differently sized untrusted values. */
export function equalSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
