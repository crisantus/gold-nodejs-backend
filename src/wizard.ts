import * as p from "@clack/prompts";
import { resolveOptions, type ProjectOptions } from "./options.js";

function answer<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) {
    p.cancel("No project was created.");
    process.exit(0);
  }
  return value as Exclude<T, symbol>;
}

/** Collect only decisions that change the generated project. */
export async function wizard(
  name?: string,
  settings = { install: true, git: true },
): Promise<{ options: ProjectOptions; install: boolean; git: boolean }> {
  p.intro("Gold Backend · Create a clean backend");
  const projectName =
    name ??
    answer(
      await p.text({
        message: "Project name",
        placeholder: "my-backend",
        validate: (value) => {
          const result = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/.test(value ?? "");
          return result
            ? undefined
            : "Use lowercase letters, numbers, hyphens or underscores.";
        },
      }),
    );
  const displayName = answer(
    await p.text({
      message: "Application display name",
      initialValue: projectName.replace(/[-_]/g, " "),
    }),
  );
  const database = answer(
    await p.select({
      message: "Database",
      options: [
        { value: "mysql", label: "MySQL + Prisma" },
        { value: "postgresql", label: "PostgreSQL + Prisma" },
      ],
    }),
  );
  const roles = answer(
    await p.select({
      message: "Account roles (signup and JWT authentication are included)",
      options: [
        { value: "users", label: "Users only" },
        { value: "admin", label: "Users and administrators" },
      ],
    }),
  );
  const clients = answer(
    await p.select({
      message: "API clients",
      initialValue: "both",
      options: [
        { value: "mobile", label: "Mobile" },
        { value: "browser", label: "Browser" },
        { value: "both", label: "Both" },
      ],
    }),
  );
  const features = answer(
    await p.multiselect({
      message: "Additional features (Space selects; Enter continues)",
      required: false,
      initialValues: ["swagger", "postman"],
      options: [
        { value: "email", label: "Email" },
        { value: "notifications", label: "Notifications" },
        { value: "socket", label: "Socket.IO live updates" },
        { value: "uploads", label: "Cloudinary private uploads" },
        { value: "swagger", label: "Swagger UI" },
        { value: "postman", label: "Postman exports" },
        { value: "compose", label: "Local database with Docker Compose" },
        { value: "docker", label: "Production Dockerfile" },
      ],
    }),
  );
  const email = features.includes("email")
    ? answer(
        await p.select({
          message: "Email provider",
          options: [
            { value: "smtp", label: "SMTP" },
            { value: "resend", label: "Resend" },
            { value: "preview", label: "Local preview (no credentials)" },
          ],
        }),
      )
    : "none";
  const notifications = features.includes("notifications")
    ? answer(
        await p.select({
          message: "Notifications",
          options: [
            { value: "push", label: "Firebase push" },
            { value: "inbox", label: "In-app notification inbox" },
            { value: "both", label: "Both" },
          ],
        }),
      )
    : "none";
  const verifyEmail =
    email !== "none" &&
    answer(
      await p.confirm({
        message: "Require email verification?",
        initialValue: false,
      }),
    );
  const passwordReset =
    email !== "none" &&
    answer(
      await p.confirm({
        message: "Include password reset?",
        initialValue: true,
      }),
    );
  const port = answer(
    await p.text({
      message: "API port",
      initialValue: "5000",
      validate: (v) =>
        Number.isInteger(Number(v)) && Number(v) >= 1024 && Number(v) <= 65535
          ? undefined
          : "Enter a port from 1024 to 65535.",
    }),
  );
  const origins =
    clients !== "mobile"
      ? answer(
          await p.text({
            message: "Allowed browser origin (comma-separated for several)",
            initialValue: "http://localhost:3000",
          }),
        )
      : "http://localhost:3000";
  const webAppUrl =
    verifyEmail || passwordReset
      ? answer(
          await p.text({
            message: "Frontend URL for email action links",
            initialValue: "http://localhost:3000",
          }),
        )
      : "http://localhost:3000";
  const install =
    settings.install &&
    answer(
      await p.confirm({
        message: "Install dependencies and verify the project?",
        initialValue: true,
      }),
    );
  const git =
    settings.git &&
    answer(await p.confirm({ message: "Initialize Git?", initialValue: true }));
  const docs = features.includes("swagger")
    ? features.includes("postman")
      ? "both"
      : "swagger"
    : features.includes("postman")
      ? "postman"
      : "none";
  const options = resolveOptions({
    name: projectName,
    displayName,
    origins,
    webAppUrl,
    database,
    roles,
    clients,
    email,
    notifications,
    verifyEmail,
    passwordReset,
    port,
    docs,
    socket: features.includes("socket"),
    uploads: features.includes("uploads"),
    compose: features.includes("compose"),
    docker: features.includes("docker"),
  });
  p.note(
    Object.entries(options)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n"),
    "Project configuration",
  );
  if (
    !answer(
      await p.confirm({ message: "Create this project?", initialValue: true }),
    )
  ) {
    p.cancel("No project was created.");
    process.exit(0);
  }
  return { options, install, git };
}
