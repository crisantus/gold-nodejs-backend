import 'dotenv/config';
import { z } from 'zod';
import { features } from './features.js';

const flag = z.enum(['true', 'false']).default('false').transform((v) => v === 'true');
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(__PORT__),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(64),
  CSRF_SECRET: z.string().min(64),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  ACCESS_TOKEN_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_IDLE_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  REFRESH_ABSOLUTE_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  API_BASE_URL: z.string().url().default('http://localhost:__PORT__'),
  WEB_APP_URL: z.string().url().default('http://localhost:3000'),
  DOCS_ENABLED: flag,
  __OPTIONAL_ENV_SCHEMA__
});

/** Validate configuration without printing secret values on failure. */
export function loadEnvironment(input: NodeJS.ProcessEnv) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid environment settings: ${[...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))].join(', ')}`);
  const value = parsed.data;
  const db = new URL(value.DATABASE_URL);
  if (!__DATABASE_PROTOCOLS__.includes(db.protocol)) throw new Error('DATABASE_URL must match the selected __DATABASE__ provider.');
  if (value.REFRESH_IDLE_DAYS > value.REFRESH_ABSOLUTE_DAYS) throw new Error('REFRESH_IDLE_DAYS must not exceed REFRESH_ABSOLUTE_DAYS.');
  if (value.NODE_ENV === 'production' && (!value.CORS_ORIGINS.trim() || value.CORS_ORIGINS.includes('*'))) throw new Error('Production requires explicit CORS_ORIGINS.');
  __OPTIONAL_ENV_VALIDATION__
  return value;
}
export const env = loadEnvironment(process.env);
export const allowedOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
export const tokenIssuer = __PROJECT_NAME_JSON__;
export const tokenAudience = `${tokenIssuer}:api`;
// Keep selected features available for diagnostics without leaking environment values.
export { features };
