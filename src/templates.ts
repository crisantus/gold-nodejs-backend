import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const templates = fileURLToPath(new URL("../templates/", import.meta.url));

/** Load literal templates; only renderer-controlled placeholders are substituted. */
export async function readTemplates(
  folder: string,
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  const root = join(templates, folder);
  async function visit(path: string, prefix = ""): Promise<void> {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.isDirectory())
        await visit(join(path, entry.name), `${prefix}${entry.name}/`);
      else if (entry.isFile())
        files[`${prefix}${entry.name.replace(/\.tpl$/, "")}`] = await readFile(
          join(path, entry.name),
          "utf8",
        );
    }
  }
  await visit(root);
  return files;
}
