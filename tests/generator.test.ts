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
    expect(files["src/routes/app-route.ts"]).toContain("notificationRouter");
    expect(JSON.parse(files["gold.config.json"]!).displayName).toBe(
      'Full "Example"',
    );
    expect(files["src/services/auth/auth.service.ts"]).toMatch(
      /role: USER_ROLE\.USER/,
    );
  });
});

it.each([
  { verifyEmail: true, passwordReset: false, docs: "swagger" },
  { verifyEmail: false, passwordReset: true, docs: "postman" },
  { verifyEmail: true, passwordReset: true, docs: "none" },
])("uses KRI routers for selected auth flows: %j", async (preset) => {
  const files = await renderProject(
    resolveOptions({
      name: "routes",
      displayName: "Routes",
      email: "preview",
      ...preset,
    }),
  );
  const router = files["src/routes/auth-route.ts"]!;
  const controllers = files["src/controllers/action.controller.ts"]!;
  for (const [enabled, path, schema, handler] of [
    [
      preset.verifyEmail,
      "resend-verification",
      "resendVerificationSchema",
      "resendVerificationEmail",
    ],
    [
      preset.passwordReset,
      "forgot-password",
      "forgotPasswordSchema",
      "forgotPasswordEmail",
    ],
  ] as const) {
    expect(router.includes(`"/${path}"`)).toBe(enabled);
    expect(controllers.includes(`function ${handler}`)).toBe(enabled);
    expect(
      files["src/validators/auth.schema.ts"]!.includes(
        `export const ${schema}`,
      ),
    ).toBe(enabled);
  }
  expect(router).toContain("validateBody(");
  expect(files["src/routes/app-route.ts"]).toContain(
    'router.use("/auth", authRouter)',
  );
  expect(files["src/routes/route-definition.ts"]).toBeUndefined();
  expect(Object.keys(files).some((path) => path.startsWith("src/docs/"))).toBe(
    preset.docs !== "none",
  );
  for (const [path, content] of Object.entries(files))
    if (path.startsWith("src/routes/"))
      expect(content).not.toMatch(
        /RouteDefinition|registerRoutes|operationId|z\.strictObject/,
      );
});

it.each(["push", "inbox", "both"] as const)(
  "keeps %s notification channels independent",
  async (notifications) => {
    const files = await renderProject(
      resolveOptions({
        name: "channels",
        displayName: "Channels",
        notifications,
        docs: "none",
      }),
    );
    const manifest = JSON.parse(files["package.json"]!);
    const push = notifications !== "inbox";
    const inbox = notifications !== "push";
    expect(Boolean(manifest.dependencies["firebase-admin"])).toBe(push);
    expect(Boolean(files["src/services/notifications/inbox.service.ts"])).toBe(
      inbox,
    );
    expect(Boolean(files["src/utils/firebase/messaging.ts"])).toBe(push);
    expect(files["src/services/notifications/notify.service.ts"]).toBeDefined();
    expect(
      files["prisma/schema.prisma"]!.includes("model Notification {"),
    ).toBe(inbox);
    expect(
      Object.keys(files).some((path) => path.startsWith("src/docs/")),
    ).toBe(false);
  },
);

it("generates the shared error, editor and folder conventions without optional providers", async () => {
  const files = await renderProject(
    resolveOptions({ name: "readable", displayName: "Readable", docs: "none" }),
  );
  const manifest = JSON.parse(files["package.json"]!);
  expect(manifest.dependencies["http-status-codes"]).toBeDefined();
  expect(files["src/errors/app-error.ts"]).toBeUndefined();
  expect(files["src/errors/index.ts"]).toContain("CustomAPIError");
  expect(files["src/middlewares/not-found.ts"]).toBeDefined();
  expect(files["src/middlewares/role.ts"]).toBeDefined();
  expect(files["src/utils/user-roles.ts"]).not.toContain("ADMIN:");
  expect(JSON.parse(files[".prettierrc.json"]!).printWidth).toBe(100);
  expect(
    JSON.parse(files[".vscode/settings.json"]!)["editor.formatOnSave"],
  ).toBe(true);
  expect(files["docs/development/PROJECT_STRUCTURE.md"]).toContain(
    "src/server.ts",
  );
  for (const path of Object.keys(files).filter((path) =>
    path.startsWith("src/services/"),
  ))
    expect(path.split("/").length).toBeGreaterThanOrEqual(4);
});

it("omits unselected email actions and templates", async () => {
  const files = await renderProject(
    resolveOptions({
      name: "email-only",
      displayName: "Email only",
      email: "smtp",
      docs: "none",
    }),
  );
  expect(files["src/utils/email/sender.ts"]).toBeDefined();
  expect(files["src/utils/email/templates/layout.ts"]).toBeDefined();
  expect(files["src/utils/email/preview.ts"]).toBeUndefined();
  expect(files["src/utils/email/templates/verification.ts"]).toBeUndefined();
  expect(files["src/utils/email/templates/password-reset.ts"]).toBeUndefined();
  expect(files["src/services/auth/action.service.ts"]).toBeUndefined();
  expect(files["tests/unit/actions.test.ts"]).toBeUndefined();
});
