import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { parse } from "cookie";
import { z } from "zod";
import { allowedOrigins } from "../config/env.js";
import { authenticateAccess } from "../services/auth/session.service.js";
import { UnauthenticatedError, ERROR_CODES } from "../errors/index.js";
import type { ClientEvents, ServerEvents, InterServerEvents, SocketData } from "./socket.types.js";

type GoldSocketServer = Server<ClientEvents, ServerEvents, InterServerEvents, SocketData>;
let activeServer: GoldSocketServer | undefined;
const pingSchema = z.strictObject({ nonce: z.string().max(64) });

/** Socket.IO forwards only this safe message/data when authentication fails. */
class SocketAuthenticationError extends Error {
  readonly data = {
    status: false,
    message: "Please sign in again",
    errorCode: ERROR_CODES.SOCKET_UNAUTHORIZED,
  };
  constructor() {
    super("Authentication failed");
  }
}

/** Attach real-time transport and authorize user rooms through the current persisted session. */
export function attachSockets(httpServer: HttpServer): GoldSocketServer {
  const io = new Server<ClientEvents, ServerEvents, InterServerEvents, SocketData>(httpServer, {
    maxHttpBufferSize: 16384,
    cors: { origin: allowedOrigins, credentials: true },
    allowRequest: (req, callback) =>
      callback(null, !req.headers.origin || allowedOrigins.includes(req.headers.origin)),
  });
  activeServer = io;
  io.use(async (socket, next) => {
    try {
      const auth: unknown = socket.handshake.auth;
      const supplied =
        typeof auth === "object" && auth !== null && "token" in auth ? auth.token : undefined;
      const token =
        typeof supplied === "string"
          ? supplied
          : parse(socket.handshake.headers.cookie ?? "").accessToken;
      if (!token)
        throw new UnauthenticatedError("Please sign in", ERROR_CODES.AUTHENTICATION_REQUIRED);
      socket.data.actor = await authenticateAccess(token);
      socket.data.token = token;
      next();
    } catch {
      next(new SocketAuthenticationError());
    }
  });
  io.on("connection", (socket) => {
    const actor = socket.data.actor;
    const token = socket.data.token;
    if (!actor || !token) {
      socket.disconnect(true);
      return;
    }
    void socket.join(`user:${actor.id}`);
    let windowStarted = Date.now();
    let count = 0;
    // A successful handshake does not grant permanent access: recheck every event.
    socket.use(async (_packet, next) => {
      if (Date.now() - windowStarted > 60000) {
        count = 0;
        windowStarted = Date.now();
      }
      if (++count > 60) {
        socket.disconnect(true);
        return;
      }
      try {
        socket.data.actor = await authenticateAccess(token);
        next();
      } catch {
        socket.disconnect(true);
      }
    });
    // Idle revoked sessions must also lose access to future broadcasts.
    const lifetime = setInterval(() => {
      void authenticateAccess(token).catch(() => socket.disconnect(true));
    }, 30000).unref();
    socket.on("system:ping", (input, acknowledge) => {
      if (typeof acknowledge !== "function") return;
      const parsed = pingSchema.safeParse(input);
      if (!parsed.success) {
        acknowledge({
          status: false,
          message: "Invalid event payload",
          errorCode: ERROR_CODES.VALIDATION_ERROR,
        });
        return;
      }
      acknowledge({ status: true, message: "Connected", data: { nonce: parsed.data.nonce } });
    });
    socket.on("disconnect", () => clearInterval(lifetime));
  });
  return io;
}

/** Emit only to this recipient's still-active sessions; room membership alone is insufficient. */
export async function emitToUser(userId: string, event: string, data: unknown): Promise<void> {
  if (!activeServer) return;
  for (const socket of await activeServer.in(`user:${userId}`).fetchSockets()) {
    const token = socket.data.token;
    if (!token) {
      socket.disconnect(true);
      continue;
    }
    try {
      const actor = await authenticateAccess(token);
      if (actor.id === userId)
        socket.emit(event, { status: true, message: "Update received", data });
    } catch {
      socket.disconnect(true);
    }
  }
}
