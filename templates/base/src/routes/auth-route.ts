import { Router } from "express";
import { authenticateUser } from "../middlewares/auth.js";
import { authLimiter } from "../middlewares/security.js";
import { validateBody } from "../middlewares/validate-request.js";
import {
  signupSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
} from "../validators/auth.schema.js";
import {
  signUpController,
  loginController,
  refreshController,
  logoutController,
  meController,
  changePasswordController,
} from "../controllers/auth.controller.js";
__ACTION_ROUTE_IMPORTS__

const router = Router();
/** Credential entrypoints are rate limited; account operations recheck the session. */
router.post("/sign-up", authLimiter, validateBody(signupSchema), signUpController);
router.post("/sign-in", authLimiter, validateBody(loginSchema), loginController);
router.post("/login", authLimiter, validateBody(loginSchema), loginController);
router.post("/refresh", authLimiter, validateBody(refreshSchema), refreshController);
router.post("/logout", authenticateUser, logoutController);
router.get("/me", authenticateUser, meController);
router.patch(
  "/password",
  authLimiter,
  authenticateUser,
  validateBody(changePasswordSchema),
  changePasswordController,
);
__ACTION_ROUTES__

export default router;
