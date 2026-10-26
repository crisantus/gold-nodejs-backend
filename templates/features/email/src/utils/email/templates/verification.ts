import { buildEmailTemplate } from "./layout.js";

/** Render the selected one-time action without putting presentation code in the auth service. */
export function verificationEmailTemplate(url: string, expiresInMinutes: number) {
  return buildEmailTemplate({
    title: "Verify your email",
    paragraphs: [
      "Thanks for signing up. Confirm your email address to continue.",
      `This link expires in ${expiresInMinutes} minutes. Do not share it.`,
    ],
    button: { label: "Verify email", url },
  });
}
