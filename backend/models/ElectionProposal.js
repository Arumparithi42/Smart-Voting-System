import mongoose from 'mongoose';

export const PROPOSAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED'];

// An Election Officer's *advice* to an admin that an election should be
// held. A proposal is never itself an election: voters cannot see it and
// nothing can be voted on until an admin approves it, which creates a
// separate, official Election document (see proposalController).
const proposedCandidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    partyName: { type: String, trim: true },
    about: { type: String, trim: true },
  },
  { _id: false }
);

const electionProposalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    purpose: { type: String, trim: true },
    category: { type: String, trim: true },
    proposedStartTime: { type: Date, required: true },
    proposedEndTime: { type: Date, required: true },
    candidates: [proposedCandidateSchema],
    officerNotes: { type: String, trim: true },

    proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    status: { type: String, enum: PROPOSAL_STATUSES, default: 'PENDING' },
    // Admin's reason for rejecting / what to revise / approval note.
    adminFeedback: { type: String, trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    revisionCount: { type: Number, default: 0 },

    // The official election an admin created from this proposal.
    createdElection: { type: mongoose.Schema.Types.ObjectId, ref: 'Election' },
  },
  { timestamps: true }
);

electionProposalSchema.index({ status: 1, createdAt: -1 });
electionProposalSchema.index({ proposedBy: 1, createdAt: -1 });

export default mongoose.model('ElectionProposal', electionProposalSchema);
