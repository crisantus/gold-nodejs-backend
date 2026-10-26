import { Router } from "express";
import { authenticateUser } from "../middlewares/auth.js";
import { authLimiter } from "../middlewares/security.js";
import { validateBody } from "../middlewares/validate-request.js";
import { deviceSchema } from "../validators/device.schema.js";
import {
  registerDeviceController,
  removeDeviceController,
} from "../controllers/device.controller.js";
const router = Router();
/** Device registration never accepts a target user ID. */
router.post(
  "/",
  authLimiter,
  authenticateUser,
  validateBody(deviceSchema),
  registerDeviceController,
);
router.delete("/", authenticateUser, validateBody(deviceSchema), removeDeviceController);
export default router;
