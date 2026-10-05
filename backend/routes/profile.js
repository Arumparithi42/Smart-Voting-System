import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { simpleRateLimit } from '../middleware/rateLimit.js';
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  PROFILE_PHOTO_MAX_BYTES,
} from '../controllers/profileController.js';
import { acceptUpload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', requireAuth, getProfile);
router.patch(
  '/',
  requireAuth,
  simpleRateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'profile-update' }),
  updateProfile
);

router.post(
  '/photo',
  requireAuth,
  simpleRateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'profile-photo', keyBy: (req) => req.clerkId }),
  acceptUpload({ field: 'photo', maxBytes: PROFILE_PHOTO_MAX_BYTES }),
  uploadProfilePhoto
);
router.delete('/photo', requireAuth, deleteProfilePhoto);

export default router;
