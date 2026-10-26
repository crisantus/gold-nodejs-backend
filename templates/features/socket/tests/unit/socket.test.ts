import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { io as connect, type Socket } from "socket.io-client";
import { USER_ROLE } from "../../src/utils/user-roles.js";
const auth = vi.hoisted(() => ({ authenticateAccess: vi.fn() }));
vi.mock("../../src/services/auth/session.service.js", () => auth);
import { attachSockets, emitToUser } from "../../src/sockets/index.js";

const cleanup: (() => Promise<void>)[] = [];
beforeEach(() => {
  auth.authenticateAccess.mockReset();
  auth.authenticateAccess.mockResolvedValue({
    id: "user-id",
    sessionId: "session-id",
    name: "Test user",
    email: "user@example.com",
    role: USER_ROLE.USER,
    emailVerified: true,
  });
});
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

async function clientFor(token: unknown): Promise<Socket> {
  const server = createServer();
  const sockets = attachSockets(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture port");
  const client = connect(`http://127.0.0.1:${address.port}`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: false,
    autoConnect: false,
  });
  cleanup.push(async () => {
    client.disconnect();
    await new Promise<void>((resolve) => sockets.close(() => resolve()));
  });
  return client;
}

it("returns only safe authentication errors for invalid or malformed credentials", async () => {
  for (const token of ["bad-token", { secret: "private-token" }]) {
    auth.authenticateAccess.mockRejectedValue(new Error("private database/provider detail"));
    const client = await clientFor(token);
    const rejected = new Promise<Error>((resolve) => client.once("connect_error", resolve));
    client.connect();
    const error = await rejected;
    expect(error.message).toBe("Authentication failed");
    expect(JSON.stringify(error)).toContain("SOCKET_UNAUTHORIZED");
    expect(JSON.stringify(error)).not.toContain("private");
  }
});

it("validates events and disconnects revoked recipients before emitting", async () => {
  const client = await clientFor("valid-token");
  const connected = new Promise<void>((resolve, reject) => {
    client.once("connect", resolve);
    client.once("connect_error", reject);
  });
  client.connect();
  await connected;
  const response: unknown = await client
    .timeout(1000)
    .emitWithAck("system:ping", { nonce: "hello" });
  expect(response).toEqual({ status: true, message: "Connected", data: { nonce: "hello" } });
  const invalid: unknown = await client.timeout(1000).emitWithAck("system:ping", { nonce: 42 });
  expect(invalid).toMatchObject({ status: false, errorCode: "VALIDATION_ERROR" });
  const received = vi.fn();
  client.on("update", received);
  auth.authenticateAccess.mockRejectedValue(new Error("revoked session"));
  const disconnected = new Promise<void>((resolve) => client.once("disconnect", () => resolve()));
  await emitToUser("user-id", "update", { private: "payload" });
  await disconnected;
  expect(received).not.toHaveBeenCalled();
});
