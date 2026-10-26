import { z } from "zod";
import type { ApiContract } from "./api-contracts.js";
import { deviceSchema } from "../validators/device.schema.js";
/** Response contracts for the selected feature; routers own HTTP registration. */
export const deviceContracts: ApiContract[] = [
  {
    method: "post",
    path: "/devices",
    operationId: "registerDevice",
    tag: "Notifications",
    summary: "Register this device",
    access: "user",
    body: deviceSchema,
    response: z.unknown(),
  },
  {
    method: "delete",
    path: "/devices",
    operationId: "removeDevice",
    tag: "Notifications",
    summary: "Remove this device",
    access: "user",
    body: deviceSchema,
    response: z.unknown(),
  },
];
