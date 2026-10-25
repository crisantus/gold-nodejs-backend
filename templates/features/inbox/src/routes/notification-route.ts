import { z } from 'zod';
import type { RouteDefinition } from './route-definition.js';
import { listNotificationsController, readNotificationController } from '../controllers/notification.controller.js';
/** Inbox endpoints use persisted ownership checks, not caller-supplied recipients. */
export const notificationRoutes: RouteDefinition[] = [
  { method: 'get', path: '/notifications', operationId: 'listNotifications', tag: 'Notifications', summary: 'List your notifications and unread count', access: 'user', query: z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }), response: z.array(z.object({ id: z.string(), title: z.string(), body: z.string(), readAt: z.string().nullable(), createdAt: z.string() })), handler: listNotificationsController },
  { method: 'patch', path: '/notifications/:id/read', operationId: 'readNotification', tag: 'Notifications', summary: 'Mark your notification as read', access: 'user', params: z.object({ id: z.string().uuid() }), response: z.unknown(), handler: readNotificationController },
];
