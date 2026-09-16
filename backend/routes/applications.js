import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMyApplications, createApplication, editApplication, getApplicationById } from '../controllers/applicationController.js';

const router = express.Router();

router.post('/', requireAuth, createApplication);
router.get('/my', requireAuth, getMyApplications);
router.get('/:id', requireAuth, getApplicationById);
router.put('/:id', requireAuth, editApplication);

export default router;
