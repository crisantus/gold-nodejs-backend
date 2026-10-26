# Gold Backend 0.1.0 verification

## CLI update notices and uninstall — 26 October 2026

The generator passed all 47 tests, template/source formatting, lint, type checks,
and compilation. Update checks cover matching commits, newer commits with the same
package version, ahead/diverged histories, invalid responses, rate limits, timeouts,
and offline failures. Command tests verify that notices precede the wizard and
never force an update, and that the offline flag and CI opt-out skip checks.

An isolated clean Git fixture was installed globally into a temporary npm prefix.
Both `gold-backend` and `gold_backend` worked. The package recorded its exact Git
revision during preparation. A second commit kept version 0.1.0; reinstalling the
same Git URL updated the installed revision successfully. A backend was generated
through the installed CLI. Running its `uninstall` command from that backend's
folder removed both aliases and the CLI package while every generated backend
file retained its original digest. The normal user installation was untouched.

A live read-only `check-update` invocation correctly matched GitHub's current
commit. The sandboxed invocation also exercised the unavailable-network path and
exited without claiming the installation was up to date. No update or uninstall
was executed against the user's normal global installation.

CLI build metadata is stored in `dist/build-info.json`; it never uses a parent
project's unrelated Git HEAD. The package version is read from package.json.
GitHub installation CI now checks both aliases, revision metadata, creation,
and uninstall with project retention. Hosted CI was not run locally.
Generated application templates and database/provider behavior were unchanged by
this CLI feature; no live database or provider checks were performed.

## Checked requests and typed sockets — 26 October 2026

Regenerated the six existing temporary verification apps from the current templates,
reusing their installed dependencies and preserving private environment files.
All passed formatting, the stricter source lint rules, type checks, unit tests,
Prisma client generation and builds. Selected Swagger/Postman exports regenerated.
The generator passed its 23 tests, formatting (including templates), lint,
type checks and build. Both updated skills passed the skill-creator validator.

| Preset                               | Unit tests |
| ------------------------------------ | ---------: |
| Minimal MySQL                        |         27 |
| Full PostgreSQL                      |         50 |
| SMTP/password-reset MySQL            |         37 |
| Resend/email-verification PostgreSQL |         37 |
| Push-only PostgreSQL                 |         32 |
| Inbox-only MySQL                     |         28 |

Controllers now use schema-checked request readers and explicit actor checks.
Tests establish that transforms execute once and that missing/mismatched route
schemas fail safely. Source lint rejects non-null assertions and requires type-only
imports. The cache's single generic assertion is guarded by the exact schema object
and request location; controller casts were removed. Documentation schema values
are shape-checked before use.

Socket events, envelopes and connection state now have explicit types. Local socket
tests use mocked session persistence and verify safe rejection of bad credentials,
event validation, and disconnection of revoked recipients before broadcast.
The HTTP error boundary also sanitizes errors forwarded after response headers
have already been sent. Existing response identifiers and auth routes are preserved.

These checks did not connect to real databases or live email/Firebase/Cloudinary
providers. Database integration, provider delivery, Docker execution and remote CI
were not rerun. Earlier entries below record previous verification.

## KRI-style organisation and error handling — 25 October 2026

The generator passed formatting (including source templates), lint, type checks,
all 23 generator tests, and compilation. The generator and generated-development
skills both passed the skill-creator validator.

Six generated apps were installed and verified with Prisma client generation,
formatting, lint, type checks, unit tests and builds:

| Preset                                                                               | Unit tests |
| ------------------------------------------------------------------------------------ | ---------: |
| Minimal MySQL, mobile, no docs                                                       |         25 |
| PostgreSQL, admin, email preview, both notifications, sockets, uploads, both exports |         46 |
| MySQL, SMTP, password reset, Swagger only                                            |         35 |
| PostgreSQL, Resend, email verification, Postman only                                 |         35 |
| PostgreSQL, push only, no docs                                                       |         30 |
| MySQL, inbox only, no docs                                                           |         26 |

The full-feature app was regenerated and rechecked after correcting role
middleware wiring and an error-code import found by generated-app verification.
Swagger and Postman generation both passed. The package dry run includes the
formatting module, custom errors, email templates and Firebase utilities, and
excludes the removed AppError/route-registration helpers, environment files and
node_modules.

New checks cover custom error classes, safe Prisma/Zod/JWT/parser normalization,
malformed JSON and body limits, request-ID logging, forwarded errors after headers
are sent, email HTML escaping/text fallbacks, lazy Firebase initialization,
platform/data payloads, invalid device cleanup, and inbox persistence before push.
Push-only and inbox-only apps verify that the channels work independently.

Code starts at `src/server.ts` in development and `dist/server.js` in production.
Generated guides explain middleware ordering, feature service folders, named
errors, central application codes, and editor/CLI formatting. `npm run format`
and `npm run format:check` now include the literal source templates as well.

`npm run test:generated` checks all six presets. Pass preset names to select a
subset. These checks used mocks for database/provider boundaries; real database
integration, live provider delivery, Docker execution, and remote CI were not
rerun for this change. Earlier sections below describe prior verification.

## Explicit Express router update — 25 October 2026

All generated route groups now use explicit Express router methods, named
controllers, and validation middleware. API contracts are documentation-only.
The generator passed formatting, lint, type checks, all 18 tests, and compilation.

Four fresh projects were independently installed, generated with Prisma, checked,
and built: minimal MySQL without docs; full PostgreSQL with all features and both
exports; SMTP/MySQL with password reset and Swagger only; and Resend/PostgreSQL
with verification and Postman only. The generated suites passed 13, 29, 21, and
21 tests respectively. An additional HTTP/export consistency test was then added
and passed with lint/type checks in each of the three documentation-enabled apps.

Routing checks cover protected feature entrypoints, current admin authorization,
body/query/parameter validation, composition of separate validation middleware,
selected email action dispatch, account-privacy responses, mounted paths, and
route/export coverage. Both export formats generated successfully, and the
package dry run includes the new templates and excludes the removed custom
route-registration helper.

These router-update checks used mocks for database/provider boundaries. Real
database integration, provider delivery, Docker execution, and remote CI were
not rerun for this change. The earlier results below are a historical baseline.

`npm run test:generated` now verifies all four presets. To run selected presets,
pass their names, for example:

```bash
npm run test:generated -- reset-mysql verify-postgres
```

## Earlier baseline

Verified locally on 25 October 2026. The host used Node 26.7.0; Node 24 LTS is
recommended and configured in the included GitHub Actions workflows.

| Target                                                                       | Unit tests | Real database integration tests |
| ---------------------------------------------------------------------------- | ---------: | ------------------------------: |
| Generator                                                                    |         15 |                               — |
| Minimal MySQL, mobile, no docs                                               |          8 |                               6 |
| PostgreSQL, admin, email preview, inbox/push, sockets, uploads, both exports |         16 |                              11 |
| MySQL, admin, SMTP, password reset, Swagger                                  |         11 |                               9 |
| PostgreSQL, users, Resend, email verification, Postman                       |         11 |                               8 |

All targets passed formatting, lint, type checking, and production compilation.
Generated presets were installed independently. Tests used disposable loopback
MySQL 9.2 and PostgreSQL 17.11 instances; existing project databases were untouched.
The Linux GitHub Actions workflow also passed all five jobs on Node 24, using
MySQL 8.4/PostgreSQL 17 for the four generated-app presets. See the
[successful run](https://github.com/crisantus/gold-nodejs-backend/actions/runs/40184142454).

Database checks cover refresh rotation/replay, concurrent token consumption,
logout/password-change revocation, account blocking, cookie CSRF, current admin
roles, one-time actions, inbox ownership, and live socket revocation as applicable.
Provider calls are mocked in unit tests; local email preview files are private.

Additional checks:

- Both project skills pass the skill-creator frontmatter/scaffold validator.
- The interactive terminal wizard completes generation with default selections.
- Swagger-only, Postman-only, and combined export generation passes.
- The packed CLI installs in a separate temporary prefix, runs independently of
  source, and creates/installs/verifies a fresh backend through the default CLI flow.
- Generated SQL was applied to new empty test databases with migrate deploy;
  migrate status confirms the baseline is applied for both database providers.
- The tarball excludes environment files and node_modules.

Live SMTP/Resend acceptance, Firebase device delivery, and Cloudinary transfers
were not tested because production/provider credentials were not supplied.
Generated production Docker images and Flutter client examples were not executed.
Examples and generated instructions explain remaining setup;
no provider delivery, deployment, or production readiness is claimed from unit tests.

The local installable artifact is release/gold-backend-0.1.0.tgz. No package has
been published to npm and no production deployment was created.

## Git installation

The documented installation command uses npm's GitHub source support with
`--install-links`. A clean local Git fixture, containing neither compiled output
nor node_modules, was installed into an isolated global prefix. Its installed
`gold_backend` command ran and generated a new independent backend from the
installed templates.

The prepare helper builds automatically and restores a local dependency tree
when npm passes global installation settings into Git preparation. The
`--install-links` flag ensures the installed package survives cleanup of npm's
temporary Git checkout. CI includes the same global Git installation smoke test.

The repository is public at
[crisantus/gold-nodejs-backend](https://github.com/crisantus/gold-nodejs-backend).
The README's GitHub installation command was also tested directly against that
public repository with Node 24.22.1 and npm 11.19.0, in an isolated temporary
global prefix. No manual clone, build, or link was needed.

The installed CLI's interactive wizard was exercised with the default MySQL,
both-client, Swagger/Postman selections. Dependency installation succeeded.
The local sandbox blocked Prisma from updating its existing engine cache;
setup was resumed outside that sandbox and completed Prisma generation, API
exports, formatting, lint, type checks, all eight unit tests, and compilation.
This app setup check did not connect to a database or send provider messages.
