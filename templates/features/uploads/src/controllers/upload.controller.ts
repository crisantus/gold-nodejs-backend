import { requireActor } from "../middlewares/auth.js";
import { validatedParams } from "../middlewares/validate-request.js";
import { fileIdSchema } from "../validators/upload.schema.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, ERROR_CODES } from "../errors/index.js";
import type { Request, Response } from "express";
import { uploadFile, downloadFile, deleteFile } from "../services/uploads/upload.service.js";
import { sendResponse } from "../utils/send-response.js";

/** Multipart parsing is bounded before buffering and requires an authenticated user. */
export async function uploadController(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new BadRequestError("Choose a file to upload", ERROR_CODES.FILE_REQUIRED);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    message: "File uploaded",
    data: await uploadFile(requireActor(req).id, req.file.buffer),
  });
}
/** Return an expiring link, not a permanent provider URL. */
export async function downloadController(req: Request, res: Response): Promise<void> {
  sendResponse(res, {
    message: "Download link created",
    data: await downloadFile(requireActor(req).id, validatedParams(req, fileIdSchema).id),
  });
}
/** Preserve provider failure information internally while returning a safe error. */
export async function deleteFileController(req: Request, res: Response): Promise<void> {
  await deleteFile(requireActor(req).id, validatedParams(req, fileIdSchema).id);
  sendResponse(res, { message: "File deleted" });
}
