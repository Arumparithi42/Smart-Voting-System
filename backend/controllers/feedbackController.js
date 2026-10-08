import mongoose from 'mongoose';
import Feedback, { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES } from '../models/Feedback.js';
import User from '../models/User.js';
import { nextFeedbackReference } from '../utils/counter.js';
import { notifyFeedbackSubmitted, notifyFeedbackUpdated } from '../services/notificationService.js';

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const quietly = (promise) => promise.catch((error) => console.error('Notification failed:', error.message));

// What the author sees (no internal admin ids).
const toUserView = (f) => ({
  referenceId: f.referenceId,
  category: f.category,
  subject: f.subject,
  message: f.message,
  rating: f.rating,
  status: f.status,
  adminReply: f.adminReply,
  repliedAt: f.repliedAt,
  createdAt: f.createdAt,
  updatedAt: f.updatedAt,
});

export const createFeedback = async (req, res) => {
  try {
    const category = String(req.body.category || '').toUpperCase();
    const subject = str(req.body.subject, 200);
    const message = str(req.body.message, 3000);
    const rating = req.body.rating === undefined || req.body.rating === '' ? undefined : Number(req.body.rating);

    if (!FEEDBACK_CATEGORIES.includes(category)) return res.status(400).json({ message: 'Please choose a feedback type.' });
    if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required.' });
    if (rating !== undefined && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }

    const feedback = await Feedback.create({
      referenceId: await nextFeedbackReference(),
      clerkId: req.clerkId, // from the verified session, never the body
      category,
      subject,
      message,
      rating,
    });
    await quietly(notifyFeedbackSubmitted(feedback));
    res.status(201).json({ message: 'Thank you! Your feedback has been sent to the Admin.', feedback: toUserView(feedback) });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting feedback', error: error.message });
  }
};

export const getMyFeedback = async (req, res) => {
  try {
    const list = await Feedback.find({ clerkId: req.clerkId }).sort({ createdAt: -1 });
    res.status(200).json(list.map(toUserView));
  } catch (error) {
    res.status(500).json({ message: 'Error loading feedback', error: error.message });
  }
};

// ---------------- Admin ----------------

export const getAllFeedback = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = String(req.query.status).toUpperCase();
    if (req.query.category) filter.category = String(req.query.category).toUpperCase();
    const list = await Feedback.find(filter).sort({ createdAt: -1 }).limit(500);
    const users = await User.find({ clerkId: { $in: [...new Set(list.map((f) => f.clerkId))] } }).select('clerkId firstName lastName email role');
    const byClerk = new Map(users.map((u) => [u.clerkId, u]));
    res.status(200).json(list.map((f) => {
      const u = byClerk.get(f.clerkId);
      return {
        _id: f._id,
        ...toUserView(f),
        from: u ? { name: [u.firstName, u.lastName].filter(Boolean).join(' '), email: u.email, role: u.role } : null,
      };
    }));
  } catch (error) {
    res.status(500).json({ message: 'Error loading feedback', error: error.message });
  }
};

export const updateFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(feedbackId)) return res.status(404).json({ message: 'Feedback not found' });
    const status = req.body.status ? String(req.body.status).toUpperCase() : undefined;
    const adminReply = str(req.body.adminReply, 3000);
    if (status && !FEEDBACK_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    if (!status && !adminReply) return res.status(400).json({ message: 'Provide a reply and/or a new status' });

    const set = {};
    if (status) set.status = status;
    if (adminReply) Object.assign(set, { adminReply, repliedBy: req.dbUser._id, repliedAt: new Date() });
    const updated = await Feedback.findByIdAndUpdate(feedbackId, { $set: set }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Feedback not found' });

    await quietly(notifyFeedbackUpdated(updated));
    res.status(200).json({ message: 'Feedback updated.', feedback: { _id: updated._id, ...toUserView(updated) } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating feedback', error: error.message });
  }
};
