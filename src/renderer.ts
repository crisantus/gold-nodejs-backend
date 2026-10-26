import { format } from "prettier";
import { backendFormatting } from "./formatting.js";
import { randomBytes } from "node:crypto";
import { readTemplates } from "./templates.js";
import type { ProjectOptions } from "./options.js";
import { prismaSchema, prismaClient } from "./database.js";
import { packageManifest } from "./manifest.js";
import { setupGuide, compose, ciWorkflow } from "./project-docs.js";

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** Compose selected file groups and substitute controlled template slots. */
export async function buildFiles(
  o: ProjectOptions,
  secrets: { jwt: string; cookie: string },
): Promise<Record<string, string>> {
  const push = ["push", "both"].includes(o.notifications);
  const inbox = ["inbox", "both"].includes(o.notifications);
  const swagger = ["swagger", "both"].includes(o.docs);
  const postman = ["postman", "both"].includes(o.docs);
  const actions = o.verifyEmail || o.passwordReset;
  const files = await readTemplates("base");
  files[".agents/skills/gold-backend-development/SKILL.md"] =
    files["_skill.md"]!;
  delete files["_skill.md"];
  async function add(group: string) {
    Object.assign(files, await readTemplates(`features/${group}`));
  }
  if (o.roles === "admin") await add("admin");
  if (o.email !== "none") {
    await add("email");
    if (!actions)
      for (const path of [
        "src/services/auth/action.service.ts",
        "src/controllers/action.controller.ts",
        "tests/integration/actions.test.ts",
        "tests/unit/actions.test.ts",
      ])
        delete files[path];
  }
  if (push || inbox) await add("notifications");
  if (push) await add("push");
  if (inbox) await add("inbox");
  if (o.email !== "none") {
    if (o.email !== "preview") delete files["src/utils/email/preview.ts"];
    if (!o.verifyEmail)
      delete files["src/utils/email/templates/verification.ts"];
    if (!o.passwordReset)
      delete files["src/utils/email/templates/password-reset.ts"];
  }
  if (o.socket) await add("socket");
  if (o.uploads) await add("uploads");
  if (o.docs !== "none") await add("docs");
  if (o.docs === "none") {
    for (const path of Object.keys(files))
      if (path.startsWith("src/docs/")) delete files[path];
  }
  const templatedPaths = new Set(Object.keys(files));
  const imports = [
    `import { Router } from 'express';`,
    `import { checkOrigin } from '../middlewares/auth.js';`,
    `import healthRouter from './health-route.js';`,
    `import authRouter from './auth-route.js';`,
  ];
  const mounts = [
    `router.use(healthRouter);`,
    `router.use('/auth', authRouter);`,
  ];
  const contractImports: string[] = [];
  const contractGroups: string[] = [];
  const routerTestImports = [
    `import healthRouter from '../../src/routes/health-route.js';`,
    `import authRouter from '../../src/routes/auth-route.js';`,
  ];
  const routerTestGroups = [`['', healthRouter]`, `['/auth', authRouter]`];
  for (const [on, name, prefix] of [
    [o.roles === "admin", "admin", "/admin"],
    [push, "device", "/devices"],
    [inbox, "notification", "/notifications"],
    [o.uploads, "upload", "/files"],
  ] as const) {
    if (!on) continue;
    imports.push(`import ${name}Router from './${name}-route.js';`);
    mounts.push(`router.use('${prefix}', ${name}Router);`);
    contractImports.push(
      `import { ${name}Contracts } from './${name}.contracts.js';`,
    );
    contractGroups.push(`...${name}Contracts,`);
    routerTestImports.push(
      `import ${name}Router from '../../src/routes/${name}-route.js';`,
    );
    routerTestGroups.push(`['${prefix}', ${name}Router]`);
  }
  const actionSchemas: string[] = [];
  const actionControllers: string[] = [];
  const actionRoutes: string[] = [];
  const actionContracts: string[] = [];
  const actionNames: string[] = [];
  const schemaNames: string[] = [];
  for (const [
    on,
    purpose,
    requestPath,
    consumePath,
    requestName,
    consumeName,
    requestSchema,
    consumeSchema,
  ] of [
    [
      o.verifyEmail,
      "verify",
      "resend-verification",
      "verify-email",
      "resendVerificationEmail",
      "verifyEmail",
      "resendVerificationSchema",
      "verifyEmailSchema",
    ],
    [
      o.passwordReset,
      "reset",
      "forgot-password",
      "reset-password",
      "forgotPasswordEmail",
      "resetUserPassword",
      "forgotPasswordSchema",
      "resetPasswordSchema",
    ],
  ] as const) {
    if (!on) continue;
    actionNames.push(requestName, consumeName);
    schemaNames.push(requestSchema, consumeSchema);
    actionSchemas.push(
      `export const ${requestSchema} = z.strictObject({ email: emailSchema });`,
      `export const ${consumeSchema} = z.strictObject({ token: z.string().min(20).max(256)${purpose === "reset" ? ", password: passwordSchema" : ""} });`,
    );
    actionControllers.push(
      `/** Request a ${purpose === "verify" ? "verification" : "password reset"} email without exposing account existence. */\nexport async function ${requestName}(req: Request, res: Response): Promise<void> { const input = validatedBody(req, ${requestSchema}); await requestEmailAction(res, input.email, '${purpose}'); }`,
      `/** Complete the one-time ${purpose === "verify" ? "email verification" : "password reset"} action. */\nexport async function ${consumeName}(req: Request, res: Response): Promise<void> { const input = validatedBody(req, ${consumeSchema}); await completeEmailAction(res, input.token, '${purpose}'${purpose === "reset" ? ", input.password" : ""}); }`,
    );
    actionRoutes.push(
      `router.post('/${requestPath}', authLimiter, validateBody(${requestSchema}), ${requestName});`,
      `router.post('/${consumePath}', authLimiter, validateBody(${consumeSchema}), ${consumeName});`,
    );
    actionContracts.push(
      `{ method: 'post', path: '/auth/${requestPath}', operationId: 'request${purpose}', tag: 'Authentication', summary: 'Request ${purpose} email', access: 'public', body: ${requestSchema}, response: z.unknown(), statusCode: StatusCodes.ACCEPTED },`,
      `{ method: 'post', path: '/auth/${consumePath}', operationId: 'complete${purpose}', tag: 'Authentication', summary: 'Complete ${purpose} action', access: 'public', body: ${consumeSchema}, response: z.unknown() },`,
    );
  }
  if (actions)
    contractImports.push(
      `import { ${schemaNames.join(", ")} } from '../validators/auth.schema.js';`,
    );
  files["src/routes/app-route.ts"] =
    `${imports.join("\n")}\n\nconst router = Router();\n/** Check browser origins before entering any feature router. */\nrouter.use(checkOrigin);\n${mounts.join("\n")}\nexport default router;\n`;
  files["src/config/features.ts"] =
    `/** Selected features are code, not credentials. */\nexport const features = ${JSON.stringify(o, null, 2)};\n`;
  files["src/utils/prisma.ts"] = prismaClient(o);
  files["prisma/schema.prisma"] = prismaSchema(o);
  files["gold.config.json"] = json({ schemaVersion: 1, ...o });
  files["package.json"] = json(packageManifest(o));
  files["tsconfig.json"] = json({
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      noUncheckedIndexedAccess: true,
      resolveJsonModule: true,
    },
    include: [
      "src/**/*.ts",
      "tests/**/*.ts",
      "scripts/**/*.ts",
      "prisma.config.ts",
    ],
  });
  files["tsconfig.build.json"] = json({
    extends: "./tsconfig.json",
    compilerOptions: { rootDir: "src", outDir: "dist", sourceMap: true },
    include: ["src/**/*.ts"],
    exclude: ["tests", "scripts"],
  });
  files[".gitignore"] =
    "node_modules/\ndist/\ncoverage/\n.env\n.env.*\n!.env.example\n.mail-preview/\nsrc/generated/\n*.log\n.DS_Store\n";
  files[".nvmrc"] = "24\n";
  const formatting = backendFormatting;
  files[".prettierrc.json"] = json(formatting);
  files[".prettierignore"] =
    "node_modules\ndist\ncoverage\nsrc/generated\npackage-lock.json\n.mail-preview\ndocs/api\n";
  files["eslint.config.js"] =
    `import js from '@eslint/js';\nimport tseslint from 'typescript-eslint';\nexport default tseslint.config({ ignores: ['dist/**', 'src/generated/**', 'node_modules/**', 'coverage/**', '.mail-preview/**'] }, js.configs.recommended, ...tseslint.configs.recommended, { rules: { '@typescript-eslint/no-namespace': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }] } }, { files: ['src/**/*.ts'], rules: { '@typescript-eslint/no-non-null-assertion': 'error', '@typescript-eslint/consistent-type-imports': 'error' } });\n`;
  const envLines = [
    `NODE_ENV=development`,
    `PORT=${o.port}`,
    `DATABASE_URL="${o.database === "mysql" ? "mysql://gold:gold-local-password@localhost:3306/gold_dev" : "postgresql://gold:gold-local-password@localhost:5432/gold_dev?schema=public"}"`,
    `JWT_SECRET=__JWT_SECRET__`,
    `CSRF_SECRET=__CSRF_SECRET__`,
    `CORS_ORIGINS="${o.origins}"`,
    `TRUST_PROXY_HOPS=0`,
    `API_BASE_URL=http://localhost:${o.port}`,
    `WEB_APP_URL="${o.webAppUrl}"`,
    `ACCESS_TOKEN_SECONDS=900`,
    `REFRESH_IDLE_DAYS=7`,
    `REFRESH_ABSOLUTE_DAYS=30`,
    `DOCS_ENABLED=${swagger ? "true" : "false"}`,
  ];
  const optionalSchema: string[] = [];
  const validation: string[] = [];
  if (o.email !== "none") {
    optionalSchema.push(
      `EMAIL_ENABLED: flag, EMAIL_FROM: z.string().default(''), EMAIL_BRAND_NAME: z.string().trim().min(1).max(100).default(${JSON.stringify(o.displayName)}), EMAIL_BRAND_COLOR: z.string().regex(/^#[a-fA-F0-9]{6}$/).default('#29335C'), EMAIL_LOGO_URL: z.union([z.literal(''), z.url().regex(/^https?:\\/\\//)]).default(''),`,
    );
    envLines.push(
      `EMAIL_ENABLED=${o.email === "preview" ? "true" : "false"}`,
      'EMAIL_FROM="Your App <no-reply@example.com>"',
    );
    if (o.email === "smtp") {
      optionalSchema.push(
        `SMTP_HOST: z.string().default(''), SMTP_PORT: z.coerce.number().int().positive().default(587), SMTP_USER: z.string().default(''), SMTP_PASS: z.string().default(''), SMTP_SECURE: flag,`,
      );
      envLines.push(
        "SMTP_HOST=",
        "SMTP_PORT=587",
        "SMTP_USER=",
        "SMTP_PASS=",
        "SMTP_SECURE=false",
      );
      validation.push(
        `if (value.EMAIL_ENABLED && (!value.SMTP_HOST || !value.SMTP_USER || !value.SMTP_PASS || !value.EMAIL_FROM)) throw new Error('Enabled email requires SMTP settings and EMAIL_FROM.');`,
      );
    }
    if (o.email === "resend") {
      optionalSchema.push(`RESEND_API_KEY: z.string().default(''),`);
      envLines.push("RESEND_API_KEY=");
      validation.push(
        `if (value.EMAIL_ENABLED && (!value.RESEND_API_KEY || !value.EMAIL_FROM)) throw new Error('Enabled email requires RESEND_API_KEY and EMAIL_FROM.');`,
      );
    }
    if (o.email === "preview")
      validation.push(
        `if (value.NODE_ENV === 'production') throw new Error('Local email preview must not be used in production.');`,
      );
    if ((o.verifyEmail || o.passwordReset) && o.email !== "preview")
      validation.push(
        `if (value.NODE_ENV === 'production' && !value.EMAIL_ENABLED) throw new Error('Email authentication actions require enabled email in production.');`,
      );
  }
  if (push) {
    optionalSchema.push(
      `PUSH_ENABLED: flag, FIREBASE_PROJECT_ID: z.string().default(''), FIREBASE_CLIENT_EMAIL: z.string().default(''), FIREBASE_PRIVATE_KEY: z.string().default(''), PUSH_TOKEN_KEY: z.string().default(''), FCM_ANDROID_CHANNEL_ID: z.string().trim().min(1).max(100).default('general'),`,
    );
    envLines.push(
      "PUSH_ENABLED=false",
      "FCM_ANDROID_CHANNEL_ID=general",
      "FIREBASE_PROJECT_ID=",
      "FIREBASE_CLIENT_EMAIL=",
      "FIREBASE_PRIVATE_KEY=",
      "PUSH_TOKEN_KEY=__PUSH_TOKEN_KEY__",
    );
    validation.push(
      `if (value.PUSH_ENABLED && (!/^[a-fA-F0-9]{64}$/.test(value.PUSH_TOKEN_KEY) || (!input.GOOGLE_APPLICATION_CREDENTIALS && (!value.FIREBASE_PROJECT_ID || !value.FIREBASE_CLIENT_EMAIL || !value.FIREBASE_PRIVATE_KEY)))) throw new Error('Enabled push requires Firebase credentials and a 32-byte hex PUSH_TOKEN_KEY.');`,
    );
  }
  if (o.uploads) {
    optionalSchema.push(
      `UPLOADS_ENABLED: flag, CLOUDINARY_CLOUD_NAME: z.string().default(''), CLOUDINARY_API_KEY: z.string().default(''), CLOUDINARY_API_SECRET: z.string().default(''), MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(10).default(5),`,
    );
    envLines.push(
      "UPLOADS_ENABLED=false",
      "CLOUDINARY_CLOUD_NAME=",
      "CLOUDINARY_API_KEY=",
      "CLOUDINARY_API_SECRET=",
      "MAX_UPLOAD_MB=5",
    );
    validation.push(
      `if (value.UPLOADS_ENABLED && (!value.CLOUDINARY_CLOUD_NAME || !value.CLOUDINARY_API_KEY || !value.CLOUDINARY_API_SECRET)) throw new Error('Enabled uploads require Cloudinary credentials.');`,
    );
  }
  if (o.database === "mysql")
    envLines.push(
      'SHADOW_DATABASE_URL="mysql://gold:gold-local-password@localhost:3306/gold_shadow"',
    );
  const example = `${envLines.join("\n")}\n`;
  files[".env.example"] = example
    .replace("__JWT_SECRET__", "<generate-at-least-64-random-characters>")
    .replace("__CSRF_SECRET__", "<generate-a-separate-random-secret>")
    .replace(
      "__PUSH_TOKEN_KEY__",
      "<generate-32-random-bytes-as-64-hex-characters>",
    );
  files[".env"] = example
    .replace("__JWT_SECRET__", secrets.jwt)
    .replace("__CSRF_SECRET__", secrets.cookie)
    .replace("__PUSH_TOKEN_KEY__", randomBytes(32).toString("hex"));
  files["SETUP.md"] = setupGuide(o);
  files["README.md"] =
    `# ${o.displayName.replace(/[\r\n]/g, " ")}\n\nGenerated by Gold Backend. See [SETUP.md](SETUP.md) for configuration and startup.\n\nArchitecture: routes → middleware → controllers → services → Prisma.\nAuthentication and protected routes are included. Selected capabilities are recorded in gold.config.json.\n\nStart at src/server.ts (npm run dev); src/app.ts composes Express. Read docs/development/PROJECT_STRUCTURE.md for the folder map and request flow.\n\nUse npm run format for automatic formatting and npm run verify before committing. Run database integration tests only against a disposable test database; see SETUP.md.\n`;
  if (o.compose) {
    files["compose.yaml"] = compose(o);
    if (o.database === "mysql")
      files["docker/init-shadow.sql"] =
        "CREATE DATABASE IF NOT EXISTS gold_shadow;\nGRANT ALL PRIVILEGES ON gold_shadow.* TO 'gold'@'%';\n";
  }
  if (o.docker) {
    files["Dockerfile"] =
      `FROM node:24-bookworm-slim AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nFROM node:24-bookworm-slim\nWORKDIR /app\nENV NODE_ENV=production\nCOPY --from=build /app/package*.json ./\nRUN npm ci --omit=dev\nCOPY --from=build /app/dist ./dist\nUSER node\nEXPOSE ${o.port}\nCMD ["node", "dist/server.js"]\n`;
    files[".dockerignore"] =
      "node_modules\ndist\n.env\n.env.*\n.git\n.mail-preview\ncoverage\n";
  }
  files[".github/workflows/ci.yml"] = ciWorkflow(o);
  const templateImports = [
    o.verifyEmail &&
      `import { verificationEmailTemplate } from '../../utils/email/templates/verification.js';`,
    o.passwordReset &&
      `import { passwordResetEmailTemplate } from '../../utils/email/templates/password-reset.js';`,
  ]
    .filter(Boolean)
    .join("\n");
  const templateRender = [
    o.verifyEmail &&
      `if (purpose === 'verify') return verificationEmailTemplate(url, expiresInMinutes);`,
    o.passwordReset &&
      `if (purpose === 'reset') return passwordResetEmailTemplate(url, expiresInMinutes);`,
    `throw new BadRequestError('This email action is unavailable', ERROR_CODES.ACTION_TOKEN_INVALID);`,
  ]
    .filter(Boolean)
    .join("\n");
  const slots: Record<string, string> = {
    __SERVICE_FOLDERS__: [
      o.roles === "admin" &&
        "    admin/                    Administrative business rules",
      (push || inbox) &&
        "    notifications/            Selected inbox, devices and push workflows",
      o.uploads &&
        "    uploads/                  Private file ownership and storage",
    ]
      .filter(Boolean)
      .join("\n"),
    __UTILITY_FOLDERS__: [
      o.email !== "none" &&
        "    email/                    Selected sender, reusable layout and action templates",
      push &&
        "    firebase/                 Lazy FCM initialization and encrypted token storage",
    ]
      .filter(Boolean)
      .join("\n"),
    __ADMIN_ROLE__: o.roles === "admin" ? "ADMIN: 'admin'," : "",
    __VERIFY_ERROR_IMPORT__: o.verifyEmail
      ? `import { ForbiddenError } from '../../errors/index.js';`
      : "",
    __UPLOAD_ERROR_IMPORT__: o.uploads
      ? `import { MulterError } from 'multer';`
      : "",
    __UPLOAD_ERROR_NORMALIZE__: o.uploads
      ? `if (error instanceof MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') return new PayloadTooLargeError('Upload exceeds the allowed size', ERROR_CODES.UPLOAD_INVALID);
      return new BadRequestError('Upload exceeds the allowed count or format', ERROR_CODES.UPLOAD_INVALID);
    }`
      : "",
    __ACTION_TEMPLATE_IMPORTS__: templateImports,
    __ACTION_TEMPLATE_RENDER__: templateRender,
    __NOTIFICATION_IMPORTS__: [
      inbox && `import { createNotification } from './inbox.service.js';`,
      push && `import { sendPush } from './push.service.js';`,
    ]
      .filter(Boolean)
      .join("\n"),
    __SAVE_NOTIFICATION__: inbox
      ? "await createNotification(userId, notification);"
      : "",
    __SEND_NOTIFICATION__: push
      ? `try { const push = await sendPush(userId, notification); return { inbox: '${inbox ? "saved" : "disabled"}', push }; } catch { return { inbox: '${inbox ? "saved" : "disabled"}', push: { outcome: 'failed', accepted: 0 } }; }`
      : `return { inbox: 'saved', push: { outcome: 'skipped', accepted: 0 } };`,
    __NOTIFICATION_TEST_SETUP__: [
      inbox &&
        `const inbox = vi.hoisted(() => ({ createNotification: vi.fn().mockResolvedValue({ id: 'notification-id' }) })); vi.mock('../../src/services/notifications/inbox.service.js', () => inbox);`,
      push &&
        `const push = vi.hoisted(() => ({ sendPush: vi.fn().mockResolvedValue({ outcome: 'accepted', accepted: 1 }) })); vi.mock('../../src/services/notifications/push.service.js', () => push);`,
    ]
      .filter(Boolean)
      .join("\n"),
    __NOTIFICATION_TEST_ASSERT__: `expect(result).toEqual({ inbox: '${inbox ? "saved" : "disabled"}', push: { outcome: '${push ? "accepted" : "skipped"}', accepted: ${push ? 1 : 0} } }); ${inbox ? "expect(inbox.createNotification).toHaveBeenCalledWith('user-id', expect.objectContaining({ title: 'Account update' }));" : ""} ${push ? "expect(push.sendPush).toHaveBeenCalledWith('user-id', expect.objectContaining({ data: { screen: 'inbox' } }));" : ""} ${inbox && push ? "expect(inbox.createNotification.mock.invocationCallOrder[0]).toBeLessThan(push.sendPush.mock.invocationCallOrder[0]!);" : ""}`,
    __NOTIFICATION_FAILURE_TEST__: push
      ? `it('reports push failures without discarding saved inbox state', async () => { push.sendPush.mockRejectedValueOnce(new Error('private provider failure')); const result = await notifyUser('user-id', { title: 'Update', body: 'Ready' }); expect(result).toEqual({ inbox: '${inbox ? "saved" : "disabled"}', push: { outcome: 'failed', accepted: 0 } }); ${inbox ? "expect(inbox.createNotification).toHaveBeenCalledTimes(1);" : ""} });`
      : "",

    __ACTION_ROUTE_IMPORTS__: actions
      ? `import { ${actionNames.join(", ")} } from '../controllers/action.controller.js';\nimport { ${schemaNames.join(", ")} } from '../validators/auth.schema.js';`
      : "",
    __ACTION_ROUTES__: actionRoutes.join("\n"),
    __ACTION_SCHEMAS__: actionSchemas.join("\n"),
    __ACTION_CONTROLLERS__: actionControllers.join("\n"),
    __ACTION_CONTROLLER_IMPORTS__: actions
      ? `import { ${schemaNames.join(", ")} } from '../validators/auth.schema.js';`
      : "",
    __CONTRACT_IMPORTS__: contractImports.join("\n"),
    __FEATURE_CONTRACTS__: contractGroups.join(" "),
    __ACTION_CONTRACTS__: actionContracts.join("\n"),
    __DOCS_TEST_ASSERTIONS__: [
      swagger &&
        `const openapi = buildOpenApi(); expect(buildOpenApi()).toEqual(openapi); expect(Object.values(openapi.paths).flatMap((methods) => Object.values(methods))).toHaveLength(apiContracts.length);`,
      postman &&
        `const collection = buildPostman(); expect(buildPostman()).toEqual(collection); expect(buildPostmanEnvironment()).toEqual(buildPostmanEnvironment()); expect(collection.item.flatMap((group) => group.item)).toHaveLength(apiContracts.length);`,
    ]
      .filter(Boolean)
      .join("\n"),
    __ROUTER_TEST_IMPORTS__: routerTestImports.join("\n"),
    __ROUTER_TEST_GROUPS__: routerTestGroups.join(", "),
    __TEST_DATABASE_URL__:
      o.database === "mysql"
        ? "mysql://test:test@127.0.0.1:1/gold_test_unit"
        : "postgresql://test:test@127.0.0.1:1/gold_test_unit",
    __ACTION_TEST_PURPOSE__: o.passwordReset ? "reset" : "verify",
    __ACTION_TEST_ASSERT__: o.passwordReset
      ? `await expect(authenticateAccess(tokens.accessToken)).rejects.toMatchObject({ statusCode: 401 }); const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } }); expect(await verifyPassword('new-action-password-12345', updated.passwordHash)).toBe(true);`
      : `expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBe(true);`,
    __TEST_EMAIL_ENABLED__: o.email === "preview" ? "true" : "false",
    __SIGNUP_INTEGRATION_ASSERT__:
      o.verifyEmail && o.email !== "preview"
        ? "expect([201, 503]).toContain(first.status);"
        : "expect(first.status).toBe(201); expect(first.body.data.user.role).toBe('user'); expect(first.body.data.user.passwordHash).toBeUndefined();",
    __DOCTOR_PROVIDERS__: [
      o.email !== "none" &&
        "console.log('Email: selected; check EMAIL_ENABLED and provider settings in SETUP.md.');",
      push &&
        "console.log('Firebase: selected; client registration and delivery have not been checked.');",
      o.uploads &&
        "console.log('Cloudinary: selected; file operations have not been checked.');",
    ]
      .filter(Boolean)
      .join("\n"),
    __COOKIE_INTEGRATION_TEST__:
      o.clients !== "mobile"
        ? `it('requires CSRF for cookie mutations and refresh', async () => { const { user } = await account(); const login = await request(app).post('/api/auth/login').set('Origin', ${JSON.stringify(o.origins.split(",")[0])}).set('X-Auth-Transport', 'cookie').send({ email: user.email, password }); expect(login.status).toBe(200); expect(login.body.data.access_token).toBeUndefined(); const cookies = login.headers['set-cookie'] as unknown as string[]; const cookie = cookies.map((value) => value.split(';')[0]).join('; '); const csrf = cookies.find((value) => value.startsWith('csrfToken='))!.split(';')[0]!.slice('csrfToken='.length); expect((await request(app).post('/api/auth/logout').set('Cookie', cookie).set('Origin', ${JSON.stringify(o.origins.split(",")[0])})).status).toBe(403); expect((await request(app).post('/api/auth/refresh').set('Cookie', cookie).set('Origin', ${JSON.stringify(o.origins.split(",")[0])}).set('X-Auth-Transport', 'cookie').send({})).status).toBe(403); expect((await request(app).post('/api/auth/refresh').set('Cookie', cookie).set('Origin', ${JSON.stringify(o.origins.split(",")[0])}).set('X-Auth-Transport', 'cookie').set('X-CSRF-Token', decodeURIComponent(csrf)).send({})).status).toBe(200); });`
        : "",
    __ADMIN_INTEGRATION_TEST__:
      o.roles === "admin"
        ? `it('enforces current persisted admin roles', async () => { const { user, tokens } = await account(); expect((await request(app).get('/api/admin/users').auth(tokens.accessToken, { type: 'bearer' })).status).toBe(403); await prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } }); const result = await request(app).get('/api/admin/users').auth(tokens.accessToken, { type: 'bearer' }); expect(result.status).toBe(200); expect(result.body.data[0].passwordHash).toBeUndefined(); await prisma.user.update({ where: { id: user.id }, data: { role: 'user' } }); expect((await request(app).get('/api/admin/users').auth(tokens.accessToken, { type: 'bearer' })).status).toBe(403); });`
        : "",
    __PORT__: String(o.port),
    __PROJECT_NAME__: o.name,
    __PROJECT_NAME_JSON__: JSON.stringify(o.name),
    __DISPLAY_NAME_JSON__: JSON.stringify(o.displayName),
    __DATABASE__: o.database,
    __DATABASE_PROTOCOLS__: JSON.stringify(
      o.database === "mysql" ? ["mysql:"] : ["postgres:", "postgresql:"],
    ),
    __OPTIONAL_ENV_SCHEMA__: optionalSchema.join("\n"),
    __OPTIONAL_ENV_VALIDATION__: validation.join("\n"),
    __ACTION_IMPORT__: o.verifyEmail
      ? `import { requestAction } from './action.service.js';`
      : "",
    __SIGNUP_EMAIL__: o.verifyEmail
      ? `await requestAction(user.email, 'verify');`
      : "",
    __EMAIL_VERIFIED_DEFAULT__: String(!o.verifyEmail),
    __VERIFY_ACCESS_EMAIL__: o.verifyEmail
      ? `if (!session.user.emailVerified) throw new ForbiddenError('Please verify your email before continuing', ERROR_CODES.EMAIL_NOT_VERIFIED);`
      : "",
    __VERIFY_EMAIL_LOGIN__: o.verifyEmail
      ? `if (!user.emailVerified) throw new ForbiddenError('Please verify your email before signing in', ERROR_CODES.EMAIL_NOT_VERIFIED);`
      : "",
    __DOCS_IMPORT__: swagger
      ? `import swaggerUi from 'swagger-ui-express';\nimport { buildOpenApi } from './utils/openapi.js';`
      : "",
    __DOCS_MOUNT__: swagger
      ? `if (env.DOCS_ENABLED && env.NODE_ENV !== 'production') app.use('/docs', swaggerUi.serve, swaggerUi.setup(buildOpenApi()));`
      : "",
    __SOCKET_IMPORT__: o.socket
      ? `import { attachSockets } from './sockets/index.js';`
      : "",
    __SOCKET_START__: o.socket ? "const io = attachSockets(server);" : "",
    __SOCKET_STOP__: o.socket
      ? "io.disconnectSockets(true);\n    await new Promise<void>((resolve) => io.close(() => resolve()));"
      : "",
    __DOCS_BUILD_IMPORTS__: [
      swagger && "buildOpenApi",
      postman && "buildPostman",
      postman && "buildPostmanEnvironment",
    ]
      .filter(Boolean)
      .join(", "),
    __DOCS_EXPORTS__: `${swagger ? "await writeFile('docs/api/openapi.json', JSON.stringify(buildOpenApi(), null, 2) + '\\n');" : ""}\n${postman ? "await writeFile('docs/api/postman_collection.json', JSON.stringify(buildPostman(), null, 2) + '\\n');\nawait writeFile('docs/api/postman_environment.json', JSON.stringify(buildPostmanEnvironment(), null, 2) + '\\n');" : ""}`,
    __EMAIL_TEST_MOCK__:
      o.email === "smtp"
        ? `const mailMock = vi.hoisted(() => ({ sendMail: vi.fn(), verify: vi.fn() })); vi.mock('nodemailer', () => ({ default: { createTransport: () => mailMock } }));`
        : "",
    __EMAIL_TEST_CASE__:
      o.email === "smtp"
        ? `it('normalizes SMTP acceptance and provider failures', async () => { env.EMAIL_ENABLED = true; mailMock.sendMail.mockResolvedValueOnce({}); expect(await sendEmail(message)).toEqual({ outcome: 'accepted' }); mailMock.sendMail.mockRejectedValueOnce(new Error('private SMTP credential')); await expect(sendEmail(message)).rejects.toMatchObject({ errorCode: 'EMAIL_PROVIDER_ERROR', message: 'The email provider could not accept the message' }); });`
        : o.email === "resend"
          ? `it('normalizes Resend acceptance and provider failures', async () => { env.EMAIL_ENABLED = true; const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 200 })).mockResolvedValueOnce(new Response('private provider data', { status: 500 })); expect(await sendEmail(message)).toEqual({ outcome: 'accepted' }); await expect(sendEmail(message)).rejects.toMatchObject({ errorCode: 'EMAIL_PROVIDER_ERROR' }); expect(fetch).toHaveBeenCalledTimes(2); });`
          : `it('creates a private preview without provider calls', async () => { env.EMAIL_ENABLED = true; const result = await sendEmail(message); expect(result.outcome).toBe('previewed'); const { stat, rm } = await import('node:fs/promises'); expect((await stat(result.previewPath!)).mode & 0o777).toBe(0o600); await rm(result.previewPath!); });`,
    ...mailSlots(o),
  };
  for (const [path, content] of Object.entries(files)) {
    // Substitute once so values containing template-like text remain literal data.
    const result = templatedPaths.has(path)
      ? content.replace(/__[A-Z][A-Z0-9_]+__/g, (slot) => {
          const value = slots[slot];
          if (value === undefined)
            throw new Error(`Unresolved template slot ${slot} in ${path}`);
          return value;
        })
      : content;
    files[path] = /\.(?:ts|js|json|md|ya?ml)$/.test(path)
      ? await format(result, { ...formatting, filepath: path })
      : result;
  }
  return files;
}

function mailSlots(o: ProjectOptions): Record<string, string> {
  const smtp = o.email === "smtp";
  return {
    __MAIL_IMPORT__: smtp
      ? `import nodemailer from 'nodemailer';`
      : o.email === "preview"
        ? `import { previewEmail } from './preview.js';`
        : "",
    __MAIL_ERROR_IMPORT__:
      o.email === "preview"
        ? ""
        : `import { ProviderError, ERROR_CODES } from '../../errors/index.js';`,
    __MAIL_CLIENT__: smtp
      ? `const transport = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE, requireTLS: env.NODE_ENV === 'production', auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });`
      : "",
    __MAIL_SEND__:
      o.email === "preview"
        ? "return previewEmail(message);"
        : smtp
          ? `try { await transport.sendMail({ ...message, from: env.EMAIL_FROM }); return { outcome: 'accepted' }; } catch { throw new ProviderError('The email provider could not accept the message', ERROR_CODES.EMAIL_PROVIDER_ERROR); }`
          : `try { const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: \`Bearer \${env.RESEND_API_KEY}\`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...message, from: env.EMAIL_FROM }), signal: AbortSignal.timeout(15000) }); if (!response.ok) throw new Error('Rejected'); return { outcome: 'accepted' }; } catch { throw new ProviderError('The email provider could not accept the message', ERROR_CODES.EMAIL_PROVIDER_ERROR); }`,
    __MAIL_CHECK__: smtp
      ? `if (!env.EMAIL_ENABLED) return 'disabled'; await transport.verify(); return 'SMTP connection verified; sender acceptance and inbox delivery not checked';`
      : o.email === "preview"
        ? `return 'local preview; no provider connection needed';`
        : `return env.EMAIL_ENABLED ? 'configured; use explicit email:test for a send' : 'disabled';`,
  };
}
