import type { RequestHandler } from "express";
import multer from "multer";
import { env } from "../config/env.js";
import { BadRequestError, PayloadTooLargeError, ERROR_CODES } from "../errors/index.js";

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 0, parts: 1 },
}).single("file");
/** Authentication runs first; this middleware then bounds and validates the multipart request. */
export const parseUpload: RequestHandler = (req, res, next) => {
  parser(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new PayloadTooLargeError("Upload exceeds the allowed size", ERROR_CODES.UPLOAD_INVALID));
      return;
    }
    next(
      new BadRequestError("Upload exceeds the allowed count or format", ERROR_CODES.UPLOAD_INVALID),
    );
  });
};
