import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProject } from "../src/generator.js";
import { resolveOptions } from "../src/options.js";
import { run } from "../src/process.js";

const presets = {
  minimal: { database: "mysql", docs: "none", clients: "mobile" },
  full: {
    database: "postgresql",
    roles: "admin",
    email: "preview",
    verifyEmail: true,
    passwordReset: true,
    notifications: "both",
    socket: true,
    uploads: true,
    docs: "both",
    compose: true,
    docker: true,
  },
  smtp: {
    database: "mysql",
    roles: "admin",
    email: "smtp",
    passwordReset: true,
    docs: "swagger",
    compose: true,
  },
  resend: {
    database: "postgresql",
    email: "resend",
    docs: "postman",
    clients: "browser",
  },
};
const key = process.env.PRESET as keyof typeof presets;
if (!(key in presets)) throw new Error("Choose a known PRESET");
const options = resolveOptions({
  name: `gold-${key}`,
  displayName: `Gold ${key}`,
  ...presets[key],
});
const parent = await mkdtemp(join(tmpdir(), "gold-ci-"));
const directory = await createProject(options, parent, {
  install: true,
  verify: true,
  git: false,
});
const databaseUrl =
  options.database === "mysql"
    ? "mysql://root:gold-test-password@127.0.0.1:3306/gold_test"
    : "postgresql://gold:gold-test-password@127.0.0.1:5432/gold_test";
process.env.DATABASE_URL = databaseUrl;
process.env.TEST_DATABASE_URL = databaseUrl;
process.env.GOLD_ALLOW_DB_TESTS = "true";
await run("npm", ["exec", "--", "prisma", "db", "push"], directory);
await run("npm", ["run", "test:integration"], directory);
