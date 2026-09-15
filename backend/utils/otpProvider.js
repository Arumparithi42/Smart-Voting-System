// Abstracts "send this OTP to this phone number" behind a swappable
// provider, selected via OTP_PROVIDER in the environment. No API keys are
// hard-coded anywhere - a real provider reads its credentials from env
// vars.
import twilio from 'twilio';
export async function sendOtp(phoneNumber, otp) {
  const provider = process.env.OTP_PROVIDER || 'mock';

  if (provider === 'mock') {
    // DEV-ONLY: this is the one place the OTP is allowed to be visible,
    // and only in the server's own console - never in an HTTP response,
    // never in a client-visible log. Set OTP_PROVIDER to a real gateway
    // before any real deployment.
    console.log(`[MOCK OTP PROVIDER] OTP for ${phoneNumber}: ${otp} (valid 5 minutes) - DEV MODE ONLY, never do this in production`);
    return { provider: 'mock', delivered: true };
  }

  if (provider === 'twilio') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    const countryCode = process.env.OTP_COUNTRY_CODE || '+91';

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio OTP is missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER');
    }

    const normalizedPhone = String(phoneNumber).trim().replace(/\D/g, '');
    const toNumber = normalizedPhone.startsWith(countryCode.replace('+', ''))
      ? `+${normalizedPhone}`
      : `${countryCode}${normalizedPhone.replace(/^0+/, '')}`;
    const client = twilio(accountSid, authToken);

    await client.messages.create({
      body: `Your Smart Voting System verification code is ${otp}. It expires in 5 minutes.`,
      from: fromNumber,
      to: toNumber,
    });

    return { provider: 'twilio', delivered: true };
  }

  throw new Error(`Unknown OTP_PROVIDER: ${provider}`);
}
