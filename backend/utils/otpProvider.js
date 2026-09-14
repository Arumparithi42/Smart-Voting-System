// Abstracts "send this OTP to this phone number" behind a swappable
// provider, selected via OTP_PROVIDER in the environment. No API keys are
// hard-coded anywhere - a real provider reads its credentials from env
// vars when you implement it.
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
    // Example wiring for a real provider. Left unimplemented on purpose -
    // the project has no SMS dependency installed, and adding one without
    // real credentials to test against isn't useful. To go live:
    //   1. npm install twilio
    //   2. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
    //   3. Implement the actual client.messages.create(...) call here.
    throw new Error('OTP_PROVIDER=twilio is not yet implemented - see comments in utils/otpProvider.js');
  }

  throw new Error(`Unknown OTP_PROVIDER: ${provider}`);
}
