import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { simpleRateLimit } from '../middleware/rateLimit.js';
import { createFeedback, getMyFeedback } from '../controllers/feedbackController.js';

const router = express.Router();

// Any signed-in user (voter, officer) can send feedback to the Admin and
// see only their own feedback. Admin endpoints live in routes/admin.js.
router.post('/', requireAuth, simpleRateLimit({ windowMs: 60 * 60_000, max: 10, keyPrefix: 'feedback', keyBy: (req) => req.clerkId }), createFeedback);
router.get('/my', requireAuth, getMyFeedback);

export default router;
