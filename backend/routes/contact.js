import express from 'express';
import { simpleRateLimit } from '../middleware/rateLimit.js';
import { submitContactMessage } from '../controllers/contactController.js';

const router = express.Router();

// Public (no sign-in needed). Rate-limited per IP to stop abuse.
router.post('/', simpleRateLimit({ windowMs: 15 * 60_000, max: Number(process.env.CONTACT_RATE_LIMIT_PER_15MIN || 5), keyPrefix: 'contact' }), submitContactMessage);

export default router;
