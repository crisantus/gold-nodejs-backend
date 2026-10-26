import { writeBuildInfo } from "./build-info.mjs";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const compiler = join(root, "node_modules/typescript/bin/tsc");

/** Stop installation if a child fails; never leave a seemingly usable CLI. */
function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Some npm versions pass global installation settings into Git preparation.
// Restore a local dependency tree before compiling when npm did not create it.
const required = [
  compiler,
  ...["@types/node", "@clack/prompts", "commander", "zod", "prettier"].map(
    (name) => join(root, "node_modules", name, "package.json"),
  ),
];
if (required.some((path) => !existsSync(path))) {
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error("Install Gold Backend using npm to prepare it.");
  run([
    npm,
    "ci",
    "--global=false",
    "--location=project",
    "--prefix",
    root,
    "--include=dev",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
  ]);
}

run([compiler, "-p", "tsconfig.build.json"]);

writeBuildInfo(root);
