# Project structure and request flow

## Start here

Development starts at `src/server.ts` with `npm run dev`.
Production starts at `dist/server.js` with `npm start` after `npm run build`.
`src/app.ts` builds Express and is safe to import in tests; it does not listen.

```text
server.ts: configuration → Prisma connection → HTTP app/sockets → listen
request:   app.ts → app-route.ts → feature route → middleware → controller → service → Prisma
failure:   thrown error → errors-handler.ts → { status: false, message, errorCode, errors? }
```

## Files in this project

```text
src/
  server.ts                   Entrypoint, HTTP listener and graceful shutdown
  app.ts                      Express composition and middleware order
  routes/                     Explicit Express feature routers
  controllers/                HTTP input and response handling
  validators/                 Named Zod body/query/parameter schemas
  services/
    auth/                     Signup, sign-in, sessions and selected account actions
__SERVICE_FOLDERS__
  errors/                     Named CustomAPIError subclasses and central error codes
  middlewares/                Authentication, roles, validation, logging, not-found and errors
  config/                     Validated environment and selected feature configuration
  utils/
    user-roles.ts             Typed role constants matching the selected Prisma enum
__UTILITY_FOLDERS__
```

## Add a feature

1. Define named request schemas in `validators/<feature>.schema.ts` and derive input types.
2. Add business functions in `services/<feature>/`; accept typed inputs and actor context.
3. Add a named HTTP controller using typed `validatedBody`/`validatedQuery`/`validatedParams` readers, `requireActor` when authenticated, and `sendResponse`.
4. Register explicit router methods with authentication, role and validation middleware.
5. Mount the feature router in `routes/app-route.ts` with `router.use`.
6. Update selected API documentation contracts using the same schemas.
7. Cover successful requests, invalid input, denied access and important failures.

Use `StatusCodes` for HTTP responses and named errors from `errors/index.ts`.
Use `ERROR_CODES` for stable application identifiers. Never forward raw provider errors.

Formatting runs during generation, including when installation is skipped. VS Code
workspace settings enable format-on-save when the recommended Prettier extension is
installed. Run `npm run format` manually and `npm run verify` before committing.
