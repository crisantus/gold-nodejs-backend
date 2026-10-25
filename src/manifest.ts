import type { ProjectOptions } from "./options.js";

/** Select dependencies and commands only for the requested capabilities. */
export function packageManifest(o: ProjectOptions) {
  const dependencies: Record<string, string> = {
    "@prisma/client": "7.10.1",
    cookie: "^1.0.2",
    cors: "^2.8.5",
    dotenv: "^17.2.0",
    express: "^5.2.1",
    "express-rate-limit": "^8.0.0",
    helmet: "^8.0.0",
    jsonwebtoken: "^9.0.2",
    zod: "^4.0.0",
  };
  if (o.database === "postgresql") {
    dependencies["@prisma/adapter-pg"] = "7.10.1";
    dependencies.pg = "^8.16.0";
  } else {
    dependencies["@prisma/adapter-mariadb"] = "7.10.1";
    dependencies.mariadb = "^3.4.0";
  }
  if (o.email === "smtp") dependencies.nodemailer = "^10.0.1";
  if (["push", "both"].includes(o.notifications))
    dependencies["firebase-admin"] = "^13.10.0";
  if (o.socket) dependencies["socket.io"] = "^4.8.3";
  if (o.uploads) {
    dependencies.cloudinary = "^2.10.0";
    dependencies.multer = "^2.1.1";
    dependencies["file-type"] = "^21.0.0";
  }
  if (["swagger", "both"].includes(o.docs))
    dependencies["swagger-ui-express"] = "^5.0.1";
  const devDependencies: Record<string, string> = {
    "@eslint/js": "^10.0.0",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/node": "^24.0.0",
    "@types/supertest": "^6.0.0",
    eslint: "^10.0.0",
    prettier: "^3.0.0",
    prisma: "7.10.1",
    supertest: "^7.0.0",
    tsx: "^4.0.0",
    typescript: "^5.9.0",
    "typescript-eslint": "^8.0.0",
    vitest: "^4.0.0",
  };
  if (o.socket) devDependencies["socket.io-client"] = "^4.8.3";
  if (o.email === "smtp") devDependencies["@types/nodemailer"] = "^8.0.0";
  if (o.uploads) devDependencies["@types/multer"] = "^2.0.0";
  if (["swagger", "both"].includes(o.docs))
    devDependencies["@types/swagger-ui-express"] = "^4.1.0";
  const scripts: Record<string, string> = {
    dev: "tsx watch src/server.ts",
    "prisma:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    build: "npm run prisma:generate && tsc -p tsconfig.build.json",
    start: "node dist/server.js",
    typecheck: "tsc --noEmit",
    lint: "eslint src tests scripts",
    format: "prettier --write .",
    "format:check": "prettier --check .",
    test: "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    doctor: "tsx scripts/doctor.ts",
    verify:
      "npm run prisma:generate && npm run format:check && npm run lint && npm run typecheck && npm test && npm run build",
  };
  if (o.docs !== "none")
    scripts["docs:generate"] = "tsx scripts/generate-docs.ts";
  if (o.email !== "none") scripts["email:test"] = "tsx scripts/test-email.ts";
  if (o.roles === "admin")
    scripts["admin:bootstrap"] = "tsx scripts/bootstrap-admin.ts";
  return {
    name: o.name,
    version: "0.1.0",
    private: true,
    type: "module",
    engines: { node: ">=22.12.0" },
    scripts,
    dependencies,
    devDependencies,
  };
}
