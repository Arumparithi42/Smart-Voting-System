import { useState, useRef, useEffect } from 'react';
import { useSignIn } from '@clerk/clerk-react';
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
export default function VoterLogin() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();

  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp' | 'locked'
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
    if (!isLoaded) return;

    setSubmitting(true);
    try {
      // Step 1: voterId/email checked against the registry BEFORE the
      // password is even attempted - matches the required error ordering
      // ("Voter ID not found" / "Email not found" / "Invalid user" /
      // "User is not verified" all happen before a password check).
      await axiosInstance.post('/api/voter/check-identity', { voterId, email });

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
        const code = err.errors[0]?.code;
        if (code === 'form_identifier_not_found') {
          setError('No account found for this email. Please sign up first.');
        } else {
          setError('Invalid password');
        }
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
