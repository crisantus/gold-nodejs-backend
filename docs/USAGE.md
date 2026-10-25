# Gold Backend usage guide

## Create your backend

After installing Gold Backend as described in the [README](../README.md), open
a terminal in the parent folder where you keep your projects:

```bash
gold_backend create
```

Enter your project name when asked. Gold creates that folder inside your current
directory. This guide uses `my-api` as an example. Names start with a lowercase
letter and can contain lowercase letters, numbers, hyphens, and underscores.
You can also supply the name directly with `gold_backend create my-api`.

Use the arrow keys to navigate, **Space** to select additional features, and
**Enter** to continue. The wizard asks:

| Question                              | What to choose                                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Application display name              | The readable name of your app.                                                                                       |
| Database                              | MySQL + Prisma or PostgreSQL + Prisma.                                                                               |
| Account roles                         | Users only, or users and administrators. Everyone registers as a regular user.                                       |
| API clients                           | Mobile, browser, or both.                                                                                            |
| Additional features                   | Email, notifications, Socket.IO, uploads, API documentation, and Docker options. Swagger and Postman start selected. |
| Email provider, if selected           | SMTP, Resend, or local preview without credentials.                                                                  |
| Notifications, if selected            | Firebase push, an in-app inbox, or both.                                                                             |
| Email verification and password reset | These questions appear when email is selected.                                                                       |
| API port                              | Defaults to `5000`.                                                                                                  |
| Browser origins                       | Allowed frontend origins, such as `http://localhost:3000`.                                                           |
| Frontend URL for email links          | Where verification and password-reset links should open.                                                             |
| Install dependencies and verify       | Choose Yes for automatic installation, Prisma client generation, formatting, API exports, and checks.                |
| Initialize Git                        | Creates a Git repository inside your new backend.                                                                    |

Review the final configuration and confirm creation. Credentials go in the
generated `.env` afterward. The generator refuses to overwrite an existing
project folder.

## Open the generated project and configure the database

Once creation finishes, run:

```bash
cd my-api
```

**All commands below run inside your new backend**, unless a section says otherwise.
Read its `SETUP.md` for instructions specific to your selections.

Edit the existing `.env`. Gold has already generated random local JWT and CSRF
secrets there; keep them instead of replacing the file with `.env.example`.
The example file documents the available settings. Keep `.env` out of Git.

### If you selected a local database with Docker Compose

Start the database:

```bash
docker compose up -d
docker compose ps
```

Wait for the database to become healthy. The generated `.env` already matches
the local Compose credentials. MySQL uses port `3306`; PostgreSQL uses `5432`.
The MySQL setup also creates the shadow database needed for development migrations.

### If you are using an existing database

Create a development database and user, then set `DATABASE_URL` in `.env`.
Use the format matching the database you selected:

```dotenv
# PostgreSQL example
DATABASE_URL="postgresql://username:password@localhost:5432/my_api?schema=public"
```

```dotenv
# MySQL example
DATABASE_URL="mysql://username:password@localhost:3306/my_api"
SHADOW_DATABASE_URL="mysql://username:password@localhost:3306/my_api_shadow"
```

Replace the example values with your own. URL-encode special characters in
credentials. For MySQL, create the separate shadow database and grant your
development user access to both databases.

## Prepare the database and start the API

If you skipped automatic dependency installation, run `npm install` first.
Then prepare and check the app:

```bash
npm run prisma:generate
npm run db:migrate -- --name init
npm run doctor
npm run verify
npm run dev
```

The migration creates your database tables. Review and commit the generated
`prisma/migrations/` files. `doctor` checks local configuration; it does not
connect to providers or send messages. `verify` runs formatting, linting,
type checks, unit tests, and a build.

With the default port, open:

| Address                            | Purpose                                            |
| ---------------------------------- | -------------------------------------------------- |
| `http://localhost:5000/api/health` | Check that the API is running.                     |
| `http://localhost:5000/api/ready`  | Check database readiness.                          |
| `http://localhost:5000/docs`       | Swagger UI, if selected; available in development. |

Use your chosen port if it differs from `5000`. Stop the development server
with **Ctrl+C**.

## Try authentication and connect your frontend

These routes are included in every project:

| Method | Route                | Purpose                                                 |
| ------ | -------------------- | ------------------------------------------------------- |
| POST   | `/api/auth/sign-up`  | Register with `name`, `email`, and `password`.          |
| POST   | `/api/auth/sign-in`  | Sign in with `email` and `password`.                    |
| POST   | `/api/auth/login`    | Alias for sign-in.                                      |
| POST   | `/api/auth/refresh`  | Rotate the refresh token and obtain a new access token. |
| POST   | `/api/auth/logout`   | Revoke the current session.                             |
| GET    | `/api/auth/me`       | Get the authenticated user.                             |
| PATCH  | `/api/auth/password` | Change the authenticated user's password.               |

For a mobile client, sign-in responses contain `data.access_token` and
`data.refresh_token`. Send the access token as `Authorization: Bearer <access_token>`
on protected requests. Refresh requests send `{ "refresh_token": "..." }`.
If you enabled required email verification, complete verification before sign-in.

For Gold Flutter, set the API base URL to `http://localhost:5000/api`.
On a physical device, use your backend computer's reachable hostname or IP
instead of `localhost`.

For browser cookie authentication:

1. Add the frontend's exact origin to `CORS_ORIGINS` in `.env`.
2. Send `X-Auth-Transport: cookie` on signup, sign-in, and refresh, using
   `credentials: "include"` in frontend requests.
3. Read the `csrfToken` cookie and send its value in `X-CSRF-Token` on
   authenticated mutations and cookie refresh. Access and refresh cookies
   themselves are HTTP-only.

### Create your first administrator

If you selected **Users and administrators**, register your own account first,
then run this trusted local command:

```bash
npm run admin:bootstrap -- your-account@example.com
```

Replace the email with the registered account's email. This is a one-time
bootstrap operation and revokes that account's existing sessions. Sign in again
to use admin routes such as `GET /api/admin/users`. Public signup cannot assign
administrator privileges.

## Use Swagger and Postman

If you selected either documentation option, generate its files:

```bash
npm run docs:generate
```

Swagger exports `docs/api/openapi.json` and serves an interactive UI at `/docs`
when selected. The Swagger UI is disabled in production.

For Postman:

1. Open Postman and choose **Import**.
2. Import `docs/api/postman_collection.json`.
3. Import `docs/api/postman_environment.json` and select that environment.
4. Check `baseUrl`, which defaults to `http://localhost:5000`. Leave off `/api`
   here because collection request paths already include it.
5. Open the signup request, fill its body, and send it. Then send sign-in.
6. Successful auth responses automatically save `accessToken` and `refreshToken`
   in the selected Postman environment. Try **Get the current user** (`/api/auth/me`).

The collection uses bearer authentication. Exported files contain no live
credentials. When you add or change routes, run `npm run docs:generate` and
reimport the updated files.

## Connect the optional integrations

Only selected features are generated. Restart the API after changing `.env`.

### Email

| Selected provider | Setup                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local preview     | No provider credentials needed. Private HTML previews appear in `.mail-preview/`; open them locally. This mode is for development.                                                     |
| SMTP              | Set `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and the appropriate `SMTP_SECURE` value. Authorize the sender with your provider, then set `EMAIL_ENABLED=true`. |
| Resend            | Set `EMAIL_FROM` and `RESEND_API_KEY`, verify the sender/domain with Resend, then set `EMAIL_ENABLED=true`.                                                                            |

For selected verification/reset flows, set `WEB_APP_URL` to your frontend.
Your frontend still needs screens that consume the action links.

To deliberately send a test email, or create a local preview:

```bash
npm run email:test -- recipient@example.com
```

Use an address you control. Live providers send a real message; local preview
writes a file. Successful provider acceptance does not guarantee inbox delivery.

### Firebase push notifications

1. Enable Firebase Cloud Messaging in your Firebase project.
2. Fill `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`
   in `.env`, or configure a service-account file using `GOOGLE_APPLICATION_CREDENTIALS`.
3. Keep the generated `PUSH_TOKEN_KEY` stable and secret; it encrypts stored device tokens.
4. Set `PUSH_ENABLED=true`.
5. Configure Firebase in your client, request notification permission, and obtain
   its device token. iOS also needs APNs configuration.
6. Register the token through authenticated `POST /api/devices` with
   `{ "token": "your-device-token" }`.

Your business services can then call the generated `sendPush` service. There
is no public endpoint for sending arbitrary messages. Unregister a device with
`DELETE /api/devices` before logout. A successful send must still be checked
on the actual device.

### In-app notification inbox

This is saved notification history inside your app, such as “Your order shipped.”
Your services call `createNotification`; users retrieve their own records with
`GET /api/notifications` and mark them read with `PATCH /api/notifications/:id/read`.
It uses your database and needs no Firebase credentials. Build the inbox screen
in your frontend.

### Socket.IO live updates

Socket.IO runs on the same port as the API. Use the generated
`examples/socket-client.ts` or `examples/socket_client.dart` to connect your client
and authenticate. Install the appropriate Socket.IO client package in that app.
The `system:ping` event provides a starting example; add validated business events
for your own features. Reconnect with fresh credentials after session expiry.

Important events that must survive disconnection need database persistence and
REST catch-up. Multiple server instances need an additional compatible adapter
and load-balancer configuration.

### Private Cloudinary uploads

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`,
then `UPLOADS_ENABLED=true`. Authenticated clients upload one multipart field
named `file` to `POST /api/files`. Supported types are PNG, JPEG, WebP, and PDF;
the default maximum is 5 MB, configurable through `MAX_UPLOAD_MB`.

`GET /api/files/:id/download` checks ownership and returns a short-lived signed
download URL. `DELETE /api/files/:id` removes the user's file.

## Keep building with the included coding standard

The generated project follows:

```text
src/
  routes/        Route definitions and access rules
  middlewares/   Authentication, validation, and request handling
  controllers/   HTTP input and responses
  services/      Business logic and permissions
  validators/    Zod request schemas
  config/        Environment and feature configuration
  errors/        Shared application errors
  utils/         Focused shared helpers
  types/         Shared TypeScript types
prisma/          Database schema and migrations
tests/           Unit and guarded database integration tests
docs/            Coding guides and selected API exports
scripts/         Development and setup commands
```

Services use Prisma directly through the shared client. Read the generated
`AGENTS.md`, `.agents/skills/gold-backend-development/SKILL.md`, and
`docs/development/BACKEND_STYLE_GUIDE.md` before making changes or asking an
AI agent to add a feature. They explain validation, permissions, transactions,
comments, response formats, and verification. `gold.config.json` records your
selected features; credentials belong in `.env`.

Success responses use `{ status: true, message, data?, meta? }`. Errors use
`{ status: false, message, errorCode, errors? }` with the appropriate HTTP status.
`X-Request-ID` correlates requests with structured logs. Protected requests
recheck persisted sessions and current roles.

After changes, run `npm run verify`. If API routes changed and documentation
was selected, also run `npm run docs:generate`. See the generated `SETUP.md`
for guarded integration tests against a disposable database.

For a production build, use `npm run build`, then `npm start`. Configure
production credentials, HTTPS, origins, and proxy settings before deployment.
Apply reviewed migrations with `npm run db:deploy` as a separate deployment
step; the optional production Docker image does not include the Prisma CLI.

## Create a project without the wizard

Run this command from the parent folder where you want your new project.
Use `--yes` with explicit flags for scripts or a noninteractive terminal.
This example selects PostgreSQL, administrators, local email previews,
verification/reset flows, both notification types, sockets, uploads, both
documentation formats, and Docker files:

```bash
gold_backend create my-api --yes --database postgresql --roles admin \
  --email preview --verify-email --password-reset --notifications both \
  --socket --uploads --docs both --compose --docker
```

Unspecified options use their defaults. Email verification/reset flags require
an email provider. Check all options with:

```bash
gold_backend create --help
```

Useful flags:

| Flag                            | Effect                                                   |
| ------------------------------- | -------------------------------------------------------- |
| `--directory /path/to/projects` | Create the project inside an existing parent directory.  |
| `--port 5001`                   | Use a different API port.                                |
| `--clients mobile`              | Choose mobile clients; also accepts `browser` or `both`. |
| `--no-install`                  | Generate files and install packages yourself later.      |
| `--no-verify`                   | Skip automatic generated-project checks.                 |
| `--no-git`                      | Skip Git initialization.                                 |

If installation or verification fails, Gold preserves your new project folder.
Enter that folder, fix the reported issue, and resume using its `SETUP.md`.
For skipped installation, run `npm install`, `npm run prisma:generate`,
`npm run format`, and, if selected, `npm run docs:generate`, then continue
with the database setup and verification above.

## Troubleshooting

| Problem                                         | What to check                                                                                                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gold_backend: command not found`               | Run `npm link` from the generator repository, or use `node dist/cli.js create` there. Check that your npm global bin directory is on your terminal's PATH. |
| Project folder already exists                   | Pick a new name or parent directory. Gold does not overwrite existing folders.                                                                             |
| Database connection fails                       | Check `.env`, database credentials, and whether the server/container is ready. Ensure the database port is available.                                      |
| MySQL migration reports a shadow database error | Create the shadow database, set `SHADOW_DATABASE_URL`, and grant the development user access.                                                              |
| Email/push/uploads remain disabled              | Configure the selected provider and set its `*_ENABLED` flag to `true`, then restart the API.                                                              |
| Browser request is blocked                      | Check the exact frontend origin in `CORS_ORIGINS`, cookie credentials, and CSRF headers.                                                                   |
| A protected request returns 401                 | Sign in or refresh credentials. Logout, password changes, and expired/revoked sessions invalidate access.                                                  |
| Swagger or a provider command is missing        | Confirm that feature was selected when creating the project.                                                                                               |
