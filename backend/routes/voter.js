import express from 'express';
import {
  registerVoterIdentity,
  checkVoterIdentity,
  sendVoterOtp,
  verifyVoterOtp,
  getVoterStatus,
} from '../controllers/voterController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { simpleRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// --- Part 1: simulated trusted voter registry ---
// Admin-only - see the comment on registerVoterIdentity for why.
router.post('/registry/register', requireAdmin, registerVoterIdentity);

// --- Part 2: voter login flow ---
// Step 1: pre-password identity check. No Clerk session exists yet at
// this point in the flow, so this is intentionally unauthenticated - it's
// a read-only, side-effect-free lookup, rate-limited to deter enumeration.
router.post(
  '/check-identity',
  simpleRateLimit({ windowMs: 60_000, max: 15, keyPrefix: 'voter-check-identity' }),
  checkVoterIdentity
);

// From here on, Clerk password auth has already succeeded client-side -
// requireAuth enforces a real, verified Clerk session before anything
// below runs.
router.post(
  '/send-otp',
  requireAuth,
  simpleRateLimit({ windowMs: 60_000, max: 5, keyPrefix: 'voter-send-otp' }),
  sendVoterOtp
);

router.post(
  '/verify-otp',
  requireAuth,
  simpleRateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'voter-verify-otp' }),
  verifyVoterOtp
);

router.get('/status', requireAuth, getVoterStatus);

export default router;
