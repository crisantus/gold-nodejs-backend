import { env } from "../../config/env.js";
import type { EmailMessage, EmailResult } from "./types.js";
__MAIL_IMPORT__
__MAIL_ERROR_IMPORT__
__MAIL_CLIENT__

/** Send through the selected provider; acceptance is distinct from delivery to an inbox. */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  if (!env.EMAIL_ENABLED) return { outcome: "skipped" };
  __MAIL_SEND__
}

/** An explicit connectivity check sends no email and cannot establish inbox delivery. */
export async function checkEmailConnection(): Promise<string> {
  __MAIL_CHECK__
}
