import { sendEmail } from '../services/emailService.js';

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;
const oneLine = (value, max) => String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

// Where Contact Us messages are delivered: CONTACT_EMAIL_TO, or - when
// that isn't set - the SMTP account in EMAIL_USER (your own mailbox).
export const contactRecipient = () => {
  const to = (process.env.CONTACT_EMAIL_TO || '').trim() || (process.env.EMAIL_USER || '').trim();
  return EMAIL_RE.test(to) ? to : null;
};

// Public "Contact Us" form -> email to the site owner. The visitor's
// address is set as Reply-To, so you can answer straight from your inbox.
export const submitContactMessage = async (req, res) => {
  try {
    // Spam trap: a hidden field real visitors never fill in. Pretend success.
    if (req.body?.website) return res.status(200).json({ message: 'Thank you! Your message has been sent.' });

    const name = oneLine(req.body?.name, 100);
    const email = oneLine(req.body?.email, 200).toLowerCase();
    const subject = oneLine(req.body?.subject, 200);
    const message = String(req.body?.message ?? '').trim().slice(0, 5000);

    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
    if (!subject) return res.status(400).json({ message: 'Please enter a subject.' });
    if (message.length < 5) return res.status(400).json({ message: 'Please write a message.' });

    const to = contactRecipient();
    if (!to) {
      console.error('Contact form: no recipient. Set CONTACT_EMAIL_TO (or EMAIL_USER) in backend/.env.');
      return res.status(503).json({ message: 'Messages cannot be delivered right now. Please try again later.' });
    }

    await sendEmail({
      to,
      replyTo: email,
      subject: `[eVote Contact] ${subject}`,
      text: [
        'New message from the eVote "Contact Us" form.',
        '',
        `Name:    ${name || '(not given)'}`,
        `Email:   ${email}`,
        `Subject: ${subject}`,
        `Sent:    ${new Date().toUTCString()}`,
        '',
        message,
        '',
        '- Reply to this email to answer the sender directly.',
      ].join('\n'),
    });
    res.status(200).json({ message: 'Thank you! Your message has been sent.' });
  } catch (error) {
    console.error('Contact form email failed:', error.message);
    res.status(502).json({ message: 'Your message could not be sent right now. Please try again later.' });
  }
};
