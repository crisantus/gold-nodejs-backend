import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { parse } from 'cookie';
import { z } from 'zod';
import { allowedOrigins } from '../config/env.js';
import { authenticateAccess } from '../services/auth/session.service.js';
import { AppError } from '../errors/app-error.js';

let activeServer: Server | undefined;
const pingSchema = z.strictObject({ nonce: z.string().max(64) });
/** Attach real-time transport to the HTTP server and authorize user rooms server-side. */
export function attachSockets(httpServer: HttpServer): Server {
  const io = new Server(httpServer, { maxHttpBufferSize: 16384, cors: { origin: allowedOrigins, credentials: true }, allowRequest: (req, callback) => callback(null, !req.headers.origin || allowedOrigins.includes(req.headers.origin)) });
  activeServer = io;
  io.use(async (socket, next) => {
    try {
      const value: unknown = socket.handshake.auth.token;
      const token = typeof value === 'string' ? value : parse(socket.handshake.headers.cookie ?? '').accessToken;
      if (!token) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Please sign in');
      const actor = await authenticateAccess(token);
      socket.data.actor = actor;
      socket.data.token = token;
      next();
    } catch { const error = new Error('Authentication failed') as Error & { data?: unknown }; error.data = { status: false, message: 'Please sign in again', errorCode: 'SOCKET_UNAUTHORIZED' }; next(error); }
  });
  io.on('connection', (socket) => {
    void socket.join(`user:${socket.data.actor.id as string}`);
    let windowStarted = Date.now(); let count = 0;
    // Every event rechecks the session; successful handshake does not grant permanent access.
    socket.use(async (_packet, next) => {
      if (Date.now() - windowStarted > 60000) { count = 0; windowStarted = Date.now(); }
      if (++count > 60) { socket.disconnect(true); return; }
      try { socket.data.actor = await authenticateAccess(socket.data.token as string); next(); } catch { socket.disconnect(true); }
    });
    // A bounded lifetime also prevents idle revoked connections from receiving future broadcasts.
    const lifetime = setInterval(() => { void authenticateAccess(socket.data.token as string).catch(() => socket.disconnect(true)); }, 30000).unref();
    socket.on('system:ping', (input: unknown, acknowledge: unknown) => {
      if (typeof acknowledge !== 'function') return;
      const parsed = pingSchema.safeParse(input);
      acknowledge(parsed.success ? { status: true, message: 'Connected', data: { nonce: parsed.data.nonce } } : { status: false, message: 'Invalid event payload', errorCode: 'VALIDATION_ERROR' });
    });
    socket.on('disconnect', () => clearInterval(lifetime));
  });
  return io;
}

/** Internal services emit to validated active recipients, not arbitrary caller-selected rooms. */
export async function emitToUser(userId: string, event: string, data: unknown): Promise<void> {
  if (!activeServer) return;
  for (const socket of await activeServer.in(`user:${userId}`).fetchSockets()) {
    try { const actor = await authenticateAccess(socket.data.token as string); if (actor.id === userId) socket.emit(event, { status: true, message: 'Update received', data }); }
    catch { socket.disconnect(true); }
  }
}
