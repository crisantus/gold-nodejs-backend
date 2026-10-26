# Gold backend coding standard

Use route → middleware → controller → service → Prisma. Controllers own HTTP;
services accept typed payloads and actor context and own business permissions.
Use the shared Prisma client, explicit public field selection, and focused
functions. Avoid a repository/base-service abstraction just to wrap Prisma.
Use feature-route.ts, feature.controller.ts, feature.service.ts and
feature.schema.ts; mount routes through routes/app-route.ts.

Write explicit Express routers using `router.get/post/patch/delete(...)` and
mount feature routers with `router.use(...)` in `routes/app-route.ts`.
Keep named controllers in controller files and named Zod schemas in validator
files. Use `validateBody(schema)`, `validateQuery(schema)` and
`validateParams(schema)` as middleware. Keep origin checks, rate limits,
authentication and role checks visible in the middleware chain or router mounts.
Do not introduce route-object catalogs or custom registration wrappers.

```ts
router.post(
  "/resend-verification",
  authLimiter,
  validateBody(resendVerificationSchema),
  resendVerificationEmail,
);
```

When API documentation is selected, maintain documentation-only contracts in
`src/docs/` using the same validation schemas. Contracts never register routes
or select controllers. Update contracts with route changes, regenerate exports,
and run the generated route/export consistency tests.

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

## Readability and file organisation

Write normal multiline functions and use braces for meaningful control-flow blocks.
Split long conditions and nested ternaries into named decisions. Keep imports together,
configuration before handlers, and a short purpose comment on exported behavior. Explain
startup, permissions, transactions, token rotation and cleanup where those decisions happen.
Prettier formats layout; readable naming and function boundaries remain part of the standard.

Group all application services under `src/services/<feature>/`, for example
`auth/auth.service.ts`, `admin/admin.service.ts`, `notifications/inbox.service.ts`, and
`uploads/upload.service.ts`. Add new services inside their owning feature folder.
Keep controllers focused on HTTP, and infrastructure helpers under `src/utils/`.
Email delivery belongs in `utils/email/sender.ts`; HTML/text rendering belongs in
`utils/email/templates/`. Firebase initialization belongs in `utils/firebase/messaging.ts`.
Generate optional integration files only when selected.

## Startup and middleware order

`npm run dev` starts `src/server.ts`; `npm start` runs compiled `dist/server.js`.
The entrypoint loads validated configuration, connects Prisma, constructs the HTTP app,
attaches selected sockets and starts listening. Shutdown stops new requests, closes sockets
and drains HTTP connections before disconnecting Prisma, with a bounded deadline.

`src/app.ts` constructs Express without listening. Its order is request context and logging,
security headers and CORS, rate/body limits, selected documentation, `/api` feature routers,
`notFound`, then the global error handler. Preserve that order when adding middleware.

## Errors, statuses and roles

Import `StatusCodes` from `http-status-codes`; do not repeat numeric HTTP statuses in
runtime code. Throw named errors from `errors/index.ts`: `BadRequestError`, `ConflictError`,
`UnauthenticatedError`, `ForbiddenError`, `NotFoundError`, `PayloadTooLargeError`,
`ProviderError`, or `ServiceUnavailableError`, all extending `CustomAPIError`.
Central application identifiers live in `errors/error-codes.ts`; add codes there and
reuse `ERROR_CODES` rather than scattering string literals. Keep public identifiers stable.

The global error handler normalizes Zod, Prisma, JWT, parser and selected upload failures.
Pass safe messages to custom errors. Unexpected failures use generic messages; raw SQL,
provider payloads, tokens, URLs and stacks do not enter HTTP responses or request logs.
Unmatched routes use `middlewares/not-found.ts`. Errors after headers are sent are forwarded.

Role constants and types live in `utils/user-roles.ts` and match the selected Prisma enum.
Use `authenticateUser` before `requireRole([USER_ROLE.ADMIN])` on admin routes.
Services also enforce roles/ownership; signup always creates `USER_ROLE.USER`.

## Optional email and notifications

Reuse the email layout and action templates; keep subjects, HTML, and text out of business
services. Escape dynamic content and validate configured branding URLs/colors. Preserve
hashed one-time action credentials and the existing link-based verification/reset flow.

Use `services/notifications/notify.service.ts` for internal notifications when selected.
With inbox enabled, save history before attempting push. A push failure returns a failed
outcome and preserves that history. Push-only projects need no inbox table; inbox-only
projects import no Firebase code. Device tokens remain encrypted, invalid registrations
are cleaned up, and Firebase initialization stays lazy. Provider acceptance is not delivery.

## Checked request and socket data

Routes continue to use explicit Express calls with `validateBody`, `validateQuery`
and `validateParams`. Controllers read values through `validatedBody(req, schema)`,
`validatedQuery(req, schema)` and `validatedParams(req, schema)`, using the exact
named schema object imported by the router. Read the actor with `requireActor(req)`.
Do not cast `req.validated` or assume `req.actor` exists with `!`.

The validation middleware owns a private per-request cache. Typed readers check the
schema identity and request location before returning cached output. Transforms run
once; readers must not reparse transformed values. The cache contains the single
schema-checked generic assertion; do not duplicate that assertion in controllers.
Keep runtime response and provider values unknown until their shape has been checked.

Generated source linting rejects non-null assertions and requires type-only imports
for types. Socket events, response envelopes and connection data have explicit types;
validate handshake/event input and recheck current sessions before events/broadcasts.
Forward normalized errors after headers have been sent so downstream middleware
cannot receive raw provider/database errors through the global boundary.
