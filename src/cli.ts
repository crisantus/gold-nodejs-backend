#!/usr/bin/env node
import { Command } from "commander";
import { createProject } from "./generator.js";
import { resolveOptions } from "./options.js";
import { wizard } from "./wizard.js";
import { doctor } from "./doctor.js";

const cli = new Command()
  .name("gold_backend")
  .description("Create clean Express + Prisma backends with Gold conventions.")
  .version("0.1.0");
cli
  .command("create [name]")
  .description(
    "Create an independent backend using the wizard or explicit flags.",
  )
  .option("-y, --yes", "Use defaults and explicit flags without a wizard")
  .option("--directory <parent>", "Parent directory", process.cwd())
  .option(
    "--origins <origins>",
    "Allowed browser origins",
    "http://localhost:3000",
  )
  .option(
    "--web-app-url <url>",
    "Frontend action-link URL",
    "http://localhost:3000",
  )
  .option("--display-name <name>")
  .option("--port <port>", "API port", "5000")
  .option("--database <provider>", "mysql or postgresql", "mysql")
  .option("--roles <roles>", "users or admin", "users")
  .option("--clients <clients>", "mobile, browser or both", "both")
  .option("--email <provider>", "none, preview, smtp or resend", "none")
  .option("--notifications <mode>", "none, push, inbox or both", "none")
  .option("--docs <mode>", "none, swagger, postman or both", "both")
  .option("--socket", "Include Socket.IO")
  .option("--uploads", "Include private Cloudinary uploads")
  .option("--verify-email", "Require verified email")
  .option("--password-reset", "Include email password reset")
  .option("--compose", "Include local database Compose service")
  .option("--docker", "Include production Dockerfile")
  .option("--no-install", "Generate files without installing packages")
  .option("--no-verify", "Skip generated-project verification")
  .option("--no-git", "Skip Git initialization")
  .action(async (name: string | undefined, flags: Record<string, unknown>) => {
    if (!flags.yes && !process.stdin.isTTY)
      throw new Error(
        "Use --yes and a project name in a noninteractive terminal.",
      );
    const result = flags.yes
      ? {
          options: resolveOptions({
            ...flags,
            name,
            displayName: flags.displayName ?? name,
          }),
          install: flags.install !== false,
          git: flags.git !== false,
        }
      : await wizard(name, {
          install: flags.install !== false,
          git: flags.git !== false,
        });
    await createProject(result.options, String(flags.directory), {
      install: result.install,
      verify: flags.verify !== false,
      git: result.git,
    });
  });
cli
  .command("doctor")
  .description("Check local prerequisites without sending messages.")
  .action(async () => {
    if (!(await doctor())) process.exitCode = 1;
  });
try {
  await cli.parseAsync();
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Gold Backend failed.",
  );
  process.exitCode = 1;
}
