/**
 * Application entrypoint.
 * Development: npm run dev -> src/server.ts.
 * Production: npm start -> dist/server.js.
 * app.ts builds Express; this file owns the database, HTTP listener and shutdown.
 */
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./utils/prisma.js";
__SOCKET_IMPORT__

/** Connect required dependencies before accepting requests. */
async function startServer(): Promise<void> {
  await prisma.$connect();
  const server = createServer(createApp());
  __SOCKET_START__
  server.headersTimeout = 15000;
  server.requestTimeout = 30000;

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(env.PORT, resolve);
  });
  console.log(`API listening on port ${env.PORT}`);

  let stopping = false;
  /** Stop accepting requests first, then release sockets and database connections. */
  async function shutdown(): Promise<void> {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => {
      server.closeAllConnections();
      process.exit(1);
    }, 10000).unref();

    const drained = new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    __SOCKET_STOP__
    await drained;
    await prisma.$disconnect();
    clearTimeout(deadline);
  }

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => {
      void shutdown()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
  }
}

// Do not print raw startup errors: database/provider messages can contain credentials.
void startServer().catch(async () => {
  console.error("Server startup failed. Check configuration and database availability.");
  await prisma.$disconnect().catch(() => undefined);
  process.exitCode = 1;
});
