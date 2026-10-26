import { z } from "zod";
import type { ApiContract } from "./api-contracts.js";
import { paginationSchema } from "../validators/common.schema.js";
/** Response contracts for the selected feature; routers own HTTP registration. */
export const adminContracts: ApiContract[] = [
  {
    method: "get",
    path: "/admin/users",
    operationId: "listUsers",
    tag: "Administration",
    summary: "List users",
    access: "admin",
    query: paginationSchema,
    response: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        role: z.string(),
        active: z.boolean(),
        emailVerified: z.boolean(),
      }),
    ),
  },
];
