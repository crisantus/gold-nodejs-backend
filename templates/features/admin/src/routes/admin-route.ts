import { z } from 'zod';
import type { RouteDefinition } from './route-definition.js';
import { listUsersController } from '../controllers/admin.controller.js';
/** Administrative routes require the current persisted role, not a signup parameter. */
export const adminRoutes: RouteDefinition[] = [{ method: 'get', path: '/admin/users', operationId: 'listUsers', tag: 'Administration', summary: 'List users', access: 'admin', query: z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }), response: z.array(z.object({ id: z.string(), name: z.string(), email: z.string(), role: z.string(), active: z.boolean(), emailVerified: z.boolean() })), handler: listUsersController }];
