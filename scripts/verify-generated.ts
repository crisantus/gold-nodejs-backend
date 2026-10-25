import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveOptions } from "../src/options.js";
import { createProject } from "../src/generator.js";

// This explicit command installs packages, but never connects to a DB or sends messages.
const parent = await mkdtemp(join(tmpdir(), "gold-generated-verification-"));
console.log(`Verification workspace: ${parent}`);
for (const preset of [
  {
    name: "minimal-mysql",
    displayName: "Minimal MySQL",
    clients: "mobile",
    docs: "none",
  },
  {
    name: "full-postgres",
    displayName: "Full PostgreSQL",
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
  },
])
  await createProject(resolveOptions(preset), parent, {
    install: true,
    verify: true,
    git: false,
  });
console.log(
  "Representative generated projects verified. Database integration and provider delivery are separate checks.",
);
