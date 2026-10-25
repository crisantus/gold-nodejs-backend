import type { Request, Response } from 'express';
import { registerDevice, removeDevice } from '../services/push.service.js';
import { sendResponse } from '../utils/send-response.js';
/** Register only under the authenticated account. */
export async function registerDeviceController(req: Request, res: Response): Promise<void> { await registerDevice(req.actor!.id, (req.validated!.body as { token: string }).token); sendResponse(res, { message: 'Device registered' }); }
/** Token deletion is scoped to the current user. */
export async function removeDeviceController(req: Request, res: Response): Promise<void> { await removeDevice(req.actor!.id, (req.validated!.body as { token: string }).token); sendResponse(res, { message: 'Device removed' }); }
