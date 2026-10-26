# Gold Backend generator

Before changing, reviewing, or debugging this generator or its templates, read
`.agents/skills/gold-backend-generator/SKILL.md` and
`docs/development/BACKEND_STYLE_GUIDE.md`.

Keep generator orchestration separate from the generated HTTP application.
Generated apps must include their own `AGENTS.md`, development skill, and guides.
Keep template variants, exported API contracts, and verification in sync.
Preserve self-registration, JWT/refresh sessions, the user/admin option,
MySQL/PostgreSQL choices, and `{ status, message, data?, meta?, errorCode? }`.
Validate generated projects, not only the generator. Never claim a provider or
database connection is verified unless that check actually ran.

Use explicit Express `router.post(...)` / `router.get(...)` calls with named
validation middleware and controllers, matching the KRI backend standard.
Mount feature routers through `router.use(...)`. Keep API export metadata in
separate documentation contracts; do not use route-object registration layers.

Keep generated code readable and formatted. Group services by feature folder;
separate email templates/delivery and Firebase setup from domain services.
Use named CustomAPIError subclasses, central ERROR_CODES and http-status-codes.
Explain the server.ts entrypoint and middleware ordering in code and guides.
