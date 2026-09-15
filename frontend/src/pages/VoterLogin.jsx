import { useState, useRef, useEffect } from 'react';
import { useSignIn, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2, Lock } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';

// Voter-only login flow, separate from the admin/general Clerk <SignIn/>
// at /sign-in (which is untouched). Order, exactly as the college-registry
// simulation requires:
//   1. voterId + email checked against the voter registry (no password yet)
//   2. password verified via Clerk itself (custom flow, not the hosted widget)
//   3. registry re-validated server-side + OTP sent to the REGISTERED phone
//   4. OTP verified (3 wrong attempts -> 30 min lock, enforced server-side)
//   5. -> dashboard
//
// Accounts created via Google OAuth (through the /sign-up Clerk widget) have
// no password set, so step 2 above will always fail with "invalid password"
// for them. To fix that without touching the general Clerk widget, this page
// also offers a "Forgot / set password" sub-flow that uses Clerk's own
// reset-password-by-email-code mechanism - this works even when the account
// never had a password before, since it's Clerk that sets the new one after
// verifying the emailed code (see 'reset-request' / 'reset-verify' steps).
export default function VoterLogin() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const navigate = useNavigate();

  // 'credentials' | 'reset-request' | 'reset-verify' | 'otp' | 'locked'
  const [step, setStep] = useState('credentials');
  const [voterId, setVoterId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [lockCountdown, setLockCountdown] = useState('');

  // Reset-password sub-flow state
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [needsSecondFactor, setNeedsSecondFactor] = useState(false);

  const cooldownRef = useRef(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const diff = new Date(lockedUntil).getTime() - Date.now();
      if (diff <= 0) {
        setLockCountdown('');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setLockCountdown(`${mins}m ${secs}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const sendOtp = async () => {
    const response = await axiosInstance.post('/api/voter/send-otp', { voterId, email });
    setMaskedPhone(response.data.maskedPhone);
    setStep('otp');
    setResendCooldown(30);
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!voterId.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!isLoaded || !isUserLoaded) return;

    setSubmitting(true);
    try {
      // Step 1: voterId/email checked against the registry BEFORE the
      // password is even attempted - matches the required error ordering
      // ("Voter ID not found" / "Email not found" / "Invalid user" /
      // "User is not verified" all happen before a password check).
      await axiosInstance.post('/api/voter/check-identity', { voterId, email });

      // Clerk rejects signIn.create when another session is already active.
      // Reuse it only when it belongs to the same email entered for this voter.
      if (isSignedIn) {
        const signedInEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
        if (signedInEmail !== email.trim().toLowerCase()) {
          setError('You are signed in with a different Clerk account. Please sign out and use the voter email.');
          return;
        }
        await sendOtp();
        return;
      }

      // Step 2: password verified via Clerk's own backend, through a
      // custom (non-hosted-widget) flow - this is still "the existing
      // Clerk authentication", just with our own form UI in front of it.
      const result = await signIn.create({ identifier: email, password });

      if (result.status !== 'complete') {
        setError('Additional verification is required for this account. Please contact an administrator.');
        setSubmitting(false);
        return;
      }

      await setActive({ session: result.createdSessionId });

      // Step 3: now that a real Clerk session exists, re-validate identity
      // server-side and send the OTP. axiosInstance automatically attaches
      // the fresh Clerk token to this request.
      await sendOtp();
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      if (backendMessage) {
        setError(backendMessage);
      } else if (err.errors?.length) {
        // Clerk-shaped error (from signIn.create)
        const clerkError = err.errors[0];
        const code = clerkError?.code;
        if (code === 'form_identifier_not_found') {
          setError('No account found for this email. Please sign up first.');
        } else if (code === 'form_password_incorrect') {
          setError('Incorrect Clerk password. If you signed up with Google, use the password reset link below to set a password first.');
        } else {
          setError(clerkError?.longMessage || clerkError?.message || 'Unable to sign in with this Clerk account.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Step A: kick off Clerk's reset-password-by-email-code flow. This is
  // also how a Google-OAuth account (which has no password) gets its first
  // password set - Clerk doesn't require an existing password for this,
  // only a verified code sent to the account's email.
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');

    if (!voterId.trim() || !email.trim()) {
      setError('Enter your Voter ID and email first.');
      return;
    }
    if (!isLoaded) return;

    setSubmitting(true);
    try {
      // Keep the same registry-first ordering as the normal login path.
      await axiosInstance.post('/api/voter/check-identity', { voterId, email });

      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setStep('reset-verify');
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      if (backendMessage) {
        setError(backendMessage);
      } else if (err.errors?.length) {
        setError(err.errors[0]?.longMessage || 'Could not send reset code.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Step B: verify the emailed code and set the new password in one call.
  const handleResetVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (!resetCode.trim() || !newPassword) {
      setError('Enter the code and a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: resetCode.trim(),
        password: newPassword,
      });

      if (result.status === 'needs_second_factor') {
        setNeedsSecondFactor(true);
        setSubmitting(false);
        return;
      }

      if (result.status !== 'complete') {
        setError('Additional verification is required for this account. Please contact an administrator.');
        setSubmitting(false);
        return;
      }

      await setActive({ session: result.createdSessionId });
      // Password is now set and the user has a real Clerk session - continue
      // straight into the same OTP step the normal password login uses.
      await sendOtp();
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      if (backendMessage) {
        setError(backendMessage);
      } else if (err.errors?.length) {
        setError(err.errors[0]?.longMessage || 'Invalid or expired code.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) {
      setError('Please enter the OTP.');
      return;
    }

    setSubmitting(true);
    try {
      await axiosInstance.post('/api/voter/verify-otp', { otp: otp.trim() });
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid OTP';
      const until = err.response?.data?.lockedUntil;
      if (until) {
        setLockedUntil(until);
        setStep('locked');
      }
      setError(message);
      setOtp('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setSubmitting(true);
    try {
      await sendOtp();
    } catch (err) {
      const message = err.response?.data?.message || 'Could not resend OTP.';
      const until = err.response?.data?.lockedUntil;
      if (until) {
        setLockedUntil(until);
        setStep('locked');
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-yellow-100 via-yellow-100 to-white text-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-6 h-6 text-[#1e3a8a]" />
          <h1 className="text-2xl font-bold text-[#1e3a8a]">Voter Login</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          For registered voters only. Admins should use the regular sign-in page.
        </p>

        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voter ID / Register Number</label>
              <input
                type="text"
                value={voterId}
                onChange={(e) => setVoterId(e.target.value)}
                placeholder="MIT23CS001"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full font-semibold bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90 transition-colors flex items-center justify-center disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep('reset-request');
              }}
              className="w-full text-sm text-blue-700 hover:underline"
            >
              Forgot password? / Signed up with Google and need to set one?
            </button>
          </form>
        )}

        {step === 'reset-request' && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <p className="text-sm text-gray-600">
              We'll email a verification code to <span className="font-medium">{email || 'your registered email'}</span>.
              Enter it on the next screen to set (or reset) your voter login password - this works
              even if you originally signed up with Google and have never had a password.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full font-semibold bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90 transition-colors flex items-center justify-center disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Code'}
            </button>
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep('credentials');
              }}
              className="w-full text-sm text-blue-700 hover:underline"
            >
              Back to login
            </button>
          </form>
        )}

        {step === 'reset-verify' && (
          <form onSubmit={handleResetVerify} className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter the code we emailed you and choose a new password.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            {needsSecondFactor && (
              <p className="text-sm text-amber-600">
                This account requires additional verification that isn't supported here. Please contact an administrator.
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full font-semibold bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90 transition-colors flex items-center justify-center disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Set Password & Continue'}
            </button>
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep('credentials');
              }}
              className="w-full text-sm text-blue-700 hover:underline"
            >
              Back to login
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">
              We sent a verification code to your registered phone number
              {maskedPhone && <> (<span className="font-mono">{maskedPhone}</span>)</>}.
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="______"
              className="w-full text-center text-2xl tracking-[0.5em] font-mono border border-gray-300 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full font-semibold bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90 transition-colors flex items-center justify-center disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify OTP'}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || submitting}
              className="w-full text-sm text-blue-700 hover:underline disabled:text-gray-400 disabled:no-underline"
            >
              {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
            </button>
          </form>
        )}

        {step === 'locked' && (
          <div className="text-center py-4">
            <Lock className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="font-medium text-red-700 mb-1">Too many failed attempts</p>
            <p className="text-sm text-gray-500">
              Your account is temporarily blocked{lockCountdown && <> - try again in <span className="font-mono">{lockCountdown}</span></>}.
            </p>
          </div>
        )}

        {error && step !== 'locked' && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
