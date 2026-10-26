import { z } from "zod";
import {
  GITHUB_REPOSITORY,
  revisionSchema,
  updateInstallCommand,
  type InstalledBuild,
} from "./installation.js";

const latestSchema = z.array(z.object({ sha: revisionSchema })).min(1);
const comparisonSchema = z.object({
  status: z.enum(["ahead", "behind", "identical", "diverged"]),
});
export type UpdateResult =
  | {
      status: "current" | "available" | "ahead" | "diverged";
      installed: string;
      latest: string;
    }
  | { status: "unavailable" }
  | { status: "unknown-installation" };

/** Check the default branch, including changes that keep package.json's version unchanged. */
export async function checkForUpdates(
  build: InstalledBuild,
  options: { fetcher?: typeof fetch; timeoutMs?: number } = {},
): Promise<UpdateResult> {
  if (!build.revision) return { status: "unknown-installation" };
  const fetcher = options.fetcher ?? fetch;
  // One deadline bounds both requests and body reads, keeping offline creation usable.
  const signal = AbortSignal.timeout(options.timeoutMs ?? 1800);
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": `gold-backend/${build.version}`,
  };
  const api = `https://api.github.com/repos/${GITHUB_REPOSITORY}`;
  try {
    const latestResponse = await fetcher(`${api}/commits?per_page=1`, {
      headers,
      signal,
    });
    if (!latestResponse.ok) return { status: "unavailable" };
    const commits = latestSchema.parse(await latestResponse.json());
    const latest = commits[0]?.sha;
    if (!latest) return { status: "unavailable" };
    const installed = build.revision;
    if (installed === latest) return { status: "current", installed, latest };
    const comparisonResponse = await fetcher(
      `${api}/compare/${installed}...${latest}?per_page=1`,
      { headers, signal },
    );
    if (!comparisonResponse.ok) return { status: "unavailable" };
    const comparison = comparisonSchema.parse(await comparisonResponse.json());
    const status =
      comparison.status === "ahead"
        ? "available"
        : comparison.status === "behind"
          ? "ahead"
          : comparison.status === "identical"
            ? "current"
            : "diverged";
    return { status, installed, latest };
  } catch {
    // Network, timeout, rate-limit and malformed responses must never block create.
    return { status: "unavailable" };
  }
}

/** Automation can opt out; an explicit check-update command still performs a check. */
export function automaticUpdateCheckEnabled(
  flags: { updateCheck?: unknown },
  env = process.env,
): boolean {
  const ci = env.CI && !["false", "0"].includes(env.CI.toLowerCase());
  return (
    flags.updateCheck !== false &&
    !ci &&
    !["1", "true"].includes(env.GOLD_BACKEND_NO_UPDATE_CHECK ?? "")
  );
}

/** Display trusted, fixed instructions; never execute commands returned by GitHub. */
export function printUpdateResult(
  build: InstalledBuild,
  result: UpdateResult,
  explicit = false,
  output: (message: string) => void = console.log,
): void {
  if (result.status === "current") {
    if (explicit)
      output(
        `Gold Backend is up to date with GitHub (${result.latest.slice(0, 8)}).`,
      );
    return;
  }
  if (result.status === "ahead") {
    if (explicit)
      output(
        "Your installed Git revision is ahead of GitHub's default branch; no newer update was found.",
      );
    return;
  }
  if (result.status === "unavailable") {
    output(
      "GitHub update check unavailable (offline, timeout, or rate limit). You can continue creating projects. Check later with: gold-backend check-update",
    );
    return;
  }
  if (result.status === "unknown-installation") {
    output(
      `This installation has no Git revision metadata. Update once to enable commit checks:\n  ${updateInstallCommand(build.root)}\nYou can continue using the installed version.`,
    );
    return;
  }
  const title =
    result.status === "available"
      ? "A Gold Backend update is available"
      : "GitHub's default branch has changed since this build";
  output(
    `\n${title} (${result.installed.slice(0, 8)} → ${result.latest.slice(0, 8)}).\nUpdate now:\n  gold-backend update\nOr run:\n  ${updateInstallCommand(build.root)}\nYou can ignore this notice and continue with your installed version.\n`,
  );
}
