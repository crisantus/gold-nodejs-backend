import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import type { ApiContract } from "./api-contracts.js";
import { fileIdSchema } from "../validators/upload.schema.js";
/** Response contracts for the selected feature; routers own HTTP registration. */
export const uploadContracts: ApiContract[] = [
  {
    method: "post",
    path: "/files",
    operationId: "uploadFile",
    tag: "Files",
    summary: "Upload a private PNG, JPEG, WebP or PDF",
    access: "user",
    response: z.object({
      id: z.string(),
      format: z.string(),
      size: z.number(),
      createdAt: z.string(),
    }),
    statusCode: StatusCodes.CREATED,
  },
  {
    method: "get",
    path: "/files/:id/download",
    operationId: "downloadFile",
    tag: "Files",
    summary: "Create a short-lived private download link",
    access: "user",
    params: fileIdSchema,
    response: z.object({ url: z.string(), expiresAt: z.number() }),
  },
  {
    method: "delete",
    path: "/files/:id",
    operationId: "deleteFile",
    tag: "Files",
    summary: "Delete your private file",
    access: "user",
    params: fileIdSchema,
    response: z.unknown(),
  },
];
