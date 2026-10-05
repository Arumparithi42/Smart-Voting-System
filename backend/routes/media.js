import express from 'express';
import { serveProfilePhoto } from '../controllers/profileController.js';

const router = express.Router();

// Public profile photos (random-token URLs). Complaint attachments are NOT
// served here - see routes/complaints.js (owner/admin only).
router.get('/profile/:token', serveProfilePhoto);

export default router;
