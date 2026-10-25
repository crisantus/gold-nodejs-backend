import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { io as connect } from 'socket.io-client';
import { attachSockets, emitToUser } from '../../src/sockets/index.js';
import { prisma } from '../../src/utils/prisma.js';
import { issueSession, revokeSession } from '../../src/services/auth/session.service.js';
afterAll(async () => { await prisma.user.deleteMany({ where: { email: { endsWith: '@gold-socket-test.invalid' } } }); await prisma.$disconnect(); });
it('authenticates live events and stops revoked recipients', async () => {
  const user = await prisma.user.create({ data: { name: 'Socket user', email: `${randomUUID()}@gold-socket-test.invalid`, passwordHash: 'unused', emailVerified: true } });
  const tokens = await issueSession(user.id);
  const server = createServer(); const sockets = attachSockets(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No server port');
  const client = connect(`http://127.0.0.1:${address.port}`, { auth: { token: tokens.accessToken }, transports: ['websocket'], reconnection: false });
  try {
    await new Promise<void>((resolve, reject) => { client.once('connect', resolve); client.once('connect_error', reject); });
    const response = await client.timeout(2000).emitWithAck('system:ping', { nonce: 'test' }); expect(response.status).toBe(true);
    const bad = await client.timeout(2000).emitWithAck('system:ping', { nonce: 4 }); expect(bad.errorCode).toBe('VALIDATION_ERROR');
    const received = new Promise<unknown>((resolve) => client.once('test:update', resolve)); await emitToUser(user.id, 'test:update', { count: 1 }); expect(await received).toMatchObject({ status: true, data: { count: 1 } });
    const disconnected = new Promise<void>((resolve) => client.once('disconnect', () => resolve())); await revokeSession(tokens.sessionId); await emitToUser(user.id, 'test:update', {}); await disconnected;
  } finally { client.disconnect(); await new Promise<void>((resolve) => sockets.close(() => resolve())); }
});
