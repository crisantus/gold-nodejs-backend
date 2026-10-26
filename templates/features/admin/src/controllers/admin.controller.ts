import { requireActor } from "../middlewares/auth.js";
import { validatedQuery } from "../middlewares/validate-request.js";
import { paginationSchema } from "../validators/common.schema.js";
import type { Request, Response } from "express";
import { listUsers } from "../services/admin/admin.service.js";
import { sendResponse } from "../utils/send-response.js";
/** Keep HTTP pagination separate from the admin service. */
export async function listUsersController(req: Request, res: Response): Promise<void> {
  const { page, limit } = validatedQuery(req, paginationSchema);
  const result = await listUsers(requireActor(req), page, limit);
  sendResponse(res, {
    message: "Users fetched",
    data: result.users,
    meta: { page, limit, total: result.total },
  });
}
