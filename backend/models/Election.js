import mongoose from 'mongoose';

const electionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    candidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' }], // Array of candidate IDs
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
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

// Export the Election model
export default mongoose.model('Election', electionSchema);
