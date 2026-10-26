import { requireActor } from "../middlewares/auth.js";
import { validatedBody } from "../middlewares/validate-request.js";
import { deviceSchema } from "../validators/device.schema.js";
import type { Request, Response } from "express";
import { registerDevice, removeDevice } from "../services/notifications/device.service.js";
import { sendResponse } from "../utils/send-response.js";
/** Register only under the authenticated account. */
export async function registerDeviceController(req: Request, res: Response): Promise<void> {
  await registerDevice(requireActor(req).id, validatedBody(req, deviceSchema).token);
  sendResponse(res, { message: "Device registered" });
}
/** Token deletion is scoped to the current user. */
export async function removeDeviceController(req: Request, res: Response): Promise<void> {
  await removeDevice(requireActor(req).id, validatedBody(req, deviceSchema).token);
  sendResponse(res, { message: "Device removed" });
}
