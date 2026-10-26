import { Router } from "express";
import { authenticateUser } from "../middlewares/auth.js";
import { validateQuery, validateParams } from "../middlewares/validate-request.js";
import { paginationSchema } from "../validators/common.schema.js";
import { notificationIdSchema } from "../validators/notification.schema.js";
import {
  listNotificationsController,
  readNotificationController,
} from "../controllers/notification.controller.js";
const router = Router();
/** Inbox endpoints use persisted ownership checks, not caller-supplied recipients. */
router.get("/", authenticateUser, validateQuery(paginationSchema), listNotificationsController);
router.patch(
  "/:id/read",
  authenticateUser,
  validateParams(notificationIdSchema),
  readNotificationController,
);
export default router;
