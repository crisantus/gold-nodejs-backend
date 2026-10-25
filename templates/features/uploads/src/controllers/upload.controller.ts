import type { Request, Response } from 'express';
import { uploadFile, downloadFile, deleteFile } from '../services/upload.service.js';
import { sendResponse } from '../utils/send-response.js';
import { AppError } from '../errors/app-error.js';
/** Multipart parsing is bounded before buffering and requires an authenticated user. */
export async function uploadController(req: Request, res: Response): Promise<void> { if (!req.file) throw new AppError(400, 'FILE_REQUIRED', 'Choose a file to upload'); sendResponse(res, { statusCode: 201, message: 'File uploaded', data: await uploadFile(req.actor!.id, req.file.buffer) }); }
/** Return an expiring link, not a permanent provider URL. */
export async function downloadController(req: Request, res: Response): Promise<void> { sendResponse(res, { message: 'Download link created', data: await downloadFile(req.actor!.id, (req.validated!.params as { id: string }).id) }); }
/** Preserve provider failure information internally while returning a safe error. */
export async function deleteFileController(req: Request, res: Response): Promise<void> { await deleteFile(req.actor!.id, (req.validated!.params as { id: string }).id); sendResponse(res, { message: 'File deleted' }); }
