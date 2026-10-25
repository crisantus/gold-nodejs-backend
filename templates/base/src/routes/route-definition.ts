import type { RequestHandler, Router } from 'express';
import type { z } from 'zod';
import { authenticateUser, checkOrigin, requireAdmin } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate-request.js';
import { authLimiter } from '../middlewares/security.js';

export interface RouteDefinition {
  method: 'get' | 'post' | 'patch' | 'delete'; path: string; operationId: string; tag: string; summary: string;
  access: 'public' | 'user' | 'admin'; body?: z.ZodType; query?: z.ZodType; params?: z.ZodType;
  response: z.ZodType; statusCode?: number; sensitive?: boolean; middleware?: RequestHandler[]; handler: RequestHandler;
}
/** One declaration owns runtime binding and exported API metadata. */
export function registerRoutes(router: Router, routes: RouteDefinition[]): void {
  for (const route of routes) {
    const chain: RequestHandler[] = [checkOrigin];
    if (route.sensitive) chain.push(authLimiter);
    if (route.access !== 'public') chain.push(authenticateUser);
    if (route.access === 'admin') chain.push(requireAdmin);
    chain.push(...(route.middleware ?? []), validateRequest(route), route.handler);
    router[route.method](route.path, ...chain);
  }
}
