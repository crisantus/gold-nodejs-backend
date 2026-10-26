#!/usr/bin/env node
import { createCli } from "./commands.js";
import { readInstalledBuild } from "./installation.js";

try {
  const build = await readInstalledBuild();
  await createCli(build).parseAsync();
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Gold Backend failed.",
  );
  process.exitCode = 1;
}
