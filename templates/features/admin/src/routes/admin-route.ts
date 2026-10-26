import { requireRole } from "../middlewares/role.js";
import { USER_ROLE } from "../utils/user-roles.js";
import { Router } from "express";
import { authenticateUser } from "../middlewares/auth.js";
import { validateQuery } from "../middlewares/validate-request.js";
import { paginationSchema } from "../validators/common.schema.js";
import { listUsersController } from "../controllers/admin.controller.js";
const router = Router();
/** Administrative routes require the current persisted role, not a signup parameter. */
router.get(
  "/users",
  authenticateUser,
  requireRole([USER_ROLE.ADMIN]),
  validateQuery(paginationSchema),
  listUsersController,
);
export default router;
