import { describe, expect, it, vi } from "vitest";
import {
  checkForUpdates,
  automaticUpdateCheckEnabled,
  printUpdateResult,
} from "../src/updates.js";
import { createCli } from "../src/commands.js";
import type { InstalledBuild } from "../src/installation.js";
import { resolveOptions } from "../src/options.js";

const installed = "a".repeat(40);
const latest = "b".repeat(40);
const build: InstalledBuild = {
  root: "/tmp/gold-prefix/lib/node_modules/gold-backend",
  version: "0.1.0",
  revision: installed,
};
const response = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });

describe("GitHub revision checks", () => {
  it("does one request when the installed commit matches GitHub", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response([{ sha: installed }]));
    expect(await checkForUpdates(build, { fetcher })).toEqual({
      status: "current",
      installed,
      latest: installed,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://api.github.com/repos/crisantus/gold-nodejs-backend/commits?per_page=1",
    );
  });
  it.each([
    ["ahead", "available"],
    ["behind", "ahead"],
    ["diverged", "diverged"],
    ["identical", "current"],
  ] as const)(
    "handles GitHub comparison %s without relying on package version",
    async (status, expected) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(response([{ sha: latest }]))
        .mockResolvedValueOnce(response({ status }));
      expect(await checkForUpdates(build, { fetcher })).toEqual({
        status: expected,
        installed,
        latest,
      });
      expect(fetcher.mock.calls[1]?.[0]).toContain(
        `/compare/${installed}...${latest}`,
      );
    },
  );
  it("does not label an unavailable or malformed check as up to date", async () => {
    for (const value of [
      new Response("rate limit", { status: 403 }),
      response([]),
      response([{ sha: "untrusted terminal text" }]),
    ]) {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(value);
      expect(await checkForUpdates(build, { fetcher })).toEqual({
        status: "unavailable",
      });
    }
    expect(
      await checkForUpdates(build, {
        fetcher: vi
          .fn<typeof fetch>()
          .mockRejectedValue(new Error("private network detail")),
      }),
    ).toEqual({ status: "unavailable" });
    const missingComparison = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response([{ sha: latest }]))
      .mockResolvedValueOnce(new Response("missing", { status: 404 }));
    expect(
      await checkForUpdates(build, { fetcher: missingComparison }),
    ).toEqual({ status: "unavailable" });
  });
  it("bounds the whole check with an abort signal", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        }),
    );
    expect(await checkForUpdates(build, { fetcher, timeoutMs: 10 })).toEqual({
      status: "unavailable",
    });
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });
  it("handles old installations with no revision metadata without a network call", async () => {
    const fetcher = vi.fn<typeof fetch>();
    expect(
      await checkForUpdates({ ...build, revision: null }, { fetcher }),
    ).toEqual({ status: "unknown-installation" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("shows fixed update commands and an explicit option to continue", () => {
    const output = vi.fn();
    printUpdateResult(
      build,
      { status: "available", installed, latest },
      false,
      output,
    );
    const message = output.mock.calls[0]?.[0];
    expect(message).toContain("gold-backend update");
    expect(message).toContain(
      "npm install --global --install-links --prefix /tmp/gold-prefix github:crisantus/gold-nodejs-backend",
    );
    expect(message).toContain("ignore this notice");
  });
});

describe("CLI update notices and management commands", () => {
  function fixture(status: "available" | "unavailable" = "available") {
    const check = vi
      .fn<typeof checkForUpdates>()
      .mockResolvedValue(
        status === "available" ? { status, installed, latest } : { status },
      );
    const create = vi.fn().mockResolvedValue("/tmp/example");
    const output = vi.fn();
    const wizard = vi.fn().mockResolvedValue({
      options: resolveOptions({ name: "example", displayName: "Example" }),
      install: false,
      git: false,
    });
    const manage = vi.fn().mockResolvedValue(undefined);
    const setExitCode = vi.fn();
    const cli = createCli(build, {
      checkForUpdates: check,
      createProject: create,
      wizard,
      manageInstallation: manage,
      output,
      setExitCode,
      interactive: true,
      env: {},
    });
    return { cli, check, create, output, wizard, manage, setExitCode };
  }
  it("shows an update before the wizard, and still creates with the installed version", async () => {
    const f = fixture();
    await f.cli.parseAsync([
      "node",
      "gold-backend",
      "create",
      "example",
      "--no-install",
      "--no-git",
    ]);
    expect(f.output.mock.invocationCallOrder[0]).toBeLessThan(
      f.wizard.mock.invocationCallOrder[0] ?? Infinity,
    );
    expect(f.create).toHaveBeenCalledOnce();
    expect(f.manage).not.toHaveBeenCalled();
  });
  it("continues noninteractive creation when the check fails", async () => {
    const f = fixture("unavailable");
    await f.cli.parseAsync([
      "node",
      "gold-backend",
      "create",
      "example",
      "--yes",
      "--no-install",
      "--no-git",
    ]);
    expect(f.create).toHaveBeenCalledOnce();
    expect(f.output.mock.calls[0]?.[0]).toContain("unavailable");
    expect(f.setExitCode).not.toHaveBeenCalled();
  });
  it("also contains unexpected checker failures", async () => {
    const f = fixture();
    f.check.mockRejectedValue(new Error("network internals"));
    await f.cli.parseAsync([
      "node",
      "gold-backend",
      "create",
      "example",
      "--yes",
    ]);
    expect(f.create).toHaveBeenCalledOnce();
  });
  it("offers an explicit offline flag and validates options before checking", async () => {
    const f = fixture();
    await f.cli.parseAsync([
      "node",
      "gold-backend",
      "create",
      "example",
      "--yes",
      "--no-update-check",
    ]);
    expect(f.check).not.toHaveBeenCalled();
    const bad = fixture();
    await expect(
      bad.cli.parseAsync([
        "node",
        "gold-backend",
        "create",
        "../escape",
        "--yes",
      ]),
    ).rejects.toThrow();
    expect(bad.check).not.toHaveBeenCalled();
    expect(bad.create).not.toHaveBeenCalled();
  });
  it.each(["update", "uninstall"] as const)(
    "runs the explicit %s command without generating a project",
    async (action) => {
      const f = fixture();
      await f.cli.parseAsync(["node", "gold-backend", action]);
      expect(f.manage).toHaveBeenCalledWith(action, build);
      expect(f.create).not.toHaveBeenCalled();
      expect(f.check).not.toHaveBeenCalled();
    },
  );
  it("reports check-update failures without claiming no update exists", async () => {
    const f = fixture("unavailable");
    await f.cli.parseAsync(["node", "gold-backend", "check-update"]);
    expect(f.setExitCode).toHaveBeenCalledWith(1);
  });
  it.each([
    { CI: "true" },
    { CI: "1" },
    { GOLD_BACKEND_NO_UPDATE_CHECK: "1" },
    { GOLD_BACKEND_NO_UPDATE_CHECK: "true" },
  ])("skips automatic checks for %j", (env) => {
    expect(automaticUpdateCheckEnabled({}, env)).toBe(false);
  });
  it("keeps optional checks enabled normally and disabled with the flag", () => {
    expect(automaticUpdateCheckEnabled({}, {})).toBe(true);
    expect(automaticUpdateCheckEnabled({}, { CI: "false" })).toBe(true);
    expect(automaticUpdateCheckEnabled({ updateCheck: false }, {})).toBe(false);
  });
});
