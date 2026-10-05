import mongoose from 'mongoose';

export const COMPLAINT_STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];
export const COMPLAINT_FINAL_STATUSES = ['RESOLVED', 'REJECTED'];
export const COMPLAINT_CATEGORIES = [
  'UNABLE_TO_VOTE',
  'AUTHENTICATION_PROBLEM',
  'TECHNICAL_PROBLEM',
  'INCORRECT_CANDIDATE_INFO',
  'ELECTION_TIMING_ISSUE',
  'SUSPECTED_IRREGULARITY',
  'DUPLICATE_VOTE_CONCERN',
  'OTHER',
];

// A voter's complaint / compliance issue. These go to ADMINS ONLY - there
// is no officer or public route that reads this collection, and a voter
// can only ever read complaints whose clerkId matches their own verified
// session (see complaintController).
const complaintSchema = new mongoose.Schema(
  {
    // Human-friendly reference, e.g. CMP-2026-00124 (see utils/counter.js).
    referenceId: { type: String, required: true, unique: true },
    // Owner - always taken from the verified Clerk session, never the body.
    clerkId: { type: String, required: true, index: true },
    // Optional: some issues (e.g. authentication problems) aren't tied to
    // a specific election.
    election: { type: mongoose.Schema.Types.ObjectId, ref: 'Election' },
    category: { type: String, enum: COMPLAINT_CATEGORIES, required: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    supportingInfo: { type: String, trim: true, maxlength: 2000 },
    // Screenshots / documents the voter attached (StoredFile, owner+admin only).
    attachments: [{
      _id: false,
      fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoredFile' },
      filename: { type: String },
      contentType: { type: String },
      size: { type: Number },
    }],

    status: { type: String, enum: COMPLAINT_STATUSES, default: 'OPEN' },
    adminResponse: { type: String, trim: true, maxlength: 5000 },
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt: { type: Date },
    closedAt: { type: Date },
    statusHistory: [{
      _id: false,
      status: { type: String, enum: COMPLAINT_STATUSES },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      changedAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

complaintSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Complaint', complaintSchema);
