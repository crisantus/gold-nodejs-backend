import type { Actor } from "../types/auth.js";
import type { ErrorCode } from "../errors/index.js";

/** Public socket messages share the HTTP envelope without exposing implementation errors. */
export type SocketEnvelope =
  | { status: true; message: string; data?: unknown }
  | { status: false; message: string; errorCode: ErrorCode };
export type PingReply =
  | { status: true; message: string; data: { nonce: string } }
  | { status: false; message: string; errorCode: ErrorCode };
export interface ClientEvents {
  "system:ping": (input: unknown, acknowledge?: (reply: PingReply) => void) => void;
}
export interface ServerEvents {
  [event: string]: (message: SocketEnvelope) => void;
}
export type InterServerEvents = Record<string, never>;
/** Handshake middleware populates these values; connection handlers still check their presence. */
export interface SocketData {
  actor?: Actor;
  token?: string;
}
