import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  copyFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  globalInstallPrefix,
  installationArguments,
  manageInstallation,
  readInstalledBuild,
  updateInstallCommand,
} from "../src/installation.js";

const temporary: string[] = [];
afterEach(async () => {
  for (const directory of temporary.splice(0))
    await rm(directory, { recursive: true, force: true });
});
async function packageFixture(parent?: string) {
  const root =
    parent ?? (await mkdtemp(join(tmpdir(), "gold-installation-test-")));
  if (!parent) temporary.push(root);
  await mkdir(join(root, "dist"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "gold-backend", version: "0.1.0" }),
  );
  return root;
}

describe("installed revision and scoped package management", () => {
  it("reads matching build identity and tolerates missing/stale metadata", async () => {
    const root = await packageFixture();
    expect((await readInstalledBuild(root)).revision).toBeNull();
    await writeFile(
      join(root, "dist/build-info.json"),
      JSON.stringify({ version: "0.1.0", revision: "a".repeat(40) }),
    );
    expect((await readInstalledBuild(root)).revision).toBe("a".repeat(40));
    await writeFile(
      join(root, "dist/build-info.json"),
      JSON.stringify({ version: "9.0.0", revision: "b".repeat(40) }),
    );
    expect((await readInstalledBuild(root)).revision).toBeNull();
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({
        name: "gold-backend",
        version: "0.1.0",
        gitHead: "c".repeat(40),
      }),
    );
    expect((await readInstalledBuild(root)).revision).toBe("c".repeat(40));
  });
  it("targets the current global prefix and preserves backend paths", async () => {
    const root = "/tmp/gold-test-prefix/lib/node_modules/gold-backend";
    expect(globalInstallPrefix(root, "darwin")).toBe("/tmp/gold-test-prefix");
    expect(
      globalInstallPrefix("/tmp/source-checkout", "darwin"),
    ).toBeUndefined();
    expect(installationArguments("update", root)).toEqual([
      "install",
      "--global",
      "--install-links",
      "--prefix",
      "/tmp/gold-test-prefix",
      "github:crisantus/gold-nodejs-backend",
    ]);
    expect(installationArguments("uninstall", root)).toEqual([
      "uninstall",
      "--global",
      "--prefix",
      "/tmp/gold-test-prefix",
      "gold-backend",
    ]);
    const execute = vi.fn().mockResolvedValue(undefined);
    await manageInstallation(
      "uninstall",
      { root, version: "0.1.0", revision: null },
      execute,
    );
    expect(execute).toHaveBeenCalledWith(
      "npm",
      installationArguments("uninstall", root),
      process.cwd(),
    );
    expect(
      updateInstallCommand("/tmp/a prefix/lib/node_modules/gold-backend"),
    ).toContain("--prefix '/tmp/a prefix'");
  });
  it("stamps the package's own Git revision and ignores a parent's repository", async () => {
    const outer = await mkdtemp(join(tmpdir(), "gold-revision-test-"));
    temporary.push(outer);
    const root = await packageFixture(join(outer, "package"));
    await mkdir(join(root, "scripts"));
    await copyFile(
      resolve("scripts/build-info.mjs"),
      join(root, "scripts/build-info.mjs"),
    );
    execFileSync("git", ["init", "--quiet"], { cwd: outer });
    execFileSync("git", ["add", "."], { cwd: outer });
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Gold Tests",
        "-c",
        "user.email=gold-tests@example.invalid",
        "-c",
        "commit.gpgSign=false",
        "commit",
        "--quiet",
        "-m",
        "Fixture",
      ],
      { cwd: outer },
    );
    execFileSync(process.execPath, [join(root, "scripts/build-info.mjs")], {
      env: { ...process.env, npm_package_gitHead: "" },
    });
    expect(
      JSON.parse(await readFile(join(root, "dist/build-info.json"), "utf8"))
        .revision,
    ).toBeNull();
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    execFileSync("git", ["add", "."], { cwd: root });
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Gold Tests",
        "-c",
        "user.email=gold-tests@example.invalid",
        "-c",
        "commit.gpgSign=false",
        "commit",
        "--quiet",
        "-m",
        "Own fixture",
      ],
      { cwd: root },
    );
    const revision = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    execFileSync(process.execPath, [join(root, "scripts/build-info.mjs")]);
    expect(
      JSON.parse(await readFile(join(root, "dist/build-info.json"), "utf8")),
    ).toEqual({ version: "0.1.0", revision });
  });
});
