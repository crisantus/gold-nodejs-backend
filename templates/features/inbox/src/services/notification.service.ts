import { prisma } from '../utils/prisma.js';
import { AppError } from '../errors/app-error.js';

/** Persist important notification state independently from push or socket delivery. */
export async function createNotification(userId: string, input: { title: string; body: string }) { return prisma.notification.create({ data: { userId, title: input.title, body: input.body } }); }
/** Inbox queries always include ownership and a bounded page size. */
export async function listNotifications(userId: string, page: number, limit: number) {
  const [items, unread] = await prisma.$transaction([prisma.notification.findMany({ where: { userId }, skip: (page - 1) * limit, take: limit, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, title: true, body: true, readAt: true, createdAt: true } }), prisma.notification.count({ where: { userId, readAt: null } })]);
  return { items, unread };
}
/** A guessed notification ID cannot change another user's inbox. */
export async function readNotification(userId: string, id: string): Promise<void> { const updated = await prisma.notification.updateMany({ where: { userId, id }, data: { readAt: new Date() } }); if (!updated.count) throw new AppError(404, 'NOT_FOUND', 'Notification was not found'); }
