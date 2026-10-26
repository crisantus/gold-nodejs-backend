import { buildEmailTemplate } from "./layout.js";

/** Render the selected one-time action without putting presentation code in the auth service. */
export function passwordResetEmailTemplate(url: string, expiresInMinutes: number) {
  return buildEmailTemplate({
    title: "Reset your password",
    paragraphs: [
      "We received a request to reset your password.",
      `This link expires in ${expiresInMinutes} minutes. Do not share it.`,
    ],
    button: { label: "Reset password", url },
  });
}
