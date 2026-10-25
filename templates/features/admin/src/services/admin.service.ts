import { prisma } from '../utils/prisma.js';
import { AppError } from '../errors/app-error.js';
import type { Actor } from '../types/auth.js';
/** List selected public fields; service checks complement route authorization. */
export async function listUsers(actor: Actor, page: number, limit: number) {
  if (actor.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'This action requires an administrator');
  const [users, total] = await prisma.$transaction([prisma.user.findMany({ skip: (page - 1) * limit, take: limit, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, name: true, email: true, role: true, active: true, emailVerified: true } }), prisma.user.count()]);
  return { users, total };
}
