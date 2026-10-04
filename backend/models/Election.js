import mongoose from 'mongoose';

const electionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    purpose: { type: String },
    category: { type: String },
    candidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' }], // Array of candidate IDs
    // 'draft' = created by an admin (e.g. from an approved proposal) but not
    // yet scheduled - hidden from voters and never open for voting, whatever
    // its start/end times say. See utils/electionStatus.js.
    status: { type: String, enum: ['draft', 'upcoming', 'ongoing', 'completed'], default: 'upcoming' },
    startTime: { type: Date },
    endTime: { type: Date },

    // Set when this election was created by approving an Election Officer's
    // proposal. Unique (sparse) so a proposal can never produce two
    // official elections, even if approval is triggered twice.
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElectionProposal' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    resultFinalized: { type: Boolean, default: false },
    finalizedAt: { type: Date },
    winner: {
      candidateIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' }],
      votes: { type: Number },
      isTie: { type: Boolean }
    },
    turnout: {
      eligibleVoters: { type: Number },
      votesCast: { type: Number },
      percentage: { type: Number }
    },

    // Official publication. Only ever set by the admin publish endpoint
    // (see resultPublicationController.publishResults) via a conditional
    // update, never from a client-supplied field. Public results stay
    // hidden until this is true.
    resultsPublished: { type: Boolean, default: false },
    resultsPublishedAt: { type: Date },
    resultsPublishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // When the result-email recipient list was built (see
    // services/resultEmailService.js). Per-voter delivery state lives in
    // ResultEmailDelivery, not here.
    resultEmailsQueuedAt: { type: Date },

    // Reminder stages already fanned out to users (e.g. "starting-24h").
    // A fast-path skip only - Notification's unique index is what actually
    // guarantees no duplicates.
    notificationStagesSent: [{ type: String }],

    // An Election Officer's advice that the final results are ready to be
    // published. Advisory only - publication itself is admin-only.
    publicationRecommendation: {
      recommendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      recommendedAt: { type: Date },
      notes: { type: String },
    },

    voters: [{
      clerkId: { type: String, required: true, ref: 'User' },
      // A voter-facing proof-of-vote. It is derived from (electionId, clerkId,
      // a server secret, and a random nonce) so it cannot be produced or
      // guessed by anyone outside the server, but it deliberately does NOT
      // encode which candidate was chosen - the receipt proves *that* someone
      // voted, never *who* they voted for (ballot secrecy).
      // NOT required: elections with votes cast before this field existed
      // have voter records without one, and Mongoose re-validates the whole
      // document (including untouched subdocuments) on every .save() -
      // marking this required broke startElection/endElection/addCandidate
      // etc. on any election with pre-existing votes.
      receiptId: { type: String },
      votedAt: { type: Date, default: Date.now },
    }], // Array of voter records
},
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt` fields
);

electionSchema.index({ proposalId: 1 }, { unique: true, sparse: true });

// Export the Election model
export default mongoose.model('Election', electionSchema);
