__ACTION_TEMPLATE_IMPORTS__
import { BadRequestError, ServiceUnavailableError, ERROR_CODES } from "../../errors/index.js";
import { randomUUID } from "node:crypto";
import { prisma } from "../../utils/prisma.js";
import { hashSecret, randomSecret, equalSecret } from "../../utils/crypto.js";
import { hashPassword } from "../../utils/password.js";

import { env } from "../../config/env.js";
import { sendEmail } from "../../utils/email/sender.js";

export type ActionPurpose = "verify" | "reset";
/** Action credentials are hashed, expire, and can only be consumed once. */
export async function requestAction(email: string, purpose: ActionPurpose): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, active: true, emailVerified: true },
  });
  if (!user?.active || (purpose === "verify" && user.emailVerified)) return;
  const recent = await prisma.passwordAction.findFirst({
    where: { userId: user.id, purpose, createdAt: { gt: new Date(Date.now() - 60000) } },
  });
  if (recent) return;
  const secret = randomSecret();
  const id = randomUUID();
  const expiresInMinutes = 30;
  await prisma.passwordAction.create({
    data: {
      id,
      userId: user.id,
      purpose,
      secretHash: hashSecret(secret),
      expiresAt: new Date(Date.now() + expiresInMinutes * 60000),
    },
  });
  const link = new URL(purpose === "verify" ? "/verify-email" : "/reset-password", env.WEB_APP_URL);
  link.searchParams.set("token", `${id}.${secret}`);
  try {
    const content = renderActionEmail(purpose, link.href, expiresInMinutes);
    const result = await sendEmail({ to: user.email, ...content });
    if (result.outcome === "skipped")
      throw new ServiceUnavailableError("Email is not configured", ERROR_CODES.EMAIL_UNAVAILABLE);
  } catch (error) {
    await prisma.passwordAction.deleteMany({ where: { id } });
    throw error;
  }
}

/** Claim and apply the action in one transaction, including session revocation for resets. */
export async function consumeAction(
  token: string,
  purpose: ActionPurpose,
  password?: string,
): Promise<void> {
  const [id, secret] = token.split(".");
  const invalid = () =>
    new BadRequestError("This link is invalid or expired", ERROR_CODES.ACTION_TOKEN_INVALID);
  if (!id || !secret || token.split(".").length !== 2) throw invalid();
  const action = await prisma.passwordAction.findUnique({
    where: { id },
    include: { user: { select: { active: true } } },
  });
  if (
    !action ||
    !action.user.active ||
    action.purpose !== purpose ||
    action.usedAt ||
    action.expiresAt <= new Date() ||
    !equalSecret(hashSecret(secret), action.secretHash)
  )
    throw invalid();
  const passwordHash = purpose === "reset" && password ? await hashPassword(password) : undefined;
  if (purpose === "reset" && !passwordHash) throw invalid();
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordAction.updateMany({
      where: { id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) throw invalid();
    await tx.user.update({
      where: { id: action.userId },
      data: purpose === "verify" ? { emailVerified: true } : { passwordHash },
    });
    if (purpose === "reset") {
      await tx.session.updateMany({
        where: { userId: action.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.passwordAction.updateMany({
        where: { userId: action.userId, purpose: "reset", usedAt: null },
        data: { usedAt: new Date() },
      });
    }
  });
}

/** Only selected action templates are imported into this generated project. */
function renderActionEmail(purpose: ActionPurpose, url: string, expiresInMinutes: number) {
  __ACTION_TEMPLATE_RENDER__
}
