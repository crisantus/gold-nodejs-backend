import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './utils/prisma.js';
__SOCKET_IMPORT__

/** Accept traffic only after database initialization and bound shutdown time. */
async function start(): Promise<void> {
  await prisma.$connect();
  const server = createServer(createApp());
  __SOCKET_START__
  server.headersTimeout = 15000;
  server.requestTimeout = 30000;
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(env.PORT, resolve); });
  console.log(`API listening on port ${env.PORT}`);
  let stopping = false;
  async function shutdown(): Promise<void> {
    if (stopping) return; stopping = true;
    const deadline = setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 10000).unref();
    __SOCKET_STOP__
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect(); clearTimeout(deadline);
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void shutdown().then(() => process.exit(0)).catch(() => process.exit(1)); });
}
start().catch(async () => { console.error('Server startup failed. Check configuration and database availability.'); await prisma.$disconnect().catch(() => undefined); process.exitCode = 1; });
