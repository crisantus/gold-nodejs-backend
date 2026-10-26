# Generated Gold backend instructions

Before creating, changing, reviewing, or debugging backend code, read
`.agents/skills/gold-backend-development/SKILL.md` and
`docs/development/BACKEND_STYLE_GUIDE.md`. Selected capabilities are in
`gold.config.json`; do not introduce dependencies/routes for unselected features.

Preserve route → middleware → controller → service → Prisma boundaries and
`{ status, message, data?, meta?, errorCode? }` responses. Signup creates regular
users only. Protect account routes and enforce ownership inside services.
Add purpose comments to exported routes/controllers/services/helpers and explain
non-obvious permission, transaction, token and cleanup decisions. Update
validation, docs and tests with behavior. Run appropriate verification and
report checks that could not run. Never log secrets or send real messages as
an incidental check.

Use explicit Express `router.post(...)` / `router.get(...)` calls with named
validation middleware and controllers, matching the KRI backend standard.
Mount feature routers through `router.use(...)`. Keep API export metadata in
separate documentation contracts; do not use route-object registration layers.

Keep generated code readable and formatted. Group services by feature folder;
separate email templates/delivery and Firebase setup from domain services.
Use named CustomAPIError subclasses, central ERROR_CODES and http-status-codes.
Explain the server.ts entrypoint and middleware ordering in code and guides.
