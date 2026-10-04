import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(requireAuth);
router.get('/', getMyNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:notificationId/read', markNotificationRead);

export default router;
