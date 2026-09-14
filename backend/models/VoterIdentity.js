import mongoose from 'mongoose';

// Simulates a pre-existing, trusted external voter database (e.g. a
// college's student registry) that the voting system is "connected to" -
// NOT the same thing as a normal application user account. See
// controllers/voterController.js for how records are created and used.
const voterIdentitySchema = new mongoose.Schema(
  {
    voterId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phoneNumber: { type: String, required: true, unique: true, trim: true },

    // One-way HMAC-SHA256 hash of the Aadhaar number (see hashAadhaar in
    // voterController.js). The raw Aadhaar number is NEVER stored here,
    // logged, or returned to any client - this hash exists purely to
    // enforce uniqueness/identity-binding, never to recover the original
    // number. HMAC (keyed with a server secret) is used rather than a bare
    // SHA-256 because a 12-digit Aadhaar number has too small a keyspace
    // (~10^12) for an unkeyed hash to meaningfully resist a
    // lookup/brute-force attack.
    aadhaarHash: { type: String, required: true, unique: true },

    // Simulation flag: true as soon as a record is created via the
    // registry controller, since that controller represents a pre-vetted
    // external database in this simulation. This is only ever set by that
    // controller - it is never read from a request body field a client
    // could supply directly.
    isVerified: { type: Boolean, default: true },

    // Links this registry record to the Clerk account that completed
    // voter login for it. Set once, server-side, on first successful
    // voter login (see sendVoterOtp) - never client-suppliable, and
    // enforced 1:1 in both directions (one voter record <-> one Clerk
    // account).
    clerkId: { type: String, unique: true, sparse: true },

    // OTP state. select:false so a plain .find()/.findOne() never
    // accidentally includes the hash in a response - callers must
    // explicitly .select('+otpHash +otpExpiresAt') when the verify step
    // needs it.
    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    lastOtpSentAt: { type: Date }, // for resend cooldown
    failedOtpAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    // True once the CURRENT otp has been verified; a fresh OTP send resets
    // this to false, so it always reflects "has this specific login
    // completed its OTP step".
    otpVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('VoterIdentity', voterIdentitySchema);
