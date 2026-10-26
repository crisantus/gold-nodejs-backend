import { requireActor } from "../middlewares/auth.js";
import { validatedQuery, validatedParams } from "../middlewares/validate-request.js";
import { paginationSchema } from "../validators/common.schema.js";
import { notificationIdSchema } from "../validators/notification.schema.js";
import type { Request, Response } from "express";
import { listNotifications, readNotification } from "../services/notifications/inbox.service.js";
import { sendResponse } from "../utils/send-response.js";
/** Return inbox items and unread count for the authenticated account. */
export async function listNotificationsController(req: Request, res: Response): Promise<void> {
  const { page, limit } = validatedQuery(req, paginationSchema);
  const result = await listNotifications(requireActor(req).id, page, limit);
  sendResponse(res, {
    message: "Notifications fetched",
    data: result.items,
    meta: { page, limit, unread: result.unread },
  });
}
/** Mark only a notification owned by this user. */
export async function readNotificationController(req: Request, res: Response): Promise<void> {
  await readNotification(requireActor(req).id, validatedParams(req, notificationIdSchema).id);
  sendResponse(res, { message: "Notification marked as read" });
}
