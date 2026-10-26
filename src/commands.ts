import { Command } from "commander";
import { createProject } from "./generator.js";
import { resolveOptions } from "./options.js";
import { wizard } from "./wizard.js";
import { doctor } from "./doctor.js";

import {
  checkForUpdates,
  printUpdateResult,
  automaticUpdateCheckEnabled,
} from "./updates.js";
import { manageInstallation, type InstalledBuild } from "./installation.js";

interface CommandActions {
  createProject: typeof createProject;
  wizard: typeof wizard;
  doctor: typeof doctor;
  checkForUpdates: typeof checkForUpdates;
  manageInstallation: typeof manageInstallation;
  output: (message: string) => void;
  setExitCode: (code: number) => void;
  env: NodeJS.ProcessEnv;
  interactive: boolean;
}

/** Assemble commands separately from process startup so behavior can be tested without installing globally. */
export function createCli(
  build: InstalledBuild,
  overrides: Partial<CommandActions> = {},
): Command {
  const actions: CommandActions = {
    createProject,
    wizard,
    doctor,
    checkForUpdates,
    manageInstallation,
    output: console.log,
    setExitCode: (code) => {
      process.exitCode = code;
    },
    env: process.env,
    interactive: Boolean(process.stdin.isTTY),
    ...overrides,
  };
  const cli = new Command()
    .name("gold-backend")
    .description(
      "Create clean Express + Prisma backends with Gold conventions.",
    )
    .version(build.version);
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
    .option("--no-update-check", "Skip the optional GitHub update notice")
    .action(
      async (name: string | undefined, flags: Record<string, unknown>) => {
        if (!flags.yes && !actions.interactive)
          throw new Error(
            "Use --yes and a project name in a noninteractive terminal.",
          );
        const initialOptions = flags.yes
          ? resolveOptions({
              ...flags,
              name,
              displayName: flags.displayName ?? name,
            })
          : undefined;
        if (automaticUpdateCheckEnabled(flags, actions.env)) {
          const result = await actions
            .checkForUpdates(build)
            .catch(() => ({ status: "unavailable" as const }));
          printUpdateResult(build, result, false, actions.output);
        }
        const result = initialOptions
          ? {
              options: initialOptions,
              install: flags.install !== false,
              git: flags.git !== false,
            }
          : await actions.wizard(name, {
              install: flags.install !== false,
              git: flags.git !== false,
            });
        await actions.createProject(result.options, String(flags.directory), {
          install: result.install,
          verify: flags.verify !== false,
          git: result.git,
        });
      },
    );
  cli
    .command("doctor")
    .description("Check local prerequisites without sending messages.")
    .action(async () => {
      if (!(await actions.doctor())) actions.setExitCode(1);
    });

  cli
    .command("check-update")
    .description(
      "Check GitHub for a newer CLI revision without installing anything.",
    )
    .action(async () => {
      const result = await actions
        .checkForUpdates(build)
        .catch(() => ({ status: "unavailable" as const }));
      printUpdateResult(build, result, true, actions.output);
      if (
        result.status === "unavailable" ||
        result.status === "unknown-installation"
      )
        actions.setExitCode(1);
    });
  cli
    .command("update")
    .description(
      "Update the globally installed Gold CLI from GitHub; keep generated projects.",
    )
    .action(async () => {
      await actions.manageInstallation("update", build);
    });
  cli
    .command("uninstall")
    .description(
      "Remove the globally installed Gold CLI; keep generated projects and databases.",
    )
    .action(async () => {
      await actions.manageInstallation("uninstall", build);
    });
  return cli;
}
