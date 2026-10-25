import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../src/utils/prisma.js';
import { consumeAction } from '../../src/services/auth/action.service.js';
import { hashSecret, randomSecret } from '../../src/utils/crypto.js';
import { issueSession, authenticateAccess } from '../../src/services/auth/session.service.js';
import { verifyPassword } from '../../src/utils/password.js';
afterAll(async () => { await prisma.user.deleteMany({ where: { email: { endsWith: '@gold-action-test.invalid' } } }); await prisma.$disconnect(); });
it('allows a password action to be consumed only once concurrently', async () => {
  const user = await prisma.user.create({ data: { name: 'Test', email: `${randomUUID()}@gold-action-test.invalid`, passwordHash: 'unused', emailVerified: true } });
  const tokens = await issueSession(user.id);
  const id = randomUUID(); const secret = randomSecret();
  await prisma.passwordAction.create({ data: { id, userId: user.id, purpose: '__ACTION_TEST_PURPOSE__', secretHash: hashSecret(secret), expiresAt: new Date(Date.now() + 60000) } });
  const results = await Promise.allSettled([consumeAction(`${id}.${secret}`, '__ACTION_TEST_PURPOSE__', 'new-action-password-12345'), consumeAction(`${id}.${secret}`, '__ACTION_TEST_PURPOSE__', 'new-action-password-12345')]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  __ACTION_TEST_ASSERT__
  void tokens; void verifyPassword; void authenticateAccess;
});
