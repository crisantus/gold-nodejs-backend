import { randomBytes } from "node:crypto";
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  rename,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { resolveOptions, type ProjectOptions } from "./options.js";
import { run } from "./process.js";
import { buildFiles } from "./renderer.js";

/** Render an app without installing packages, touching a database, or sending messages. */
export async function renderProject(
  input: ProjectOptions,
  secrets?: { jwt: string; cookie: string },
): Promise<Record<string, string>> {
  const options = resolveOptions(input);
  return buildFiles(
    options,
    secrets ?? {
      jwt: randomBytes(48).toString("hex"),
      cookie: randomBytes(48).toString("hex"),
    },
  );
}

/** Stage complete output and publish it atomically; existing projects are never overwritten. */
export async function createProject(
  input: ProjectOptions,
  parent: string,
  settings = { install: true, verify: true, git: true },
): Promise<string> {
  const options = resolveOptions(input);
  const root = resolve(parent);
  await access(root);
  const target = join(root, options.name);
  try {
    await lstat(target);
    throw new Error(
      `Destination already exists: ${target}. Choose a new folder.`,
    );
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
      throw error;
  }
  const stage = await mkdtemp(join(root, `.gold-${options.name}-`));
  let reserved = false;
  try {
    for (const [path, content] of Object.entries(
      await renderProject(options),
    )) {
      const destination = join(stage, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, content, {
        flag: "wx",
        mode: path === ".env" ? 0o600 : 0o644,
      });
    }
    await mkdir(target);
    reserved = true;
    await rename(stage, target);
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    if (reserved) await rmdir(target).catch(() => undefined);
    throw error;
  }
  console.log(`\nProject generated: ${target}`);
  try {
    if (settings.install) {
      await run("npm", ["install", "--no-audit", "--no-fund"], target);
      await run("npm", ["run", "prisma:generate"], target);
      await run("npm", ["run", "format"], target);
      if (options.docs !== "none")
        await run("npm", ["run", "docs:generate"], target);
      if (settings.verify) await run("npm", ["run", "verify"], target);
    }
    if (settings.git) await run("git", ["init", "--quiet"], target);
  } catch (error) {
    throw new Error(
      `Project was preserved at ${target}. Setup did not finish: ${error instanceof Error ? error.message : "command failed"} See SETUP.md to resume.`,
      { cause: error },
    );
  }
  console.log(
    `\nNext: cd ${options.name}\nRead SETUP.md, configure .env, then npm run doctor.\nRun migrations against your local database before npm run dev.`,
  );
  console.log(
    settings.install
      ? "Dependencies installed. Provider delivery and database connectivity have NOT been verified."
      : "Dependencies not installed. Run npm install and follow SETUP.md.",
  );
  return target;
}
