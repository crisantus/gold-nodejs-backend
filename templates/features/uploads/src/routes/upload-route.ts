import { z } from 'zod';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import type { RouteDefinition } from './route-definition.js';
import { uploadController, downloadController, deleteFileController } from '../controllers/upload.controller.js';
const parser = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 0, parts: 1 } }).single('file');
const params = z.object({ id: z.string().uuid() });
/** Authorize before invoking bounded multipart parsing. */
export const uploadRoutes: RouteDefinition[] = [
  { method: 'post', path: '/files', operationId: 'uploadFile', tag: 'Files', summary: 'Upload a private PNG, JPEG, WebP or PDF', access: 'user', sensitive: true, middleware: [(req, res, next) => parser(req, res, (error: unknown) => { if (error) return next(new AppError(error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 413 : 400, 'UPLOAD_INVALID', 'Upload exceeds the allowed size, count or format')); next(); })], response: z.object({ id: z.string(), format: z.string(), size: z.number(), createdAt: z.string() }), statusCode: 201, handler: uploadController },
  { method: 'get', path: '/files/:id/download', operationId: 'downloadFile', tag: 'Files', summary: 'Create a short-lived private download link', access: 'user', params, response: z.object({ url: z.string(), expiresAt: z.number() }), handler: downloadController },
  { method: 'delete', path: '/files/:id', operationId: 'deleteFile', tag: 'Files', summary: 'Delete your private file', access: 'user', params, response: z.unknown(), handler: deleteFileController },
];
