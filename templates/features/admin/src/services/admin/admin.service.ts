import { USER_ROLE } from "../../utils/user-roles.js";
import { ForbiddenError, ERROR_CODES } from "../../errors/index.js";
import { prisma } from "../../utils/prisma.js";

import type { Actor } from "../../types/auth.js";
/** List selected public fields; service checks complement route authorization. */
export async function listUsers(actor: Actor, page: number, limit: number) {
  if (actor.role !== USER_ROLE.ADMIN)
    throw new ForbiddenError("This action requires an administrator", ERROR_CODES.FORBIDDEN);
  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, name: true, email: true, role: true, active: true, emailVerified: true },
    }),
    prisma.user.count(),
  ]);
  return { users, total };
}
