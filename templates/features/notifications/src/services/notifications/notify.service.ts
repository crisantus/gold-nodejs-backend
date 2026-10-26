import type { NotificationInput, NotificationResult } from "./notification.types.js";
__NOTIFICATION_IMPORTS__

/** Persist selected inbox state first; a push failure must not discard notification history. */
export async function notifyUser(
  userId: string,
  notification: NotificationInput,
): Promise<NotificationResult> {
  __SAVE_NOTIFICATION__
  __SEND_NOTIFICATION__
}
