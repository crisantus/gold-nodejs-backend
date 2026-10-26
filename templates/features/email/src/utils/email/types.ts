/** Both HTML and text are generated together so every email has a readable fallback. */
export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}
export interface EmailMessage extends EmailContent {
  to: string;
}
export interface EmailResult {
  outcome: "accepted" | "previewed" | "skipped";
  previewPath?: string;
}
