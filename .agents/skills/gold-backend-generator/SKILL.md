---
name: gold-backend-generator
description: Build, change, debug, or review the Gold Backend terminal generator, templates, generated project instructions, and preset verification.
---

# Gold Backend generator development

Read root AGENTS.md, docs/development/BACKEND_STYLE_GUIDE.md, and the owning
template before changing behavior. Consult docs/PROJECT_WIZARD_DESIGN.md for
product decisions; running code and tests define implemented capabilities.
Keep documentation honest about unavailable features.

Preserve generated route → middleware → controller → service → Prisma
boundaries. Keep generator orchestration separate from application code.
Do not add a repository or base-service layer just to wrap Prisma.

Keep prompts and noninteractive flags equivalent. Validate names, paths, and
options; reject non-empty targets and traversal; stage writes and preserve
existing files. Execute commands as argument arrays without a shell. Save no
credentials in gold.config.json, docs, or Postman exports.

Selected presets must contribute coherent dependencies, routes, schemas, tests,
environment settings, docs, and instructions. Disabled presets leave no provider
imports, required secrets, or dummy feature endpoints. MySQL and PostgreSQL
need provider-specific adapters and migrations.

Generated apps include signup/login, JWT access, hashed persisted refresh
secrets, atomic rotation/reuse detection, logout revocation, and protected
routes. Signup cannot choose an admin role. Preserve the public response
format and safe production errors.

Comment exported behavior and non-obvious permission, transaction, session,
and lifecycle decisions. Keep comments accurate. Read analogous code, make
coherent changes, and update schemas, docs, and tests together.

Verify formatting, linting, typechecking, behavior tests, and building. Shared
template changes require generating representative apps in temporary folders,
installing/generating/building/testing them, inspecting disabled features, and
checking API exports. Use disposable real databases for persistence/concurrency
claims. Report unrun checks. Never send messages, touch production databases,
or deploy as a side effect of creation.

Follow the project's KRI-style readability and layout standard: explicit Express
routers, services grouped in services/<feature>/, focused controller functions,
named custom errors from errors/index.ts, ERROR_CODES for application identifiers,
and StatusCodes from http-status-codes for HTTP statuses. Keep source templates
multiline and formatted as well as generated output. Explain startup/middleware
order, permissions, transactions and lifecycle decisions with purpose comments.

Keep email sender/templates under utils/email and Firebase setup under
utils/firebase; domain notification services live in services/notifications.
Only selected capabilities contribute files/imports. Preserve encrypted device
tokens, lazy Firebase initialization, one-time auth actions, safe errors and
notification persistence independently of push. See BACKEND_STYLE_GUIDE.md for
examples and middleware ordering. Run template formatting checks and verify
representative generated projects after structural or error-handling changes.

Use the exact route schema with validatedBody/validatedQuery/validatedParams in
controllers and requireActor for authenticated context. Keep the private validation
cache's schema-checked assertion inside the validation helper; do not scatter request
casts or non-null assertions through controllers. Transforms execute once. Socket
state/events need explicit types and runtime validation; JSON-schema/provider values
stay unknown until checked. Preserve safe errors when forwarding after headers are sent.
