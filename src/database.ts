import type { ProjectOptions } from "./options.js";

/** Emit only the selected database's schema and optional persistent capabilities. */
export function prismaSchema(o: ProjectOptions): string {
  const push = ["push", "both"].includes(o.notifications);
  const inbox = ["inbox", "both"].includes(o.notifications);
  return `generator client {
  provider = "prisma-client"
  output = "../src/generated/prisma"
  moduleFormat = "esm"
  generatedFileExtension = "ts"
  importFileExtension = "js"
}

datasource db {
  provider = "${o.database}"
}

enum Role {
  user
  ${o.roles === "admin" ? "admin" : ""}
}

model User {
  id String @id @default(uuid())
  name String
  email String @unique
  passwordHash String
  role Role @default(user)
  active Boolean @default(true)
  emailVerified Boolean @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  lastAuthenticatedAt DateTime?
  sessions Session[]
  ${o.verifyEmail || o.passwordReset ? "passwordActions PasswordAction[]" : ""}
  ${push ? "devices DeviceToken[]" : ""}
  ${inbox ? "notifications Notification[]" : ""}
  ${o.uploads ? "files FileAsset[]" : ""}
  ${o.roles === "admin" ? "adminAudits AdminAudit[]" : ""}
}

model Session {
  id String @id @default(uuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  idleExpiresAt DateTime
  absoluteExpiresAt DateTime
  revokedAt DateTime?
  tokens RefreshToken[]
  @@index([userId, revokedAt])
}

model RefreshToken {
  id String @id @default(uuid())
  sessionId String
  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  secretHash String @unique
  expiresAt DateTime
  consumedAt DateTime?
  createdAt DateTime @default(now())
  @@index([sessionId])
}
${
  o.verifyEmail || o.passwordReset
    ? `
model PasswordAction {
  id String @id @default(uuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  purpose String
  secretHash String @unique
  expiresAt DateTime
  usedAt DateTime?
  createdAt DateTime @default(now())
  @@index([userId, purpose, createdAt])
}`
    : ""
}
${
  push
    ? `
model DeviceToken {
  id String @id @default(uuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String @unique
  encryptedToken String ${o.database === "mysql" ? "@db.Text" : ""}
  updatedAt DateTime @updatedAt
  @@index([userId])
}`
    : ""
}
${
  inbox
    ? `
model Notification {
  id String @id @default(uuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  title String
  body String ${o.database === "mysql" ? "@db.Text" : ""}
  readAt DateTime?
  createdAt DateTime @default(now())
  @@index([userId, createdAt])
  @@index([userId, readAt])
}`
    : ""
}
${
  o.uploads
    ? `
model FileAsset {
  id String @id @default(uuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  publicId String @unique
  resourceType String
  format String
  size Int
  createdAt DateTime @default(now())
  @@index([userId])
}`
    : ""
}
${
  o.roles === "admin"
    ? `
model AdminBootstrap {
  id String @id
  createdAt DateTime @default(now())
}
model AdminAudit {
  id String @id @default(uuid())
  userId String
  user User @relation(fields: [userId], references: [id], onDelete: Restrict)
  action String
  createdAt DateTime @default(now())
  @@index([userId, createdAt])
}`
    : ""
}
`;
}

/** Match the driver and adapter to the selected provider without a runtime switch. */
export function prismaClient(o: ProjectOptions): string {
  const adapter =
    o.database === "postgresql"
      ? `import { PrismaPg } from '@prisma/adapter-pg';\nconst adapter = new PrismaPg({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000, max: 10 });`
      : `import { PrismaMariaDb } from '@prisma/adapter-mariadb';\nconst url = new URL(env.DATABASE_URL);\nconst adapter = new PrismaMariaDb({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), connectionLimit: 10, connectTimeout: 5000, acquireTimeout: 5000, ssl: url.searchParams.get('ssl') === 'true' ? { rejectUnauthorized: true } : undefined });`;
  return `import { PrismaClient } from '../generated/prisma/client.js';\nimport { env } from '../config/env.js';\n${adapter}\n\n/** One shared client owns the application's connection pool. */\nexport const prisma = new PrismaClient({ adapter });\n`;
}
