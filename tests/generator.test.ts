import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
  mkdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProject, renderProject } from "../src/generator.js";
import { resolveOptions } from "../src/options.js";

const temporary: string[] = [];
afterEach(async () => {
  for (const path of temporary.splice(0))
    await rm(path, { recursive: true, force: true });
});
describe("configuration and output safety", () => {
  it.each([
    "../escape",
    "/absolute",
    "with spaces",
    "UpperCase",
    "con",
    "node_modules",
  ])("rejects an unsafe project name %s", (name) => {
    expect(() => resolveOptions({ name, displayName: "Example" })).toThrow();
  });
  it("rejects email-dependent flows without an email capability", () => {
    expect(() =>
      resolveOptions({
        name: "example",
        displayName: "Example",
        verifyEmail: true,
      }),
    ).toThrow(/email provider/i);
  });
  it("keeps secrets out of config and exports while creating independent local secrets", async () => {
    const files = await renderProject(
      resolveOptions({ name: "example", displayName: "Example" }),
      {
        jwt: "local-jwt-secret-for-this-test",
        cookie: "local-csrf-secret-for-this-test",
      },
    );
    expect(files[".env"]).toContain("local-jwt-secret");
    for (const [path, content] of Object.entries(files))
      if (path !== ".env") {
        expect(content).not.toContain("local-jwt-secret-for-this-test");
        expect(content).not.toContain("local-csrf-secret-for-this-test");
      }
    expect(files[".agents/skills/gold-backend-development/SKILL.md"]).toContain(
      "route",
    );
  });
  it("generates a complete project without installing or overwriting files", async () => {
    const parent = await mkdtemp(join(tmpdir(), "gold-generator-test-"));
    temporary.push(parent);
    const options = resolveOptions({
      name: "example",
      displayName: "Example",
      docs: "none",
    });
    const target = await createProject(options, parent, {
      install: false,
      verify: false,
      git: false,
    });
    expect(
      JSON.parse(await readFile(join(target, "package.json"), "utf8")).name,
    ).toBe("example");
    expect((await stat(join(target, ".env"))).mode & 0o777).toBe(0o600);
    await writeFile(join(target, "keep.txt"), "user content");
    await expect(
      createProject(options, parent, {
        install: false,
        verify: false,
        git: false,
      }),
    ).rejects.toThrow(/already exists/);
    expect(await readFile(join(target, "keep.txt"), "utf8")).toBe(
      "user content",
    );
  });
  it("does not replace an existing empty directory or symlink target", async () => {
    const parent = await mkdtemp(join(tmpdir(), "gold-target-test-"));
    temporary.push(parent);
    await mkdir(join(parent, "existing"));
    await expect(
      createProject(
        resolveOptions({ name: "existing", displayName: "Existing" }),
        parent,
        { install: false, verify: false, git: false },
      ),
    ).rejects.toThrow(/already exists/);
  });
});

it("preserves template-like display names as data", async () => {
  const files = await renderProject(
    resolveOptions({ name: "literal", displayName: "__PORT__" }),
  );
  expect(JSON.parse(files["gold.config.json"]!).displayName).toBe("__PORT__");
  expect(files["src/controllers/health.controller.ts"]).toContain('"__PORT__"');
});

describe("preset composition", () => {
  it("does not install unselected integrations", async () => {
    const files = await renderProject(
      resolveOptions({
        name: "minimal",
        displayName: "Minimal",
        docs: "none",
        clients: "mobile",
      }),
    );
    const manifest = JSON.parse(files["package.json"]!);
    for (const dependency of [
      "firebase-admin",
      "socket.io",
      "nodemailer",
      "cloudinary",
      "swagger-ui-express",
    ])
      expect(manifest.dependencies[dependency]).toBeUndefined();
    expect(
      Object.keys(files).some(
        (path) =>
          path.includes("notification") ||
          path.includes("upload") ||
          path.includes("openapi"),
      ),
    ).toBe(false);
    expect(files[".env.example"]).not.toMatch(/FIREBASE|SMTP|CLOUDINARY/);
    expect(files["prisma/schema.prisma"]).not.toContain("  admin\n");
  });
  it.each(["mysql", "postgresql"] as const)(
    "selects only the correct %s adapter and driver",
    async (database) => {
      const files = await renderProject(
        resolveOptions({
          name: "database-app",
          displayName: "Database app",
          database,
        }),
      );
      const manifest = JSON.parse(files["package.json"]!);
      expect(files["prisma/schema.prisma"]).toContain(
        `provider = "${database}"`,
      );
      expect(
        manifest.dependencies[
          database === "mysql"
            ? "@prisma/adapter-mariadb"
            : "@prisma/adapter-pg"
        ],
      ).toBeDefined();
      expect(
        manifest.dependencies[
          database === "mysql"
            ? "@prisma/adapter-pg"
            : "@prisma/adapter-mariadb"
        ],
      ).toBeUndefined();
    },
  );
  it("renders the combined feature set without unfinished template markers", async () => {
    const files = await renderProject(
      resolveOptions({
        name: "full",
        displayName: 'Full "Example"',
        database: "postgresql",
        roles: "admin",
        email: "preview",
        verifyEmail: true,
        passwordReset: true,
        notifications: "both",
        socket: true,
        uploads: true,
        compose: true,
        docker: true,
      }),
    );
    for (const content of Object.values(files))
      expect(content).not.toMatch(/__[A-Z][A-Z0-9_]+__/);
    expect(files["src/routes/app-route.ts"]).toContain("notificationRoutes");
    expect(JSON.parse(files["gold.config.json"]!).displayName).toBe(
      'Full "Example"',
    );
    expect(files["src/services/auth/auth.service.ts"]).toMatch(
      /role: ["']user["']/,
    );
  });
});
