import { z } from "zod";
import type { ApiContract } from "./api-contracts.js";
import { paginationSchema } from "../validators/common.schema.js";
import { notificationIdSchema } from "../validators/notification.schema.js";
/** Response contracts for the selected feature; routers own HTTP registration. */
export const notificationContracts: ApiContract[] = [
  {
    method: "get",
    path: "/notifications",
    operationId: "listNotifications",
    tag: "Notifications",
    summary: "List your notifications and unread count",
    access: "user",
    query: paginationSchema,
    response: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        body: z.string(),
        readAt: z.string().nullable(),
        createdAt: z.string(),
      }),
    ),
  },
  {
    method: "patch",
    path: "/notifications/:id/read",
    operationId: "readNotification",
    tag: "Notifications",
    summary: "Mark your notification as read",
    access: "user",
    params: notificationIdSchema,
    response: z.unknown(),
  },
];
