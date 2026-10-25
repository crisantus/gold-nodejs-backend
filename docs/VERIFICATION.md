# Gold Backend 0.1.0 verification

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
The included Linux CI targets MySQL 8.4/PostgreSQL 17 but has not been run on GitHub.

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
Docker containers, Flutter client examples, and hosted GitHub Actions were not
executed locally. Examples and generated instructions explain remaining setup;
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

The public GitHub installation will be checked after the first push.
