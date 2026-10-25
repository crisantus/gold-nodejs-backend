import type { Request, Response } from 'express';
import { listNotifications, readNotification } from '../services/notification.service.js';
import { sendResponse } from '../utils/send-response.js';
/** Return inbox items and unread count for the authenticated account. */
export async function listNotificationsController(req: Request, res: Response): Promise<void> { const { page, limit } = req.validated!.query as { page: number; limit: number }; const result = await listNotifications(req.actor!.id, page, limit); sendResponse(res, { message: 'Notifications fetched', data: result.items, meta: { page, limit, unread: result.unread } }); }
/** Mark only a notification owned by this user. */
export async function readNotificationController(req: Request, res: Response): Promise<void> { await readNotification(req.actor!.id, (req.validated!.params as { id: string }).id); sendResponse(res, { message: 'Notification marked as read' }); }
