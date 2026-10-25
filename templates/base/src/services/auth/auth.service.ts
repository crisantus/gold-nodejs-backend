import { prisma } from '../../utils/prisma.js';
import { AppError } from '../../errors/app-error.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { issueSession } from './session.service.js';
import type { LoginInput, SignupInput } from '../../validators/auth.schema.js';
import type { Actor } from '../../types/auth.js';
__ACTION_IMPORT__

const publicSelect = { id: true, name: true, email: true, role: true, emailVerified: true } as const;

/** Signup always creates a regular user; client-supplied roles never reach persistence. */
export async function signup(input: SignupInput) {
  const passwordHash = await hashPassword(input.password);
  let user;
  try { user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash, role: 'user', emailVerified: __EMAIL_VERIFIED_DEFAULT__ }, select: publicSelect }); }
  catch (error) { if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') throw new AppError(409, 'EMAIL_UNAVAILABLE', 'An account already exists for this email'); throw error; }
  __SIGNUP_EMAIL__
  return { user, ...await issueSession(user.id, passwordHash) };
}

/** Credential checks avoid exposing whether an account exists. */
export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = user ? await verifyPassword(input.password, user.passwordHash) : (await hashPassword(input.password), false);
  if (!user || !valid || !user.active) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  __VERIFY_EMAIL_LOGIN__
  const { id, name, email, role, emailVerified } = user;
  return { user: { id, name, email, role, emailVerified }, ...await issueSession(id, user.passwordHash) };
}

/** Password replacement revokes every session in the same database transaction. */
export async function changePassword(actor: Actor, input: { currentPassword: string; newPassword: string }): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: actor.id } });
  if (!user || !await verifyPassword(input.currentPassword, user.passwordHash)) throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({ where: { id: actor.id, passwordHash: user.passwordHash }, data: { passwordHash } });
    if (updated.count !== 1) throw new AppError(409, 'ACCOUNT_CHANGED', 'Account changed. Please try again');
    await tx.session.updateMany({ where: { userId: actor.id, revokedAt: null }, data: { revokedAt: new Date() } });
  });
}
