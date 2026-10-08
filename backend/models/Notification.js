import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = [
  'ELECTION_STARTING',
  'ELECTION_STARTED',
  'ELECTION_ENDING',
  'ELECTION_ENDED',
  'RESULTS_PUBLISHED',
  'COMPLAINT_UPDATED',
  // Admin <-> Election Officer workflow
  'PROPOSAL_SUBMITTED',
  'PROPOSAL_REVISION_REQUESTED',
  'PROPOSAL_APPROVED',
  'PROPOSAL_REJECTED',
  // Admin inbox
  'COMPLAINT_SUBMITTED',
  'FEEDBACK_SUBMITTED',
  'CANDIDATE_APPLICATION_SUBMITTED',
  // Replies to the user
  'FEEDBACK_UPDATED',
];

// In-app notification for one user. Never carries ballot data - only
// public election facts or the recipient's own complaint status.
const notificationSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true },
    election: { type: mongoose.Schema.Types.ObjectId, ref: 'Election' },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 1000 },
    // Frontend route to open, e.g. /explore/<id> or /dashboard/complaints.
    link: { type: String },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    // Identifies "this reminder for this user" (e.g. "starting-24h:<electionId>").
    // Unique per user, so re-running the scheduler or a publish can never
    // create the same notification twice.
    dedupeKey: { type: String, required: true },
  },
  { timestamps: true }
);

notificationSchema.index({ clerkId: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ clerkId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
