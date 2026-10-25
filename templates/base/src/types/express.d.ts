import type { Actor } from './auth.js';
declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
      authTransport?: 'bearer' | 'cookie';
      validated?: { body?: unknown; query?: unknown; params?: unknown };
    }
  }
}
export {};
