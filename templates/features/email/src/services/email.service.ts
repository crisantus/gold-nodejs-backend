import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
__MAIL_IMPORT__

export interface EmailMessage { to: string; subject: string; text: string; html: string; }
export type EmailResult = { outcome: 'accepted' | 'previewed' | 'skipped'; previewPath?: string };
__MAIL_CLIENT__

/** Escape values before inserting names or links into HTML templates. */
export function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }

/** Report provider acceptance or local preview honestly; no public arbitrary-send route exists. */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  if (!env.EMAIL_ENABLED) return { outcome: 'skipped' };
  __MAIL_SEND__
}

/** A connectivity check sends nothing and cannot establish final delivery. */
export async function checkEmailConnection(): Promise<string> { __MAIL_CHECK__ }

/** Local preview files contain secrets and are private, ignored, and never served by HTTP. */
export async function preview(message: EmailMessage): Promise<EmailResult> {
  if (env.NODE_ENV === 'production') throw new AppError(503, 'EMAIL_UNAVAILABLE', 'Email is unavailable');
  await mkdir('.mail-preview', { recursive: true, mode: 0o700 });
  const previewPath = `.mail-preview/${randomUUID()}.html`;
  await writeFile(previewPath, message.html, { mode: 0o600, flag: 'wx' });
  return { outcome: 'previewed', previewPath };
}
