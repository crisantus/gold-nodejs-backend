# Gold Backend: review and starter plan

Reviewed on 25 October 2026.

Subsequent product decisions are recorded in
[the current wizard design](PROJECT_WIZARD_DESIGN.md): self-registration and
JWT authentication are now standard, the role choice is users-only or
users-and-administrators, and both MySQL and PostgreSQL are supported. Those
decisions supersede this review's earlier optional-auth proposal.

## Recommendation

Keep your existing Express + strict TypeScript + Prisma approach, offering
MySQL and PostgreSQL as database choices, and preserve the
route → validation/auth middleware → controller → service → Prisma flow. Both
projects already demonstrate useful conventions. Gold should turn those into
a small, consistent starting point with stronger setup, lifecycle, testing, and
documentation guarantees.

Gold Backend is currently an empty directory, with no Git repository or
application to assess. Gold Flutter is a project generator, so the equivalent
backend product would be a generator that creates an independent backend with
your coding conventions and project instructions included.

This was a static review of representative source files, configuration, tests,
workflows, and documentation in the local checkouts. No applications, database
commands, test suites, or deployment workflows were run. Test-file counts show
the presence of coverage, not passing results or complete coverage. No KRI or
Retrofit files were changed.

## What is already working well

| Area                       | Evidence                                                                                             | What Gold should adopt                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Familiar layers            | Both projects have routes, controllers, services, validators, middleware, errors, and shared helpers | Preserve these boundaries and use services for business rules and database operations                       |
| Thin HTTP handlers         | Both auth controllers delegate work to services and use `sendResponse`                               | Keep Express request/response handling in controllers                                                       |
| Runtime validation         | Both auth route groups apply Zod validation; Retrofit also has query validation                      | Validate body, params, and query at request boundaries, and use parsed values                               |
| Consistent responses       | Both success helpers emit `{ status: true, message, data?, meta? }`                                  | Preserve the existing contract; define stable error codes and matching HTTP status codes                    |
| Config validation          | Retrofit has a Zod environment schema                                                                | Validate required configuration at boot, with provider settings required only when that provider is enabled |
| Testable application setup | Both expose application factory functions                                                            | Construct an app without listening, starting workers, or calling external services                          |
| Authentication lifecycle   | KRI stores hashed refresh secrets, rotates tokens atomically, detects reuse, and supports revocation | Use that design as the reference for an optional auth preset                                                |
| Financial consistency      | KRI wallet funding uses a transaction and a unique idempotency key                                   | Require these properties when adding payments, balances, or retryable webhooks                              |
| Regression tests           | KRI has 118 files under `test/`; Retrofit has 38 under `tests/`                                      | Use focused tests for real behavior, access boundaries, errors, and persistence                             |
| Isolated verification      | KRI has a dedicated verification script and PR CI workflow                                           | Provide a single documented verification command using isolated test settings                               |

Representative references:

- [KRI auth routes](/Users/user/Documents/Projects/Kri-project/kri-backend/src/routes/auth-route.ts)
- [KRI auth controller](/Users/user/Documents/Projects/Kri-project/kri-backend/src/controllers/auth.controller.ts)
- [KRI refresh sessions](/Users/user/Documents/Projects/Kri-project/kri-backend/src/services/auth/refresh-session.service.ts)
- [KRI wallet funding](/Users/user/Documents/Projects/Kri-project/kri-backend/src/services/guild/wallet-funding.service.ts)
- [KRI isolated verification](/Users/user/Documents/Projects/Kri-project/kri-backend/scripts/verify-isolated.mjs)
- [Retrofit environment schema](/Users/user/Documents/Retrofit/backend/src/config/env.ts)
- [Retrofit validation middleware](/Users/user/Documents/Retrofit/backend/src/middlewares/validate-request.ts)
- [Retrofit health tests](/Users/user/Documents/Retrofit/backend/tests/health.test.ts)

## Problems to avoid carrying into Gold

### 1. Setup documentation and agent instructions have drifted

KRI's README tells developers to run `npm run setup`, but its package scripts
have no `setup` command. It links to `BACKEND_WORKING_NOTES.md` and
`BACKEND_FLOW_AND_CYCLE.md`, which are absent in this checkout.

Retrofit's `Agent.md` documents a `success` response field, while active code
and its backend skill use `status`. It describes a fresh foundation and lists
notifications and generated reports as future work, although those services
and routes now exist. Some referenced documents are under `docs/`, rather
than the root paths implied by that file. There is no backend-root README.

Gold should generate an accurate README, standard `AGENTS.md`, and one
canonical backend skill and style guide. Examples and instructions must match
the selected preset. Test that documented scripts exist and smoke-test the
fresh-project setup path.

### 2. Startup and health checks need clearer guarantees

[Retrofit startup](/Users/user/Documents/Retrofit/backend/src/server.ts:6)
starts listening before checking the database. A connection failure is logged,
but the process keeps serving. Its health response does not query the database.
[KRI startup](/Users/user/Documents/Projects/Kri-project/kri-backend/src/server.ts:14)
waits for the connection before accepting traffic, which is the stronger
starting point for a database-dependent app.

Both shutdown implementations wait for `server.close` without an explicit
deadline. Gold should stop accepting traffic, drain requests, stop any enabled
workers/sockets, disconnect Prisma, and enforce a bounded shutdown deadline.
Use separate liveness and readiness checks: liveness reports the process is
alive; readiness reports whether it can serve requests with required dependencies.

### 3. Keep error responses and logs deliberately safe

[KRI's error handler](/Users/user/Documents/Projects/Kri-project/kri-backend/src/middlewares/errors-handler.ts:141)
can send a provider's raw error payload to clients. Both handlers start with
the original error message, so an unexpected internal error can reach the
client even when stack traces are hidden.

[Retrofit's error logging](/Users/user/Documents/Retrofit/backend/src/middlewares/errors-handler.ts:27)
records the full original URL, error object, and body with only a small set of
top-level fields redacted. Nested credentials and differently named token
fields are outside that redaction. KRI's fixed-category request logging is a
useful reference for minimizing sensitive request data.

Gold should return generic messages for unexpected failures, stable public
codes for expected failures, and a request ID for correlation. Log selected
structured fields; exclude tokens, bodies, query strings, and private provider
payloads by default. Handle `res.headersSent` before attempting another response.

### 4. Reissuing a refresh token is not enough to invalidate the old one

[Retrofit auth](/Users/user/Documents/Retrofit/backend/src/services/auth.service.ts:174)
verifies a stateless refresh JWT and issues another token pair. This path does
not consume the previous refresh token. Its logout service also performs no
server-side revocation. Password action tokens are verified by purpose and
expiry, with no consumption recorded in the reviewed path.

For Gold's optional auth preset, use persisted refresh sessions, hashed secrets,
atomic rotation, replay detection, explicit logout revocation, and single-use
password reset tokens. State whether logout also invalidates outstanding access
tokens immediately or lets them expire. Browser cookie auth also needs a
documented CSRF strategy; mobile bearer auth needs an explicit token contract.

### 5. Growing files need boundaries within the existing architecture

KRI's admin route file is 759 lines; its auth service is 718 lines. Retrofit's
generated-report service is 987 lines. Length alone does not establish a bug,
but these are places where distinct responsibilities warrant review.

Keep the familiar layers. Group related files by domain within those layers
when a feature grows, and extract pure policy functions for permissions,
status transitions, and calculations. Avoid creating generic base controllers,
services, or a repository layer just to wrap Prisma.

### 6. Tooling and deployment need reproducible defaults

Retrofit's `lint` script runs TypeScript type checking; it does not run a
linter. Its build configuration also includes tests and seeds in the compiled
output. Neither reviewed package declares Node engines or has a `.nvmrc`.

Gold should give formatting, linting, type checking, testing, and building
separate commands, with `verify` composing them. Use a production build config
that excludes tests. Declare a supported Node LTS version and use it in local
setup, CI, and deployment. Commit the lockfile and use `npm ci` in CI.

Retrofit's deployment workflow contains project-specific migration recovery
logic, including dropping named tables. That history does not belong in a
general starter. Deployment should be an optional preset with verification,
reviewed migrations, readiness checks, and a documented recovery process.
Rolling application code back does not automatically roll a database back.

### 7. Upload defaults should reflect each project's needs

Retrofit's upload middleware uses memory storage and a declared MIME prefix
check for images. Its skill's 38 MB limit is a project-specific decision.

Gold's optional upload preset should set explicit size/count limits, inspect
file content as well as declared type, authorize private downloads, and clean
up orphan uploads. Choose limits and buffering/streaming behavior for the
project; do not copy the 38 MB limit into every generated app.

## Proposed structure for a generated backend

This is the target structure for the generated application, separate from the
Gold generator's own source. Optional files appear only when their feature is
selected; `auth` below illustrates naming, not a mandatory base feature.

```text
my-backend/
  src/
    app.ts                     # Builds Express app; no listening or workers
    server.ts                  # Boot, listen, signals, shutdown
    config/
      env.ts                   # Validated runtime configuration
    routes/
      app-route.ts             # Mounts implemented route groups
      health-route.ts
      auth-route.ts            # Optional auth preset
    controllers/
      health.controller.ts
      auth.controller.ts       # Optional
    services/
      health.service.ts
      auth/                    # Optional; split by responsibility as needed
    sockets/                   # Optional Socket.IO connections/events
    validators/
      auth.schema.ts           # Optional
    middlewares/               # Errors, 404, request context, validation, limits
    errors/                    # Public application error types/codes
    utils/                     # Small shared helpers: responses, pagination
    types/                     # Shared types and Express augmentation
  prisma/                      # Database-enabled preset
    schema.prisma
    migrations/                # Created with real schema changes
  tests/
    unit/
    integration/
  docs/
    development/BACKEND_STYLE_GUIDE.md
    development/BACKEND_OPERATIONS_GUIDE.md
    api/                       # API contract for actual routes
  .agents/skills/gold-backend-development/SKILL.md
  .github/workflows/ci.yml
  AGENTS.md
  README.md
  .env.example
  .gitignore
  .nvmrc
  package.json
  package-lock.json
  tsconfig.json
  tsconfig.build.json
```

Use your existing naming convention consistently: `<feature>-route.ts`,
`<feature>.controller.ts`, `<feature>.service.ts`, and `<feature>.schema.ts`.
Services receive typed inputs and actor context, not Express `Request` or
`Response` objects. They own business permissions and multi-step operations.
Use one shared Prisma client; introduce dependency injection at boundaries
where it helps testing or swapping an external provider.

Use `z.infer` for request types where appropriate rather than maintaining
parallel schema/interface definitions. Keep database records separate from
public response objects so private columns do not leak accidentally.

## What every new project needs

The base should include a testable application factory; validated configuration;
consistent response/error handling; request IDs and safe logs; bounded JSON
parsing; configured CORS/proxy behavior; Helmet; rate limits; health endpoints;
format/lint/typecheck/test/build/verify commands; CI; and accurate setup and
coding instructions. Use HTTPS at the deployment boundary.

A database-enabled project also needs one Prisma client, connection lifecycle
management, reviewed migrations, uniqueness/foreign-key constraints, appropriate
indexes, bounded pagination, and database integration tests against a disposable
test database. Database-dependent readiness must fail when that database is
unavailable. Use `migrate dev` for local development and `migrate deploy` for
production with the Prisma v7 workflow; do not use `db push` as the production
migration process. Select and verify dependency versions when implementation
begins rather than copying either project's package file wholesale.

Auth, email, uploads, push notifications, sockets, payments, queues, deployment
providers, and sample business features should be optional. Disabled features
should add no mounted route, unused dependency, or required provider secret.
Background jobs and webhook handlers need idempotency and retry rules when
those features are introduced. Keep transactions focused on database work;
use an outbox/job mechanism for reliable external side effects when needed.

Test actual behavior: malformed JSON, invalid input, 404s, safe unexpected-error
responses, authorization/ownership denial, and relevant database constraints.
For auth, test refresh reuse and revocation. For payments, test duplicate and
concurrent delivery. Mock provider calls in unit tests; use real disposable
database integration tests for persistence and concurrency guarantees.

## Suggested build order for Gold itself

1. Agree on the written backend conventions and default preset from this review.
2. Implement one generated starter and verify fresh setup, build, tests, and
   startup before generalizing it into a generator.
3. Build the initial `create` and `doctor` commands. Validate project names,
   refuse non-empty output folders, stage generation, and report failed steps.
4. Add database/auth presets with explicit dependencies. Ensure their API
   response, expiry, refresh, and logout contracts work with Gold Flutter.
5. Generate `AGENTS.md`, the backend skill, and style/operations guides alongside
   each app. Keep a generator-specific skill distinct from app-development rules.
6. Verify representative preset combinations in temporary directories, including
   the minimal preset with no optional integrations. Check for leftover
   imports, secrets, routes, and instructions from disabled options.
7. Add optional integrations and deployment presets as real needs emerge.

The generator should keep CLI prompts, answer validation, templates, rendering,
filesystem changes, and verification separate. Its structure need not imitate
the HTTP application's route/controller/service folders.

## External guidance checked

The folder arrangement above is a recommendation based on your code, not a
framework-mandated layout. These primary sources support the operational rules:

- [Express production security](https://expressjs.com/advanced/best-practice-security/): input validation, HTTPS, Helmet, secure cookies, and brute-force protection.
- [Express 5 error handling](https://expressjs.com/en/5x/guide/error-handling/): rejected returned promises reach error middleware; avoid redundant async wrappers and delegate when headers have already been sent.
- [Prisma v7 development and production migrations](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/development-and-production): separate development migration creation from production application.
- [Node release guidance](https://nodejs.org/en/about/previous-releases): production should use a supported LTS release.
- [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html): exclude credentials and tokens; record selected operational and security events.
- [OWASP file uploads](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): declared MIME types are untrusted; combine content checks, authorization, and limits.
- [RFC 9700 refresh-token protection](https://www.rfc-editor.org/info/rfc9700/): rotation and replay detection are established OAuth security patterns. These custom auth implementations are not being assessed for OAuth compliance.
