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
