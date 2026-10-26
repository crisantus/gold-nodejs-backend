import process from "node:process";
import { existsSync, readFileSync, writeFileSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const shaPattern = /^[a-f0-9]{40}$/i;

/** Record the package's own revision, never a parent project's unrelated Git HEAD. */
export function writeBuildInfo(directory = root) {
  const manifest = JSON.parse(
    readFileSync(join(directory, "package.json"), "utf8"),
  );
  let revision = manifest.gitHead ?? process.env.npm_package_gitHead ?? null;
  if (existsSync(join(directory, ".git"))) {
    try {
      revision = execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
        cwd: directory,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      revision = null;
    }
  }
  if (typeof revision !== "string" || !shaPattern.test(revision))
    revision = null;
  writeFileSync(
    join(directory, "dist/build-info.json"),
    `${JSON.stringify({ version: manifest.version, revision: revision?.toLowerCase() ?? null }, null, 2)}\n`,
  );
}

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
)
  writeBuildInfo();
