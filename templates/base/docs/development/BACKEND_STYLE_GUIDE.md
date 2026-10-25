# Gold backend coding standard

Use route → middleware → controller → service → Prisma. Controllers own HTTP;
services accept typed payloads and actor context and own business permissions.
Use the shared Prisma client, explicit public field selection, and focused
functions. Avoid a repository/base-service abstraction just to wrap Prisma.
Use feature-route.ts, feature.controller.ts, feature.service.ts and
feature.schema.ts; mount routes through routes/app-route.ts.

Use strict TypeScript and .js local imports. Validate body, query, params and
socket payloads with Zod and derive input types. Avoid any, unchecked casts,
and spreading arbitrary input into writes. Enforce ownership as well as roles.
Signup creates regular users only. JWTs check algorithm/issuer/audience/expiry
and session/account state. Rotate refresh secrets atomically, detect reuse,
revoke logout/password-change sessions and consume password actions once.

Success is { status: true, message, data?, meta? }. Failures use
{ status: false, message, errorCode, errors? }. Use correct HTTP statuses and
stable codes. Unexpected errors are generic; correlate with X-Request-ID.
Do not log bodies, query strings, tokens, credentials or raw provider errors.
Browser cookies require CSRF/origin protection; mobile clients use bearer auth.

Bound request sizes, pagination, query work, provider timeouts and retries.
Use database constraints and transactions for invariants. Unique idempotency
keys protect retryable mutations. Keep provider calls outside transactions.
Distinguish accepted, skipped and failed integration outcomes. Validate enabled
provider settings only; never claim inbox/device delivery from acceptance.
Authorize socket rooms and file access; persist important offline state.

Add short purpose comments on route groups, exported controllers, services and
shared helpers. Explain permission, transaction, replay and cleanup decisions.
Keep comments accurate and avoid narrating obvious lines.

Read analogous code first, make the smallest coherent change, then update
validation, API contracts, docs and comments together. Test failures and denied
permissions as well as happy paths. Use real disposable databases to establish
constraint/concurrency behavior. Mock provider network calls. Format, lint,
typecheck, test and build. Report checks not run. Generator changes also need
real generated-app installation, provider variants, packaging and preset tests.

Public auth tokens use access_token and refresh_token for Gold Flutter compatibility;
refresh requests send refresh_token. Internal services use camelCase. The primary
sign-in route is /api/auth/sign-in, with /api/auth/login as an alias.
