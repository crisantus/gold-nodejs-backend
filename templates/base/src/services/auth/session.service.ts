__VERIFY_ERROR_IMPORT__
import { UnauthenticatedError, ERROR_CODES } from "../../errors/index.js";
import { randomUUID } from "node:crypto";
import { prisma } from "../../utils/prisma.js";
import { env } from "../../config/env.js";

import { equalSecret, hashSecret, randomSecret } from "../../utils/crypto.js";
import { signAccessToken, verifyAccessToken } from "../../utils/jwt.js";
import type { Actor } from "../../types/auth.js";

const day = 86400000;
const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  emailVerified: true,
} as const;
const invalid = () =>
  new UnauthenticatedError(
    "Authentication session is invalid or expired",
    ERROR_CODES.REFRESH_TOKEN_INVALID,
  );

/** Persist a hashed opaque refresh credential and bind access JWTs to its session. */
export async function issueSession(userId: string, expectedPasswordHash?: string) {
  const sessionId = randomUUID();
  const tokenId = randomUUID();
  const secret = randomSecret();
  const now = new Date();
  const absoluteExpiresAt = new Date(now.getTime() + env.REFRESH_ABSOLUTE_DAYS * day);
  const idleExpiresAt = new Date(
    Math.min(absoluteExpiresAt.getTime(), now.getTime() + env.REFRESH_IDLE_DAYS * day),
  );
  await prisma.$transaction(async (tx) => {
    // Lock the user while creating the session so password changes cannot leave a newly issued stale session.
    const current = await tx.user.updateMany({
      where: {
        id: userId,
        active: true,
        ...(expectedPasswordHash ? { passwordHash: expectedPasswordHash } : {}),
      },
      data: { lastAuthenticatedAt: now },
    });
    if (current.count !== 1)
      throw new UnauthenticatedError("Please sign in again", ERROR_CODES.INVALID_CREDENTIALS);
    await tx.session.create({
      data: {
        id: sessionId,
        userId,
        absoluteExpiresAt,
        idleExpiresAt,
        tokens: {
          create: { id: tokenId, secretHash: hashSecret(secret), expiresAt: idleExpiresAt },
        },
      },
    });
  });
  return {
    accessToken: signAccessToken(userId, sessionId),
    refreshToken: `${tokenId}.${secret}`,
    sessionId,
    accessTokenExpiresInSeconds: env.ACCESS_TOKEN_SECONDS,
  };
}

/** Check server-side state on each request so revoked sessions and changed roles take effect. */
export async function authenticateAccess(token: string): Promise<Actor> {
  const claims = verifyAccessToken(token);
  const now = new Date();
  const session = await prisma.session.findFirst({
    where: {
      id: claims.sessionId,
      userId: claims.userId,
      revokedAt: null,
      idleExpiresAt: { gt: now },
      absoluteExpiresAt: { gt: now },
      user: { active: true },
    },
    include: { user: { select: publicSelect } },
  });
  if (!session) throw new UnauthenticatedError("Please sign in again", ERROR_CODES.SESSION_REVOKED);
  __VERIFY_ACCESS_EMAIL__
  return { ...session.user, sessionId: session.id };
}

/** Reject replay before rotation and atomically let only one concurrent rotation consume a token. */
export async function rotateSession(value: string) {
  const parts = value.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw invalid();
  const stored = await prisma.refreshToken.findUnique({
    where: { id: parts[0] },
    include: { session: { include: { user: { select: { ...publicSelect, active: true } } } } },
  });
  if (!stored || !equalSecret(hashSecret(parts[1]), stored.secretHash)) throw invalid();
  if (stored.consumedAt) {
    await revokeSession(stored.sessionId);
    throw new UnauthenticatedError("Please sign in again", ERROR_CODES.REFRESH_TOKEN_REUSED);
  }
  const now = new Date();
  const session = stored.session;
  if (
    session.revokedAt ||
    !session.user.active ||
    stored.expiresAt <= now ||
    session.absoluteExpiresAt <= now ||
    session.idleExpiresAt <= now
  )
    throw invalid();
  const tokenId = randomUUID();
  const secret = randomSecret();
  const idleExpiresAt = new Date(
    Math.min(session.absoluteExpiresAt.getTime(), now.getTime() + env.REFRESH_IDLE_DAYS * day),
  );
  const replaced = await prisma.$transaction(async (tx) => {
    const claimed = await tx.refreshToken.updateMany({
      where: {
        id: stored.id,
        consumedAt: null,
        session: { revokedAt: null, user: { active: true } },
      },
      data: { consumedAt: now },
    });
    if (claimed.count !== 1) return false;
    const active = await tx.session.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { idleExpiresAt },
    });
    if (active.count !== 1) throw invalid();
    await tx.refreshToken.create({
      data: {
        id: tokenId,
        sessionId: session.id,
        secretHash: hashSecret(secret),
        expiresAt: idleExpiresAt,
      },
    });
    return true;
  });
  if (!replaced) {
    await revokeSession(session.id);
    throw new UnauthenticatedError("Please sign in again", ERROR_CODES.REFRESH_TOKEN_REUSED);
  }
  const { active: _active, ...user } = session.user;
  return {
    user,
    accessToken: signAccessToken(user.id, session.id),
    refreshToken: `${tokenId}.${secret}`,
    sessionId: session.id,
    accessTokenExpiresInSeconds: env.ACCESS_TOKEN_SECONDS,
  };
}

/** Revoke the session rather than only clearing a browser cookie. */
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Validate the refresh secret before controller-level CSRF checks for cookie refresh. */
export async function sessionIdForRefresh(value: string): Promise<string> {
  const [id, secret] = value.split(".");
  if (!id || !secret || value.split(".").length !== 2) throw invalid();
  const token = await prisma.refreshToken.findUnique({ where: { id } });
  if (!token || !equalSecret(hashSecret(secret), token.secretHash)) throw invalid();
  return token.sessionId;
}
