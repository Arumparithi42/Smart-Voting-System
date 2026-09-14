import { getAuth } from '@clerk/express';
import User from '../models/User.js';
import VoterIdentity from '../models/VoterIdentity.js';

/**
 * Requires a valid Clerk session. Populates req.clerkId from the verified
 * token (never trust a clerkId sent in the request body/params for this).
 */
export const requireAuth = (req, res, next) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  req.clerkId = userId;
  next();
};

/**
 * Requires a valid Clerk session AND a matching User document in our DB
 * with role === 'admin'. Must run after (or alongside) requireAuth.
 * This is the actual authorization check for admin-only routes -
 * the frontend's role display is for UX only and must never be trusted.
 */
export const requireAdmin = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findOne({ clerkId: userId });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.clerkId = userId;
    req.dbUser = user;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error verifying admin access', error: error.message });
  }
};

/**
 * Requires a valid Clerk session AND (for non-admins) a completed voter
 * registry + OTP verification - see controllers/voterController.js and
 * routes/voter.js for that flow. This is what the voting routes actually
 * trust as "this is a real, eligible, phone-OTP-confirmed voter", on top
 * of (not instead of) requireAuth's Clerk session check.
 *
 * Admins are intentionally exempt: the voter registry / OTP flow is a
 * VOTER-only requirement per the project spec, and admin authorization is
 * governed entirely by requireAdmin above - this middleware never grants
 * or checks admin access, and an admin account is never auto-created or
 * auto-approved from a voter registry record.
 */
export const requireVoterVerified = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findOne({ clerkId: userId });
    if (user?.role === 'admin') {
      req.clerkId = userId;
      return next();
    }

    const voter = await VoterIdentity.findOne({ clerkId: userId });
    if (!voter || !voter.otpVerified) {
      return res.status(403).json({
        message: 'Please complete voter verification (voter ID, email and phone OTP) before voting.',
      });
    }

    req.clerkId = userId;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error verifying voter status', error: error.message });
  }
};
