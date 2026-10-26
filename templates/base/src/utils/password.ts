import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";

// This version fixes the work factor so existing hashes remain verifiable after future upgrades.
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}
/** Use asynchronous salted scrypt with an explicit memory/work factor. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt-v1:${salt}:${key.toString("hex")}`;
}
/** Compare only hashes created by this helper; malformed stored data fails closed. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, encoded] = stored.split(":");
  if (algorithm !== "scrypt-v1" || !salt || !encoded || !/^[a-f0-9]{128}$/.test(encoded))
    return false;
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(encoded, "hex"));
}
