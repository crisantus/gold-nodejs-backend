import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { hashSecret } from '../utils/crypto.js';
import { prisma } from '../utils/prisma.js';

function requirePush(): void { if (!env.PUSH_ENABLED) throw new AppError(503, 'PUSH_UNAVAILABLE', 'Push notifications are not configured'); }
/** Initialize only on first use; importing the app never contacts Firebase. */
function messaging() {
  requirePush();
  const app = getApps().find((candidate) => candidate.name === 'gold-push') ?? initializeApp({ credential: env.FIREBASE_CLIENT_EMAIL ? cert({ projectId: env.FIREBASE_PROJECT_ID, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') }) : applicationDefault() }, 'gold-push');
  return getMessaging(app);
}
/** Device tokens are encrypted at rest and never returned by list endpoints. */
function encrypt(token: string): string { const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', Buffer.from(env.PUSH_TOKEN_KEY, 'hex'), iv); const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]); return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), data.toString('hex')].join('.'); }
function decrypt(value: string): string { const [iv, tag, data] = value.split('.'); if (!iv || !tag || !data) throw new Error('Invalid encrypted token'); const decipher = createDecipheriv('aes-256-gcm', Buffer.from(env.PUSH_TOKEN_KEY, 'hex'), Buffer.from(iv, 'hex')); decipher.setAuthTag(Buffer.from(tag, 'hex')); return Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString('utf8'); }

/** Bind the provided device credential to the signed-in user, including account changes on one device. */
export async function registerDevice(userId: string, token: string): Promise<void> { requirePush(); await prisma.deviceToken.upsert({ where: { tokenHash: hashSecret(token) }, create: { userId, tokenHash: hashSecret(token), encryptedToken: encrypt(token) }, update: { userId, encryptedToken: encrypt(token) } }); }
/** Unregister only a token attached to this account. */
export async function removeDevice(userId: string, token: string): Promise<void> { await prisma.deviceToken.deleteMany({ where: { userId, tokenHash: hashSecret(token) } }); }

/** Internal domain services choose the recipient; no arbitrary public-send endpoint is exposed. */
export async function sendPush(userId: string, notification: { title: string; body: string }): Promise<{ outcome: 'accepted' | 'skipped' | 'failed'; accepted: number }> {
  if (!env.PUSH_ENABLED) return { outcome: 'skipped', accepted: 0 };
  const devices = await prisma.deviceToken.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 100 });
  if (!devices.length) return { outcome: 'skipped', accepted: 0 };
  try {
    const result = await messaging().sendEachForMulticast({ tokens: devices.map((device) => decrypt(device.encryptedToken)), notification });
    const invalidIds = result.responses.flatMap((response, index) => ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(response.error?.code ?? '') ? [devices[index]!.id] : []);
    if (invalidIds.length) await prisma.deviceToken.deleteMany({ where: { id: { in: invalidIds } } });
    return { outcome: result.successCount ? 'accepted' : 'failed', accepted: result.successCount };
  } catch { throw new AppError(502, 'PUSH_PROVIDER_ERROR', 'Push provider could not accept the request'); }
}
