import { env } from "../../../config/env.js";
import type { EmailContent } from "../types.js";

interface TemplateOptions {
  title: string;
  greeting?: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  footer?: string;
}

/** Escape every dynamic value; template callers supply plain text rather than trusted HTML. */
export function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character] ?? character);
}

/** Shared project branding, email-friendly table layout and a matching plain-text fallback. */
export function buildEmailTemplate({
  title,
  greeting = "Hello,",
  paragraphs,
  button,
  footer = "If you did not request this email, you can ignore it.",
}: TemplateOptions): EmailContent {
  const brand = escapeHtml(env.EMAIL_BRAND_NAME);
  const color = env.EMAIL_BRAND_COLOR;
  const logo = env.EMAIL_LOGO_URL
    ? `<img src="${escapeHtml(env.EMAIL_LOGO_URL)}" alt="${brand}" width="48" height="48" style="display:block;margin-bottom:12px;border:0;">`
    : "";
  const content = paragraphs
    .map((paragraph) => `<p style="line-height:1.6;">${escapeHtml(paragraph)}</p>`)
    .join("\n");
  const action = button
    ? `<p style="margin:28px 0;"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:${color};color:#fff;padding:14px 22px;text-decoration:none;border-radius:6px;">${escapeHtml(button.label)}</a></p><p style="word-break:break-all;">Or open this link: <a href="${escapeHtml(button.url)}">${escapeHtml(button.url)}</a></p>`
    : "";
  const text = [
    env.EMAIL_BRAND_NAME,
    title,
    greeting,
    ...paragraphs,
    ...(button ? [`${button.label}: ${button.url}`] : []),
    footer,
  ].join("\n\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#243047;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:10px;">
      <tr><td style="padding:32px;border-top:4px solid ${color};">
        ${logo}<p style="font-weight:bold;color:${color};">${brand}</p>
        <h1 style="font-size:26px;">${escapeHtml(title)}</h1><p>${escapeHtml(greeting)}</p>
        ${content}${action}
        <p style="border-top:1px solid #e3e6eb;padding-top:20px;font-size:13px;color:#596579;">${escapeHtml(footer)}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  return { subject: `${title} — ${env.EMAIL_BRAND_NAME}`, text, html };
}
