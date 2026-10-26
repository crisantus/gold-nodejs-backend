import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { format } from "prettier";
import { backendFormatting } from "../src/formatting.js";

const check = process.argv.includes("--check");
const root = fileURLToPath(new URL("../templates/", import.meta.url));
let changed = 0;
async function visit(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }
    const filepath = path.replace(/\.tpl$/, "");
    if (!/\.(?:ts|js|json|md|ya?ml)$/.test(filepath)) continue;
    const content = await readFile(path, "utf8");
    const formatted = (
      await format(content, { ...backendFormatting, filepath })
    ).replace(/^(\s*__[A-Z][A-Z0-9_]+__)[;,]$/gm, "$1");
    if (formatted === content) continue;
    changed++;
    if (check) console.error(`Template needs formatting: ${path}`);
    else await writeFile(path, formatted);
  }
}
await visit(root);
if (check && changed) process.exitCode = 1;
console.log(
  check ? "Template formatting checked." : `Formatted ${changed} templates.`,
);
