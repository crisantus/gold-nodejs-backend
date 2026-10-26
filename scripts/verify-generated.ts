import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveOptions } from "../src/options.js";
import { createProject } from "../src/generator.js";

// This explicit command installs packages, but never connects to a DB or sends messages.
const parent = await mkdtemp(join(tmpdir(), "gold-generated-verification-"));
console.log(`Verification workspace: ${parent}`);
const presets = [
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
  {
    name: "reset-mysql",
    displayName: "Password reset MySQL",
    email: "smtp",
    passwordReset: true,
    docs: "swagger",
  },
  {
    name: "verify-postgres",
    displayName: "Verification PostgreSQL",
    database: "postgresql",
    email: "resend",
    verifyEmail: true,
    docs: "postman",
  },
  {
    name: "push-only-postgres",
    displayName: "Push only PostgreSQL",
    database: "postgresql",
    notifications: "push",
    docs: "none",
  },
  {
    name: "inbox-only-mysql",
    displayName: "Inbox only MySQL",
    notifications: "inbox",
    docs: "none",
  },
];
const selected = process.argv.slice(2);
for (const name of selected)
  if (!presets.some((preset) => preset.name === name))
    throw new Error(`Unknown verification preset: ${name}`);
for (const preset of presets.filter(
  (preset) => !selected.length || selected.includes(preset.name),
))
  await createProject(resolveOptions(preset), parent, {
    install: true,
    verify: true,
    git: false,
  });
console.log(
  "Representative generated projects verified. Database integration and provider delivery are separate checks.",
);
