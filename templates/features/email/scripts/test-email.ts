import { sendEmail } from '../src/services/email.service.js';
const to = process.argv[2];
if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('Usage: npm run email:test -- recipient@example.com');
const result = await sendEmail({ to, subject: 'Gold email configuration test', text: 'Your email provider accepted a Gold test.', html: '<p>Your email provider accepted a Gold test.</p>' });
console.log(JSON.stringify(result));
if (result.outcome === 'skipped') process.exitCode = 1;
