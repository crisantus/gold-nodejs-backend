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
