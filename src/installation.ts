import { readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { run } from "./process.js";

export const GITHUB_REPOSITORY = "crisantus/gold-nodejs-backend";
export const GIT_INSTALL_SOURCE = `github:${GITHUB_REPOSITORY}`;
export const PACKAGE_ROOT = fileURLToPath(new URL("../", import.meta.url));
export const revisionSchema = z
  .string()
  .regex(/^[a-f0-9]{40}$/i)
  .transform((value) => value.toLowerCase());
const packageSchema = z.object({
  name: z.literal("gold-backend"),
  version: z.string().regex(/^[0-9A-Za-z.+-]+$/),
  gitHead: revisionSchema.optional(),
});
const buildSchema = z.object({
  version: z.string(),
  revision: revisionSchema.nullable(),
});

export interface InstalledBuild {
  root: string;
  version: string;
  revision: string | null;
}

/** Read packaged build identity; missing revision metadata never prevents project creation. */
export async function readInstalledBuild(
  root = PACKAGE_ROOT,
): Promise<InstalledBuild> {
  const manifest = packageSchema.parse(
    JSON.parse(await readFile(join(root, "package.json"), "utf8")),
  );
  let revision = manifest.gitHead ?? null;
  try {
    const build = buildSchema.parse(
      JSON.parse(await readFile(join(root, "dist/build-info.json"), "utf8")),
    );
    if (build.version === manifest.version && build.revision)
      revision = build.revision;
  } catch {
    /* Older installations can still create projects and show the reinstall command. */
  }
  return { root, version: manifest.version, revision };
}

/** Infer an installed global prefix so custom-prefix installs update/uninstall themselves. */
export function globalInstallPrefix(
  root: string,
  platform = process.platform,
): string | undefined {
  const modules = dirname(root);
  if (basename(root) !== "gold-backend" || basename(modules) !== "node_modules")
    return undefined;
  const parent = dirname(modules);
  if (basename(parent) === "lib") return dirname(parent);
  if (platform === "win32") return parent;
  return undefined;
}

/** npm owns removal of the CLI; generated projects and databases are outside this operation. */
export function installationArguments(
  action: "update" | "uninstall",
  root = PACKAGE_ROOT,
): string[] {
  const args =
    action === "update"
      ? ["install", "--global", "--install-links"]
      : ["uninstall", "--global"];
  const prefix = globalInstallPrefix(root);
  if (prefix) args.push("--prefix", prefix);
  args.push(action === "update" ? GIT_INSTALL_SOURCE : "gold-backend");
  return args;
}

/** Quote only displayed shell commands; execution always uses an argument array. */
function displayArgument(argument: string): string {
  return /^[a-zA-Z0-9_@%+=:,./#-]+$/.test(argument)
    ? argument
    : `'${argument.replaceAll("'", "'\\''")}'`;
}
export function updateInstallCommand(root = PACKAGE_ROOT): string {
  return ["npm", ...installationArguments("update", root)]
    .map(displayArgument)
    .join(" ");
}

/** Explicit user commands update/remove the global tool through npm, without editing an app. */
export async function manageInstallation(
  action: "update" | "uninstall",
  build: InstalledBuild,
  execute: typeof run = run,
): Promise<void> {
  console.log(
    action === "update"
      ? "Updating the Gold Backend CLI from GitHub..."
      : "Removing the Gold Backend CLI...",
  );
  await execute(
    "npm",
    installationArguments(action, build.root),
    process.cwd(),
  );
  console.log(
    action === "update"
      ? "Gold Backend updated. Run gold-backend check-update to confirm the installed Git revision."
      : "Gold Backend CLI removed. Your generated backend projects and databases are retained.",
  );
}
