import { z } from 'zod';
import type { RouteDefinition } from './route-definition.js';
import { registerDeviceController, removeDeviceController } from '../controllers/device.controller.js';
const body = z.strictObject({ token: z.string().min(20).max(4096) });
/** Device registration is authenticated and never accepts a target user ID. */
export const deviceRoutes: RouteDefinition[] = [
  { method: 'post', path: '/devices', operationId: 'registerDevice', tag: 'Notifications', summary: 'Register this device', access: 'user', sensitive: true, body, response: z.unknown(), handler: registerDeviceController },
  { method: 'delete', path: '/devices', operationId: 'removeDevice', tag: 'Notifications', summary: 'Remove this device', access: 'user', body, response: z.unknown(), handler: removeDeviceController },
];
