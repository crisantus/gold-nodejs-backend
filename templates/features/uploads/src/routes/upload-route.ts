import { Router } from "express";
import { authenticateUser } from "../middlewares/auth.js";
import { authLimiter } from "../middlewares/security.js";
import { parseUpload } from "../middlewares/upload.js";
import { validateParams } from "../middlewares/validate-request.js";
import { fileIdSchema } from "../validators/upload.schema.js";
import {
  uploadController,
  downloadController,
  deleteFileController,
} from "../controllers/upload.controller.js";
const router = Router();
/** Authenticate before bounded multipart parsing; services enforce file ownership. */
router.post("/", authLimiter, authenticateUser, parseUpload, uploadController);
router.get("/:id/download", authenticateUser, validateParams(fileIdSchema), downloadController);
router.delete("/:id", authenticateUser, validateParams(fileIdSchema), deleteFileController);
export default router;
