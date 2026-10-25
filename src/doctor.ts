import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

/** Inspect local prerequisites without connecting to providers or printing secrets. */
export async function doctor(directory = process.cwd()): Promise<boolean> {
  const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
  const supported = major >= 24 || (major === 22 && minor >= 12);
  console.log(
    `${supported ? "OK" : "FAIL"} Node ${process.versions.node} (Node 24 LTS recommended)`,
  );
  try {
    const config = JSON.parse(
      await readFile(resolve(directory, "gold.config.json"), "utf8"),
    ) as { name?: string; database?: string };
    console.log(
      `OK Gold project: ${config.name ?? "unnamed"} (${config.database ?? "unknown database"})`,
    );
    await access(resolve(directory, ".env"));
    console.log(
      "OK .env exists. Run npm run doctor inside this project for configuration checks.",
    );
  } catch {
    console.log(
      "INFO No generated project detected here. Use gold_backend create.",
    );
  }
  return supported;
}
