import crypto from 'crypto';
import VoterIdentity from '../models/VoterIdentity.js';
import { sendOtp as sendOtpSms } from '../utils/otpProvider.js';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 30 * 1000; // 30s between OTP sends
const MAX_OTP_ATTEMPTS = 3;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function hashAadhaar(aadhaarNumber) {
  const secret = process.env.AADHAAR_HASH_SECRET || process.env.RECEIPT_SECRET || process.env.CLERK_SECRET_KEY || 'dev-only-insecure-secret';
  return crypto.createHmac('sha256', secret).update(aadhaarNumber.trim()).digest('hex');
}

function hashOtp(otp) {
  const secret = process.env.OTP_HASH_SECRET || process.env.RECEIPT_SECRET || process.env.CLERK_SECRET_KEY || 'dev-only-insecure-secret';
  return crypto.createHmac('sha256', secret).update(otp).digest('hex');
}

function generateOtp() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

function maskPhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  return `******${digits.slice(-4)}`;
}

function minutesLeft(until) {
  return Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000));
}

// ============================================================
// PART 1 - Voter Registry (simulated trusted college voter database)
// ============================================================

// Admin-only: in a real deployment this data would arrive as a feed from
// the college's own systems, not be entered through this app's own UI by
// arbitrary users - so it stays behind the same requireAdmin used
// elsewhere rather than opening a new, weaker trust boundary. This is
// simulation only: no real Aadhaar/government verification happens here,
// which is why isVerified is unconditionally set true on creation.
export const registerVoterIdentity = async (req, res) => {
  try {
    const { voterId, email, phoneNumber, aadhaarNumber } = req.body;

    if (!voterId || !email || !phoneNumber || !aadhaarNumber) {
      return res.status(400).json({ message: 'voterId, email, phoneNumber and aadhaarNumber are all required' });
    }
    if (!/^\d{12}$/.test(String(aadhaarNumber).trim())) {
      return res.status(400).json({ message: 'Aadhaar number must be exactly 12 digits' });
    }

    const normalizedVoterId = voterId.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phoneNumber.trim();
    // The raw Aadhaar number is used once, right here, to derive a hash,
    // and is never referenced, stored, or logged again after this line.
    const aadhaarHash = hashAadhaar(String(aadhaarNumber));

    const existing = await VoterIdentity.findOne({
      $or: [
        { voterId: normalizedVoterId },
        { email: normalizedEmail },
        { phoneNumber: normalizedPhone },
        { aadhaarHash },
      ],
    });
    if (existing) {
      let field = 'This voter';
      if (existing.voterId === normalizedVoterId) field = 'Voter ID';
      else if (existing.email === normalizedEmail) field = 'Email';
      else if (existing.phoneNumber === normalizedPhone) field = 'Phone number';
      else field = 'Aadhaar number';
      return res.status(409).json({ message: `${field} is already registered` });
    }

    // isVerified is NOT taken from req.body anywhere - it is always true
    // for a record created through this simulated trusted-registry path.
    const voter = await VoterIdentity.create({
      voterId: normalizedVoterId,
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
      aadhaarHash,
      isVerified: true,
    });

    res.status(201).json({
      message: 'Voter registered successfully',
      voter: {
        voterId: voter.voterId,
        email: voter.email,
        phoneNumber: voter.phoneNumber,
        isVerified: voter.isVerified,
        // aadhaarHash and aadhaarNumber are deliberately never included here.
      },
    });
  } catch (error) {
    // error.message from a duplicate-key error only ever contains the
    // HASH value (or other non-sensitive fields), never a raw Aadhaar
    // number, so this is safe to log as-is.
    console.error('Voter registration error:', error.message);
    res.status(500).json({ message: 'Error registering voter' });
  }
};

// ============================================================
// PART 2 - Voter login (Clerk password auth + registry binding + OTP)
// ============================================================

// Step 1 (pre-password UX check, no Clerk session exists yet at this
// point): lets the frontend show "Voter ID not found" / "Email not
// found" / "Invalid user" / "User is not verified" BEFORE the person even
// types a password. This has no side effects (no OTP is generated) and
// every check here is redone, authoritatively, in sendVoterOtp once a
// real Clerk session exists - so skipping or forging a call to this
// endpoint gains an attacker nothing.
export const checkVoterIdentity = async (req, res) => {
  try {
    const { voterId, email } = req.body;
    if (!voterId || !email) {
      return res.status(400).json({ message: 'voterId and email are required' });
    }

    const byVoterId = await VoterIdentity.findOne({ voterId: voterId.trim().toUpperCase() });
    if (!byVoterId) {
      return res.status(404).json({ message: 'Voter ID not found' });
    }

    const byEmail = await VoterIdentity.findOne({ email: email.trim().toLowerCase() });
    if (!byEmail) {
      return res.status(404).json({ message: 'Email not found' });
    }

    if (byVoterId._id.toString() !== byEmail._id.toString()) {
      return res.status(400).json({ message: 'Invalid user' });
    }

    if (!byVoterId.isVerified) {
      return res.status(403).json({ message: 'User is not verified' });
    }

    res.status(200).json({ message: 'ok' });
  } catch (error) {
    res.status(500).json({ message: 'Error checking voter identity' });
  }
};

// Step 2: called AFTER Clerk password authentication has already
// succeeded client-side (requireAuth guarantees req.clerkId is a real,
// verified session). Re-validates identity binding server-side from
// scratch - never trusts the earlier check-identity call - binds this
// Clerk account to the voter registry record on first use, enforces the
// OTP lock/cooldown, and sends a fresh OTP to the REGISTERED phone number
// (never one supplied by the client).
export const sendVoterOtp = async (req, res) => {
  try {
    const clerkId = req.clerkId;
    const { voterId, email } = req.body;

    if (!voterId || !email) {
      return res.status(400).json({ message: 'voterId and email are required' });
    }

    const voter = await VoterIdentity.findOne({ voterId: voterId.trim().toUpperCase() });
    if (!voter) {
      return res.status(404).json({ message: 'Voter ID not found' });
    }
    if (voter.email !== email.trim().toLowerCase()) {
      return res.status(400).json({ message: 'Invalid user' });
    }
    if (!voter.isVerified) {
      return res.status(403).json({ message: 'User is not verified' });
    }

    // One voter registry record <-> one Clerk account, enforced both ways.
    if (voter.clerkId && voter.clerkId !== clerkId) {
      return res.status(403).json({ message: 'This voter ID is already linked to a different account' });
    }

    // An active lock blocks new OTPs entirely - checked before anything
    // else that could reset state.
    if (voter.lockedUntil && voter.lockedUntil > new Date()) {
      return res.status(429).json({
        message: `Too many failed attempts. Please try again after ${minutesLeft(voter.lockedUntil)} minute(s).`,
        lockedUntil: voter.lockedUntil,
      });
    }

    // A lock that has fully expired means a genuinely fresh start.
    if (voter.lockedUntil && voter.lockedUntil <= new Date()) {
      voter.failedOtpAttempts = 0;
      voter.lockedUntil = undefined;
    }

    // Resend cooldown - stops rapid-fire OTP spam. Deliberately does NOT
    // reset failedOtpAttempts on every resend (see note below), so
    // repeatedly requesting a new code can't be used to dodge the 3-strike
    // lock.
    if (voter.lastOtpSentAt && Date.now() - voter.lastOtpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - voter.lastOtpSentAt.getTime())) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSeconds}s before requesting another OTP.` });
    }

    if (!voter.clerkId) {
      voter.clerkId = clerkId;
    }

    const otp = generateOtp();
    voter.otpHash = hashOtp(otp);
    voter.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    voter.lastOtpSentAt = new Date();
    voter.otpVerified = false; // a new OTP invalidates any prior verified state
    await voter.save();

    await sendOtpSms(voter.phoneNumber, otp);

    res.status(200).json({
      message: 'OTP sent to your registered phone number',
      maskedPhone: maskPhone(voter.phoneNumber),
      expiresInSeconds: OTP_TTL_MS / 1000,
    });
  } catch (error) {
    console.error('Send OTP error:', error.message);
    res.status(500).json({ message: 'Error sending OTP' });
  }
};

export const verifyVoterOtp = async (req, res) => {
  try {
    const clerkId = req.clerkId;
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' });
    }

    const voter = await VoterIdentity.findOne({ clerkId }).select('+otpHash +otpExpiresAt');
    if (!voter) {
      return res.status(404).json({ message: 'No voter identity linked to this account' });
    }

    if (voter.lockedUntil && voter.lockedUntil > new Date()) {
      return res.status(429).json({
        message: `Too many failed attempts. Please try again after ${minutesLeft(voter.lockedUntil)} minute(s).`,
        lockedUntil: voter.lockedUntil,
      });
    }

    if (!voter.otpHash || !voter.otpExpiresAt || voter.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
    }

    const submittedHash = hashOtp(String(otp).trim());
    const storedHash = voter.otpHash;
    // Constant-time comparison to avoid a timing side-channel on the hash
    // check (defense in depth - the 3-attempt lock is the primary defense
    // against brute force here).
    const valid =
      submittedHash.length === storedHash.length &&
      crypto.timingSafeEqual(Buffer.from(submittedHash), Buffer.from(storedHash));

    if (!valid) {
      voter.failedOtpAttempts += 1;

      if (voter.failedOtpAttempts >= MAX_OTP_ATTEMPTS) {
        voter.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        voter.otpHash = undefined;
        voter.otpExpiresAt = undefined;
        await voter.save();
        return res.status(429).json({
          message: 'Too many failed attempts. Your account has been temporarily blocked for 30 minutes.',
          lockedUntil: voter.lockedUntil,
        });
      }

      await voter.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    voter.otpVerified = true;
    voter.failedOtpAttempts = 0;
    voter.lockedUntil = undefined;
    voter.otpHash = undefined;
    voter.otpExpiresAt = undefined;
    await voter.save();

    res.status(200).json({ message: 'Verification successful' });
  } catch (error) {
    console.error('Verify OTP error:', error.message);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
};

// Lets the frontend check the CURRENT signed-in user's own voter
// verification state (e.g. on dashboard load, or to redisplay the masked
// phone after a page refresh mid-OTP-flow). Only ever looks at the record
// matching req.clerkId.
export const getVoterStatus = async (req, res) => {
  try {
    const voter = await VoterIdentity.findOne({ clerkId: req.clerkId });
    if (!voter) {
      return res.status(200).json({ linked: false, otpVerified: false });
    }

    const locked = !!(voter.lockedUntil && voter.lockedUntil > new Date());

    res.status(200).json({
      linked: true,
      otpVerified: voter.otpVerified,
      maskedPhone: maskPhone(voter.phoneNumber),
      locked,
      lockedUntil: locked ? voter.lockedUntil : null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking voter status' });
  }
};
