import { afterEach, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import { sendEmail, escapeHtml } from '../../src/services/email.service.js';
__EMAIL_TEST_MOCK__
const initialEnabled = env.EMAIL_ENABLED;
const message = { to: 'test@example.com', subject: 'Test', text: 'Test', html: '<p>Test</p>' };
afterEach(() => { env.EMAIL_ENABLED = initialEnabled; vi.restoreAllMocks(); });
it('reports disabled sends honestly', async () => { env.EMAIL_ENABLED = false; expect(await sendEmail(message)).toEqual({ outcome: 'skipped' }); });
it('escapes template values', () => { expect(escapeHtml('<script>"&')).toBe('&lt;script&gt;&quot;&amp;'); });
__EMAIL_TEST_CASE__
