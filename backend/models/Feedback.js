import mongoose from 'mongoose';

export const FEEDBACK_CATEGORIES = ['GENERAL', 'SUGGESTION', 'BUG_REPORT', 'USABILITY', 'OTHER'];
export const FEEDBACK_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'CLOSED'];

// General feedback from any signed-in user to the Admin (separate from
// complaints, which are election issues). Only the author and admins can
// read it.
const feedbackSchema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true }, // e.g. FB-2026-00012
    clerkId: { type: String, required: true, index: true },
    category: { type: String, enum: FEEDBACK_CATEGORIES, required: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    rating: { type: Number, min: 1, max: 5 },
    status: { type: String, enum: FEEDBACK_STATUSES, default: 'SUBMITTED' },
    adminReply: { type: String, trim: true, maxlength: 3000 },
    repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    repliedAt: { type: Date },
  },
  { timestamps: true }
);

feedbackSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Feedback', feedbackSchema);
