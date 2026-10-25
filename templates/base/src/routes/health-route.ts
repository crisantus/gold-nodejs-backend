import { z } from 'zod';
import type { RouteDefinition } from './route-definition.js';
import { health, ready } from '../controllers/health.controller.js';
/** Health exceptions are public so process supervisors can inspect the service. */
export const healthRoutes: RouteDefinition[] = [
  { method: 'get', path: '/health', operationId: 'health', tag: 'Health', summary: 'Process liveness', access: 'public', response: z.object({ service: z.string() }), handler: health },
  { method: 'get', path: '/ready', operationId: 'readiness', tag: 'Health', summary: 'Database readiness', access: 'public', response: z.unknown(), handler: ready },
];
