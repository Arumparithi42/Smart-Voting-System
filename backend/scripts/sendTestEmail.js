// Sends one test email using the settings in backend/.env, so you can check
// real email delivery before running an election.
//
//   npm run test-email -- you@example.com
import dotenv from 'dotenv';
import { sendEmail, verifyEmailSetup, getEmailProvider } from '../services/emailService.js';

dotenv.config();

const to = process.argv[2];
if (!to || !to.includes('@')) {
  console.error('Usage: npm run test-email -- you@example.com');
  process.exit(1);
}

console.log(await verifyEmailSetup());
try {
  await sendEmail({
    to,
    subject: 'Smart Voting System - test email',
    text: 'This is a test email from your Smart Voting System. If you received it, result emails will be delivered too.',
    html: '<p>This is a test email from your <strong>Smart Voting System</strong>.</p><p>If you received it, result emails will be delivered too.</p>',
  });
  console.log(getEmailProvider() === 'smtp'
    ? `Sent! Check the inbox (and spam folder) of ${to}.`
    : 'Printed above (console mode). Set EMAIL_PROVIDER=smtp in backend/.env to send for real.');
} catch (error) {
  console.error(`Sending failed: ${error.message}`);
  process.exit(1);
}
