import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

// All queries are scoped to req.clerkId (the verified session), so a user
// can only ever list or modify their own notifications.
const view = (n) => ({
  _id: n._id,
  type: n.type,
  title: n.title,
  message: n.message,
  link: n.link,
  election: n.election,
  isRead: n.isRead,
  createdAt: n.createdAt,
});

export const getMyNotifications = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const filter = { clerkId: req.clerkId };
    if (req.query.unread === 'true') filter.isRead = false;
    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ clerkId: req.clerkId, isRead: false }),
    ]);
    res.status(200).json({ notifications: notifications.map(view), unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    const updated = await Notification.findOneAndUpdate(
      { _id: notificationId, clerkId: req.clerkId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Notification not found' });
    const unreadCount = await Notification.countDocuments({ clerkId: req.clerkId, isRead: false });
    res.status(200).json({ notification: view(updated), unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { clerkId: req.clerkId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.status(200).json({ message: 'All notifications marked as read.', updated: result.modifiedCount, unreadCount: 0 });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
};
