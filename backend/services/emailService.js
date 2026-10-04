// Provider-agnostic "send this email" abstraction, selected via
// EMAIL_PROVIDER. No credentials are hard-coded anywhere - the SMTP
// provider reads them from environment variables, and nothing here is ever
// exposed to the frontend.
//
//   EMAIL_PROVIDER=console  (default) - logs the email to the SERVER console
//                           only. Safe for local dev/demo: nothing is sent.
//   EMAIL_PROVIDER=smtp     - sends via any SMTP server / transactional
//                           provider's SMTP relay (Gmail app password,
//                           SendGrid, Mailgun, SES, Brevo, ...) using
//                           EMAIL_HOST / EMAIL_PORT / EMAIL_USER /
//                           EMAIL_PASSWORD / EMAIL_FROM.
//   EMAIL_PROVIDER=disabled - every send fails with a clear error (useful to
//                           exercise the failed-delivery / retry path).
//
// To plug in an HTTP-API provider instead, add a branch to sendEmail() -
// callers only depend on sendEmail({ to, subject, text, html }).
import nodemailer from 'nodemailer';

let smtpTransport = null;
let senderOverride = null;

const getSmtpTransport = () => {
  if (smtpTransport) return smtpTransport;

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('SMTP email is missing EMAIL_HOST, EMAIL_USER or EMAIL_PASSWORD');
  }

  smtpTransport = nodemailer.createTransport({
    host,
    port,
    // Port 465 is implicit TLS; 587/25 upgrade via STARTTLS.
    secure: process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === 'true' : port === 465,
    auth: { user, pass },
  });
  return smtpTransport;
};

export const getEmailProvider = () => (process.env.EMAIL_PROVIDER || 'console').toLowerCase();

export async function sendEmail({ to, subject, text, html }) {
  if (!to) throw new Error('Recipient email address is required');

  if (senderOverride) {
    return senderOverride({ to, subject, text, html });
  }

  const provider = getEmailProvider();

  if (provider === 'console') {
    // DEV-ONLY: nothing leaves the server. Only aggregate result content
    // is ever sent through here, so this log never contains ballot data.
    console.log(`[CONSOLE EMAIL PROVIDER] To: ${to}\nSubject: ${subject}\n${text}\n[end of email - DEV MODE, not actually sent]`);
    return { provider: 'console', delivered: true };
  }

  if (provider === 'smtp') {
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const info = await getSmtpTransport().sendMail({ from, to, subject, text, html });
    return { provider: 'smtp', delivered: true, messageId: info.messageId };
  }

  if (provider === 'disabled') {
    throw new Error('Email delivery is disabled (EMAIL_PROVIDER=disabled)');
  }

  throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`);
}

// Test hook: route every send through a custom function (e.g. to record
// sends or simulate failures). Pass null to restore the configured provider.
export function setEmailSenderOverride(fn) {
  senderOverride = fn;
}
