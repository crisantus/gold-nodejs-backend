import { z } from 'zod';
import type { RouteDefinition } from './route-definition.js';
import { signupSchema, loginSchema, refreshSchema, changePasswordSchema, publicUserSchema } from '../validators/auth.schema.js';
import { signUpController, loginController, refreshController, logoutController, meController, changePasswordController } from '../controllers/auth.controller.js';
const sessionResponse = z.object({ user: publicUserSchema, access_token: z.string().optional(), refresh_token: z.string().optional(), access_token_expires_in: z.number() });
/** Only credential entrypoints are public; authenticated account operations are protected. */
export const authRoutes: RouteDefinition[] = [
  { method: 'post', path: '/auth/sign-up', operationId: 'signup', tag: 'Authentication', summary: 'Create a regular user account', access: 'public', sensitive: true, body: signupSchema, response: sessionResponse, statusCode: 201, handler: signUpController },
  { method: 'post', path: '/auth/sign-in', operationId: 'signIn', tag: 'Authentication', summary: 'Sign in', access: 'public', sensitive: true, body: loginSchema, response: sessionResponse, handler: loginController },
  { method: 'post', path: '/auth/login', operationId: 'login', tag: 'Authentication', summary: 'Sign in (login alias)', access: 'public', sensitive: true, body: loginSchema, response: sessionResponse, handler: loginController },
  { method: 'post', path: '/auth/refresh', operationId: 'refreshSession', tag: 'Authentication', summary: 'Rotate a refresh token', access: 'public', sensitive: true, body: refreshSchema, response: sessionResponse, handler: refreshController },
  { method: 'post', path: '/auth/logout', operationId: 'logout', tag: 'Authentication', summary: 'Revoke the current session', access: 'user', response: z.unknown(), handler: logoutController },
  { method: 'get', path: '/auth/me', operationId: 'currentUser', tag: 'Authentication', summary: 'Get the current user', access: 'user', response: publicUserSchema, handler: meController },
  { method: 'patch', path: '/auth/password', operationId: 'changePassword', tag: 'Authentication', summary: 'Change password and revoke sessions', access: 'user', sensitive: true, body: changePasswordSchema, response: z.unknown(), handler: changePasswordController },
];
