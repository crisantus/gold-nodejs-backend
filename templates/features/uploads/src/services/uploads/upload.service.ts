import {
  BadRequestError,
  NotFoundError,
  ProviderError,
  ServiceUnavailableError,
  ERROR_CODES,
} from "../../errors/index.js";
import { v2 as cloudinary } from "cloudinary";
import { fileTypeFromBuffer } from "file-type";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { prisma } from "../../utils/prisma.js";

function provider() {
  if (!env.UPLOADS_ENABLED)
    throw new ServiceUnavailableError(
      "Uploads are not configured",
      ERROR_CODES.UPLOADS_UNAVAILABLE,
    );
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
    timeout: 15000,
  });
  return cloudinary;
}
/** Inspect actual bytes; a client-declared MIME type is not an authorization or type check. */
export async function detectAllowedFile(buffer: Buffer): Promise<{ ext: string; mime: string }> {
  let type;
  try {
    type = await fileTypeFromBuffer(buffer);
  } catch {
    throw new BadRequestError("The file is incomplete or invalid", ERROR_CODES.FILE_TYPE_INVALID);
  }
  if (!type || !["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(type.mime))
    throw new BadRequestError(
      "Only PNG, JPEG, WebP and PDF files are accepted",
      ERROR_CODES.FILE_TYPE_INVALID,
    );
  return type;
}
/** Upload private assets and compensate if storing their ownership fails. */
export async function uploadFile(userId: string, buffer: Buffer) {
  const type = await detectAllowedFile(buffer);
  const resourceType = type.mime === "application/pdf" ? "raw" : "image";
  const publicId = `__PROJECT_NAME__/private/${randomUUID()}${resourceType === "raw" ? `.${type.ext}` : ""}`;
  const client = provider();
  await new Promise<void>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: resourceType,
        type: "authenticated",
        overwrite: false,
        timeout: 15000,
      },
      (error) =>
        error
          ? reject(
              new ProviderError(
                "The upload provider could not accept the file",
                ERROR_CODES.UPLOAD_PROVIDER_ERROR,
              ),
            )
          : resolve(),
    );
    stream.on("error", () =>
      reject(
        new ProviderError(
          "The upload provider could not accept the file",
          ERROR_CODES.UPLOAD_PROVIDER_ERROR,
        ),
      ),
    );
    stream.end(buffer);
  });
  try {
    return await prisma.fileAsset.create({
      data: { userId, publicId, resourceType, format: type.ext, size: buffer.length },
      select: { id: true, format: true, size: true, createdAt: true },
    });
  } catch (error) {
    await client.uploader
      .destroy(publicId, { resource_type: resourceType, type: "authenticated" })
      .catch(() => console.error("Orphan upload cleanup failed; inspect private storage."));
    throw error;
  }
}
/** Signed downloads are created only after checking persisted ownership. */
export async function downloadFile(userId: string, id: string) {
  const asset = await prisma.fileAsset.findFirst({ where: { id, userId } });
  if (!asset) throw new NotFoundError("File was not found", ERROR_CODES.NOT_FOUND);
  const expiresAt = Math.floor(Date.now() / 1000) + 60;
  const url = provider().utils.private_download_url(asset.publicId, asset.format, {
    resource_type: asset.resourceType,
    type: "authenticated",
    expires_at: expiresAt,
    attachment: true,
  });
  return { url, expiresAt };
}
/** Removing a file cannot target another user's private object. */
export async function deleteFile(userId: string, id: string): Promise<void> {
  const asset = await prisma.fileAsset.findFirst({ where: { id, userId } });
  if (!asset) throw new NotFoundError("File was not found", ERROR_CODES.NOT_FOUND);
  try {
    await provider().uploader.destroy(asset.publicId, {
      resource_type: asset.resourceType,
      type: "authenticated",
    });
  } catch {
    throw new ProviderError(
      "The file provider could not complete the request",
      ERROR_CODES.UPLOAD_PROVIDER_ERROR,
    );
  }
  await prisma.fileAsset.delete({ where: { id } });
}
