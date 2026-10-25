import type { Request, Response } from 'express';
import { listUsers } from '../services/admin.service.js';
import { sendResponse } from '../utils/send-response.js';
/** Keep HTTP pagination separate from the admin service. */
export async function listUsersController(req: Request, res: Response): Promise<void> { const { page, limit } = req.validated!.query as { page: number; limit: number }; const result = await listUsers(req.actor!, page, limit); sendResponse(res, { message: 'Users fetched', data: result.users, meta: { page, limit, total: result.total } }); }
