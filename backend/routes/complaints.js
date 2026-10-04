import express from 'express';
import {
  createComplaint,
  getMyComplaints,
  getMyComplaintByReference,
} from '../controllers/complaintController.js';
import { requireAuth } from '../middleware/auth.js';
import { simpleRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Any signed-in user can raise a complaint (deliberately NOT gated on
// voter OTP verification - "I can't verify / log in" is itself a valid
// complaint). Complaints are only ever readable by their owner here, and
// by admins via /api/admin/complaints.
router.post(
  '/',
  requireAuth,
  simpleRateLimit({ windowMs: 60 * 60_000, max: 10, keyPrefix: 'complaint-create' }),
  createComplaint
);
router.get('/my', requireAuth, getMyComplaints);
router.get('/my/:referenceId', requireAuth, getMyComplaintByReference);

export default router;
