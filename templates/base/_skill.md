---
name: gold-backend-development
description: Implement, change, debug, or review this generated Gold Express and Prisma backend while preserving its architecture, auth, errors, and selected integrations.
---

# Gold backend development

Read AGENTS.md, docs/development/BACKEND_STYLE_GUIDE.md, gold.config.json,
and analogous route/schema/controller/service files before editing. Consult
SETUP.md for the selected provider and client-mode requirements.

Keep routes declarative, controllers focused on HTTP, and services focused on
typed inputs, business rules, ownership and transactions. Use the shared Prisma
client and public field selections. Do not add a repository/base-service layer
just to wrap Prisma. Validate bodies, queries, params and socket events; derive
payload types from schemas. Avoid any, unchecked casts and spreading request
bodies into database writes.

Preserve self-registration/JWT/refresh-session contracts and status/message
response envelopes. Signup never grants admin privileges. Check persisted
roles, account status and session activity. Browser cookies require the
existing CSRF/origin flow. Use correct HTTP statuses and stable public codes;
normalize unexpected/provider errors without leaking raw data.

Use transactions, database constraints and unique idempotency keys for relevant
invariants and retries. Bound pagination and query work, inspect repeated queries
in loops, and keep remote calls outside transactions. Give resources one owner
and clean up listeners, connections, uploads and timers.

Only configure selected integrations. Bound provider timeouts/retries and report
accepted, skipped and failed outcomes distinctly. Persist important state for
offline catch-up; push/socket delivery alone is not durable storage. Never log
credentials, tokens, private bodies or provider payloads.

Add short purpose comments on route groups and exported handlers, services and
helpers. Explain permission rules, transactions, replay handling and cleanup;
keep comments aligned with behavior rather than narrating obvious statements.

Make the smallest coherent change, update schemas/API docs/comments together,
and test real success, denied-access and failure behavior. Run npm run verify.
Use the documented disposable database workflow for integration tests; mocks
cannot establish concurrency or persistence guarantees. Regenerate selected
Swagger/Postman exports for route changes. Report anything not verified.
