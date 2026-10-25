import { z } from "zod";

/** The wizard and CLI share one validated, secret-free configuration. */
export const projectSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(64)
      .regex(
        /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/,
        "Use lowercase letters, numbers, hyphens or underscores; start with a letter.",
      )
      .refine(
        (name) =>
          ![
            "node_modules",
            "con",
            "prn",
            "aux",
            "nul",
            ...Array.from({ length: 9 }, (_, n) => `com${n + 1}`),
            ...Array.from({ length: 9 }, (_, n) => `lpt${n + 1}`),
          ].includes(name),
        "Choose a different project name.",
      ),
    displayName: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(
        (value) =>
          [...value].every(
            (char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127,
          ),
        "Display names cannot contain control characters.",
      ),
    origins: z
      .string()
      .max(2048)
      .default("http://localhost:3000")
      .refine(
        (value) =>
          value.split(",").every((item) => {
            try {
              const url = new URL(item.trim());
              return (
                ["http:", "https:"].includes(url.protocol) &&
                url.origin === item.trim().replace(/\/$/, "")
              );
            } catch {
              return false;
            }
          }),
        "Use comma-separated HTTP(S) origins without paths or credentials.",
      )
      .transform((value) =>
        value
          .split(",")
          .map((item) => new URL(item.trim()).origin)
          .join(","),
      ),
    webAppUrl: z
      .string()
      .url()
      .regex(/^[^\r\n"]+$/)
      .default("http://localhost:3000"),
    port: z.coerce.number().int().min(1024).max(65535).default(5000),
    database: z.enum(["mysql", "postgresql"]).default("mysql"),
    roles: z.enum(["users", "admin"]).default("users"),
    clients: z.enum(["mobile", "browser", "both"]).default("both"),
    email: z.enum(["none", "preview", "smtp", "resend"]).default("none"),
    notifications: z.enum(["none", "push", "inbox", "both"]).default("none"),
    socket: z.boolean().default(false),
    uploads: z.boolean().default(false),
    docs: z.enum(["none", "swagger", "postman", "both"]).default("both"),
    verifyEmail: z.boolean().default(false),
    passwordReset: z.boolean().default(false),
    compose: z.boolean().default(false),
    docker: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if ((value.verifyEmail || value.passwordReset) && value.email === "none")
      ctx.addIssue({
        code: "custom",
        message:
          "Email verification and password reset require an email provider or local preview.",
        path: ["email"],
      });
  });
export type ProjectOptions = z.infer<typeof projectSchema>;

/** Apply defaults in one place so scripted and interactive creation agree. */
export function resolveOptions(input: unknown): ProjectOptions {
  return projectSchema.parse(input);
}
