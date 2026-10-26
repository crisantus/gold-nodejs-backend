# Gold Backend project wizard proposal

Status: proposed design, 25 October 2026. Commands below describe the intended
product; they are not implemented yet.

## Product contract

Install Gold once, run `gold_backend create`, answer a short guided wizard, and
receive an independent backend with your folder conventions, working selected
features, dependency setup, verification, and coding instructions.

Selected integrations should be ready for credentials. The generator cannot
create cloud accounts, verify email sender domains, configure a mobile app, or
guarantee message delivery by writing backend files. Its completion report must
distinguish generated, configured, verified, and still requiring action.

## Questions to ask during creation

Offer recommended defaults. Ask follow-up questions only for selected features.
Keep architecture, response format, security fundamentals, and coding style
fixed rather than asking every developer to redesign the starter.

| Order | Prompt                                              | Proposed choices/default                                                                                      |
| ----- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1     | What is your project name?                          | Validate an npm-compatible name and safe folder name                                                          |
| 2     | Where should the project be created?                | Child folder named after the project; reject a non-empty destination                                          |
| 3     | What display name should appear in docs and emails? | Derived from project name                                                                                     |
| 4     | Which port should the API use?                      | 5000; validate and report conflicts                                                                           |
| 5     | What clients will use this backend?                 | Mobile, browser, or both; determines auth transport and setup guidance                                        |
| 6     | Which database do you want?                         | MySQL + Prisma or PostgreSQL + Prisma; offer local Docker Compose or configure an existing database later     |
| 7     | Which account roles does this project need?         | Users only, or users and administrators; public self-registration and email/password JWT auth are standard    |
| 8     | Do you need email verification or password reset?   | Optional email-dependent extensions; refresh sessions and logout revocation are already included              |
| 9     | Do you need email?                                  | SMTP, Resend, local preview, or none; SMTP recommended for broad provider compatibility                       |
| 10    | Do you need notifications?                          | Firebase push, in-app inbox, both, or none; user endpoints use the standard auth and persistence foundation   |
| 11    | Do you need live updates with Socket.IO?            | Yes or no; generates a real-time foundation for future event handlers integrated with standard authentication |
| 12    | Do you need file uploads?                           | None or Cloudinary for the first release; select public/private access, allowed file types, and limits        |
| 13    | Which API documentation tools do you want?          | Swagger UI, Postman exports, both recommended, or neither                                                     |
| 14    | Do you need background jobs?                        | None, or a durable queue preset when available; explain any Redis requirement                                 |
| 15    | Do you need a deployment preset?                    | None or Docker initially; add EC2/PM2 only as a tested preset                                                 |
| 16    | Initialize Git and install dependencies?            | Yes recommended; never create a remote repository or deploy automatically                                     |

Ask for permitted browser origins when a browser client is selected. Ask for
frontend action-link URLs only when verification/reset email links need them.
Keep production secrets out of the questionnaire, command arguments, and saved
answers. Store only non-secret choices in `gold.config.json`.

The first release can omit advanced prompts until those presets are implemented.
Do not advertise a selectable feature that produces only placeholders.

Group optional capabilities into one feature checklist and show the relevant
follow-ups after selection. The table describes the decisions, not a mandatory
sequence of 16 separate screens.

## Database and account choices

MySQL and PostgreSQL are first-class database presets. Generate only the chosen
provider's Prisma schema, adapter, driver, migrations, connection examples,
optional Compose service, and test configuration. Verify persistence behavior
against each real database in CI. Do not treat changing the database URL as a
complete provider migration; SQL migration histories are provider-specific.

Current owner decision: email/password authentication, public self-registration,
JWT access tokens, persisted refresh sessions, protected-route middleware, and
logout revocation are part of every standard generated project. Do not ask
whether users can register or offer admin-only account creation in this wizard.
The first release requires a database, choosing MySQL or PostgreSQL; the former
no-database/no-auth proposal is deferred to a separately requested future preset.

Ask whether the app has users only or users plus administrators. Registration
always assigns the user role on the server. Never accept an administrator role
from a signup payload or let users promote themselves. When admin support is
selected, provide a deliberate local bootstrap command for the first admin,
without hard-coded credentials or a public bootstrap endpoint. All later role
changes must be authorized, audited, and invalidate or recheck stale privileges.
Users-only projects should contain no unused administrator routes or role enum
branches. Server-side resource ownership checks still apply to regular users.

Keep the default auth route group and user model consistent for both choices.
Health, registration, login, and selected password-action entrypoints are
explicit public exceptions with their own validation and rate limits. Refresh
verifies its refresh credential. User and admin route groups use authentication
middleware at the router boundary, with role/ownership checks as appropriate.
Do not put access-token middleware ahead of login/registration or require an
unexpired access token to rotate a valid refresh session.

## Always included

- Express, strict TypeScript, consistent local ESM imports, and one naming style.
- Self-registration/login, password hashing, JWT access tokens, refresh-session
  rotation/revocation, current-user endpoint, and protected-route middleware.
- Application factory, separate server lifecycle, bounded shutdown, liveness,
  and dependency-aware readiness.
- Zod configuration and request validation, centralized errors and 404s,
  consistent success responses, request IDs, and safe structured logs.
- Helmet, explicit CORS/proxy configuration, request size limits, global and
  sensitive-route rate limits, and appropriate HTTP response codes.
- Formatting, linting, type checking, behavior tests, production build, and CI.
- README, `.env.example`, `.gitignore`, Node runtime declaration, and lockfile.
- `AGENTS.md`, a local backend development skill, style guide, operations guide,
  and setup notes matched to the selected features.

Security fundamentals and tests are standard, not optional wizard checkboxes.
Only selected features contribute dependencies, environment variables, routes,
documentation, or provider setup requirements.

## Generated coding instructions and comments

Every generated project must include `AGENTS.md` that directs coding agents to
read `.agents/skills/gold-backend-development/SKILL.md` and the canonical backend
style guide before creating, changing, reviewing, or debugging backend code.
The skill describes app development; keep generator implementation rules in a
separate generator-specific skill when Gold itself is implemented.

These files must explicitly require:

- The route → middleware → controller → service → Prisma flow, consistent
  filenames, thin HTTP handlers, and business rules/ownership checks in services.
- Root route registration through `src/routes/app-route.ts`; existing auth and
  error helpers; typed inputs; runtime validation; selected public response
  fields; and no new architectural layers without a concrete need.
- Default authentication on protected route groups, explicit public exceptions,
  the chosen user/admin policy, and the existing success/error format.
- Short purpose comments for route groups, exported controllers, services, and
  shared helpers, plus comments explaining permission rules, transactions,
  refresh behavior, lifecycle cleanup, and other non-obvious decisions.
- Comments that stay current with behavior and explain intent, inputs/outputs,
  or constraints; avoid narrating each obvious line or copying stale boilerplate.
- Focused behavior tests, formatting, linting, type checking, and build checks
  appropriate to a change, with honest reporting of checks that could not run.

Ship those comments in the templates as examples for future development. Keep
instructions matched to selected features and reference one canonical guide
rather than duplicating rules across conflicting documents. Automated checks
and review should enforce the architecture and contracts where practical;
instructions alone are not proof that future changes follow the standard.

## Email preset

Generate a reusable email service, one reusable transporter/client, escaped HTML
templates with text alternatives, timeouts, typed outcomes, and normalized safe
errors. Auth-related templates appear only with the corresponding auth feature.

SMTP settings should include `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`SMTP_SECURE`, and `EMAIL_FROM`. Resend uses its provider key and sender setting
instead. Production transport must validate TLS; never recommend disabling
certificate validation to make a provider work.

Support local preview without requiring production credentials. Never log
password-reset links or OTPs into shared logs. A development send that was
skipped must return an explicit skipped result, not a delivery success.

`doctor` can validate settings and optionally check SMTP connectivity and
authentication without sending. An explicit test-email command takes a recipient
and sends one message. SMTP acceptance is not proof of inbox delivery. Sender
verification and DNS setup remain provider-specific steps in the guide.

Do not generate an unauthenticated public endpoint for arbitrary email sending.

## Notification preset

For Firebase push, generate lazy Firebase Admin initialization, a typed send
service, authenticated device-token registration/removal, multiple-device
support, and handling for invalid/unregistered tokens. Link tokens to the
authenticated user; do not accept arbitrary user IDs as authority to register
or target another user's device. Handle token reassignment and logout according
to the documented session/device policy.

Prefer workload credentials where available. For local/manual setup, support a
service-account file path or the documented project ID, client email, and
private-key environment settings. Never commit a service-account file or print
private keys/device tokens in setup diagnostics.

Generate an in-app notification model and list/read/unread operations only when
the inbox is selected. Firebase push transport alone does not create a durable
in-app inbox. Token and inbox endpoints use the standard authentication and
database foundation and enforce the current user's ownership.

The in-app inbox is the app's notification list or bell screen backed by saved
records, for example "Your booking was confirmed." It remains queryable after
reopening the app. Gold Backend provides its APIs and storage, not the frontend
screen. Firebase push alerts, a stored inbox, and live Socket.IO updates can be
enabled independently or used together.

The completion guide must say that the client app needs Firebase setup,
notification permission, and registration-token submission. iOS also needs the
appropriate APNs configuration. A valid server credential is not proof that a
device will display a notification.

Use explicit test commands for network validation or test sends. If retries
are enabled, bound them and retry transient errors only. Reliable delivery
across restarts requires the durable job/outbox preset; never promise it for
an in-memory task.

## Socket.IO preset

Offer an optional live-update foundation for chat events, presence, typing,
progress, status changes, and live notification counts. Attach Socket.IO to the
same HTTP server and port as Express, configure allowed origins and connection
admission deliberately, and include it in shutdown cleanup. Local single-server
operation needs no Firebase account or external messaging credentials.

Generate typed event contracts, a server-side emit helper, socket middleware,
and connection/disconnection handling. Integrate the selected auth/session mode
at the connection boundary and verify authorization again for protected events
and room membership. Do not let clients pick arbitrary user rooms. Define token
expiry/revocation behavior for long-lived connections; connection middleware
alone does not recheck authentication on every subsequent event.

Preserve the familiar error envelope in event acknowledgements, with documented
`connect_error` data for rejected connections. Add payload validation, event
rate/size limits, and safe logs. If connection recovery is enabled, revalidate
authentication and room permissions instead of blindly trusting old state.

Provide browser/Flutter connection examples and an event reference alongside
the HTTP API docs. A Socket.IO client is required; a plain WebSocket client is
not a drop-in replacement. Generating the foundation does not implement an
application's future chat or streaming business rules.

Live delivery is not durable storage. Persist messages or inbox records when
offline catch-up matters, then fetch missed state on reconnect. Recovery can
help with brief disconnects but must have a resynchronization fallback. Do not
promise that disconnected clients receive all events automatically.

For multiple app instances, add a tested adapter/persistence strategy and the
deployment's load-balancer settings. Make this an advanced preset; the base
single-instance Socket.IO option should not force Redis on every project.

## API documentation and Postman

KRI currently has `generate-swagger.ts`, `patch-swagger.ts`, and
`generate-postman.ts`, composed by its `generate:all` script. Keep the convenient
export experience while reducing separate documentation definitions and patches.

Register HTTP routes with explicit Express router methods, named validation
middleware and named controllers, following KRI's router style. Maintain each
documented operation's method, path, auth, schemas, responses, examples, and
stable operation ID in separate documentation-only contracts under src/docs.
Reuse the router's request validation schemas for OpenAPI where supported. Do not infer business semantics
or complete request/response schemas from route names alone.

Generate an OpenAPI document from those definitions, then use it for selected
outputs:

```text
docs/api/openapi.json
docs/api/postman_collection.json
docs/api/postman_environment.json
```

Swagger UI serves the same API document at `/docs` in development. Make
production UI exposure an explicit deployment setting, disabled by default.
Export-only users should not need a Swagger UI runtime dependency.

Postman output should include feature folders, `{{baseUrl}}`, empty credential
variables, bearer/cookie configuration appropriate to the client mode, sample
payloads, expected response examples, and token-capture scripts for the standard
auth endpoints. Export no real users, passwords, credentials, or tokens. Cookie auth
examples must include the generated CSRF flow when applicable.

Use stable operation identities rather than preserving IDs by list position.
Reordering a route must not attach one request's identity to a different route.
Regenerating an unchanged definition should produce stable files.

Proposed generated-app command: `npm run docs:generate`. It must regenerate
only the selected exports. CI should validate the document and detect drift
between declared routes, response contracts, and generated artifacts.

Importing the collection and environment into Postman should populate the
documented requests. It is a point-in-time import; future routes require
regeneration and reimport or a separately configured sync workflow. Importing
does not create accounts or execute dependent requests automatically.

## Response and error compatibility

Preserve the existing format:

```json
{
  "status": true,
  "message": "Request completed successfully",
  "data": {},
  "meta": {}
}
```

```json
{
  "status": false,
  "message": "Please check the submitted information",
  "errorCode": "VALIDATION_ERROR"
}
```

`data` and `meta` are optional. Keep `errorCode` a stable string in new Gold
projects, including `ACCESS_TOKEN_EXPIRED` where the Flutter client needs to
decide whether to refresh. Expected failures retain correct 4xx status codes;
unexpected failures use 500 with a generic public message. Field-level
validation details can be an optional documented `errors` array. Put the
correlation ID in `X-Request-ID` so the required JSON shape stays familiar.

Provider errors must be normalized. Never send raw provider payloads, stack
traces, database internals, or secret values in production error responses.
Use the same envelope for parsing failures, 404s, and rate limiting.

## Security improvements to include in the relevant presets

- Short-lived access tokens, persisted hashed refresh secrets, atomic rotation,
  reuse detection, and revocation. Use one-time password actions and never
  install a default production admin password.
- Secure HTTP-only browser cookies plus a deliberate CSRF strategy; mobile
  bearer tokens use a separate explicit transport contract.
- Server-side role and resource ownership checks; return selected public fields
  instead of whole database records; never spread arbitrary request bodies into
  a database write.
- Database transactions and constraints for invariants; bounded pagination and
  queries; signature verification and idempotency for enabled webhooks.
- Content-aware upload checks, explicit limits, authorized private downloads,
  and orphan cleanup for the upload preset.
- Secret-free logs and exports, timeouts on external calls, maintained locked
  dependencies, and isolated CI/database tests.

Test these guarantees. Describe the actual protections and remaining
configuration rather than claiming that the starter is universally secure.

## Completion experience and implementation order

Show a checklist derived from actual results, for example:

```text
Project files: generated
Dependencies: installed
Type checking, build, tests: passed
Swagger and Postman exports: generated
Email: local preview enabled; SMTP credentials still needed
Firebase push: code generated; credentials and client setup still needed
Database: local instructions generated; connection not checked
Next steps: open SETUP.md and complete the listed settings
```

Create `.env.example` with placeholders; create ignored local `.env` settings
with safe development defaults and generated random local auth secrets when
needed. Never overwrite an existing environment file. Preserve unfinished
configuration as a visible pending action, not a passed check.

Recommended initial scope: core starter, MySQL and PostgreSQL Prisma presets,
standard self-registration/JWT auth with users-only or user/admin roles,
SMTP/local email, Firebase push, optional Socket.IO foundation,
and Swagger/Postman. Add in-app inbox, Resend, uploads,
durable jobs, and deployment through tested increments. Leave payment providers,
SMS, social auth, and complex role systems for later focused presets.

Build and verify a minimal starter and a combined-feature starter first, then
test combinations and disabled-feature behavior. Implement `create` and
`doctor` before broad optimization or migration commands. No creation command
should send messages, deploy, or touch a production database automatically.

## References checked

- [KRI Swagger generation](/Users/user/Documents/Projects/Kri-project/kri-backend/scripts/generate-swagger.ts)
- [KRI Postman generation](/Users/user/Documents/Projects/Kri-project/kri-backend/scripts/generate-postman.ts)
- [Firebase server setup](https://firebase.google.com/docs/cloud-messaging/server-environment)
- [Firebase Flutter client setup](https://firebase.google.com/docs/cloud-messaging/flutter/client)
- [Nodemailer SMTP setup and verification](https://nodemailer.com/smtp)
- [Postman imports](https://learning.postman.com/latest-v-12/docs/getting-started/importing-and-exporting/importing-data)
- [Postman's OpenAPI converter](https://github.com/postmanlabs/openapi-to-postman/blob/develop/README.md)
- [Prisma v7 provider-specific migration limitations](https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/limitations-and-known-issues)
- [Socket.IO connection middleware](https://socket.io/docs/v4/middlewares)
- [Socket.IO delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/)
