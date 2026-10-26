import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { env } from "../../config/env.js";
import { ServiceUnavailableError, ERROR_CODES } from "../../errors/index.js";
import type { EmailMessage, EmailResult } from "./types.js";

/** Preview files contain action secrets: keep them private, ignored and outside HTTP routes. */
export async function previewEmail(message: EmailMessage): Promise<EmailResult> {
  if (env.NODE_ENV === "production")
    throw new ServiceUnavailableError("Email is unavailable", ERROR_CODES.EMAIL_UNAVAILABLE);
  await mkdir(".mail-preview", { recursive: true, mode: 0o700 });
  const previewPath = `.mail-preview/${randomUUID()}.html`;
  await writeFile(previewPath, message.html, { mode: 0o600, flag: "wx" });
  return { outcome: "previewed", previewPath };
}
