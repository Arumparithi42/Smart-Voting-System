import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { simpleRateLimit } from '../middleware/rateLimit.js';
import { getProfile, updateProfile } from '../controllers/profileController.js';

const router = express.Router();

router.get('/', requireAuth, getProfile);
router.patch(
  '/',
  requireAuth,
  simpleRateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'profile-update' }),
  updateProfile
);

export default router;
