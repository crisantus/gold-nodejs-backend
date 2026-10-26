__VERIFY_ERROR_IMPORT__
import { USER_ROLE } from "../../utils/user-roles.js";
import { UnauthenticatedError, ConflictError, ERROR_CODES } from "../../errors/index.js";
import { prisma } from "../../utils/prisma.js";

import { hashPassword, verifyPassword } from "../../utils/password.js";
import { issueSession } from "./session.service.js";
import type { LoginInput, SignupInput } from "../../validators/auth.schema.js";
import type { Actor } from "../../types/auth.js";
__ACTION_IMPORT__

const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  emailVerified: true,
} as const;

/** Signup always creates a regular user; client-supplied roles never reach persistence. */
export async function signup(input: SignupInput) {
  const passwordHash = await hashPassword(input.password);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: USER_ROLE.USER,
        emailVerified: __EMAIL_VERIFIED_DEFAULT__,
      },
      select: publicSelect,
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      throw new ConflictError(
        "An account already exists for this email",
        ERROR_CODES.EMAIL_UNAVAILABLE,
      );
    throw error;
  }
  __SIGNUP_EMAIL__
  return { user, ...(await issueSession(user.id, passwordHash)) };
}

/** Credential checks avoid exposing whether an account exists. */
export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  let valid = false;
  if (user) {
    valid = await verifyPassword(input.password, user.passwordHash);
  } else {
    // Spend comparable password-hashing work even when the email has no account.
    await hashPassword(input.password);
  }
  if (!user || !valid || !user.active)
    throw new UnauthenticatedError("Invalid email or password", ERROR_CODES.INVALID_CREDENTIALS);
  __VERIFY_EMAIL_LOGIN__
  const { id, name, email, role, emailVerified } = user;
  return {
    user: { id, name, email, role, emailVerified },
    ...(await issueSession(id, user.passwordHash)),
  };
}

/** Password replacement revokes every session in the same database transaction. */
export async function changePassword(
  actor: Actor,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: actor.id } });
  if (!user || !(await verifyPassword(input.currentPassword, user.passwordHash)))
    throw new UnauthenticatedError(
      "Current password is incorrect",
      ERROR_CODES.INVALID_CREDENTIALS,
    );
  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: actor.id, passwordHash: user.passwordHash },
      data: { passwordHash },
    });
    if (updated.count !== 1)
      throw new ConflictError("Account changed. Please try again", ERROR_CODES.ACCOUNT_CHANGED);
    await tx.session.updateMany({
      where: { userId: actor.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
}
