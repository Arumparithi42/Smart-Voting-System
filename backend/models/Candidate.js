  import mongoose from 'mongoose';

  const candidateSchema = new mongoose.Schema(
    {
      name: { type: String, required: true },
      partyName: { type: String },
      profilePhotoUrl: { type: String },
      partySymbolUrl: { type: String },
      qualification: { type: String },
      occupation: { type: String },
      about: { type: String },
      manifesto: { type: String },
      promises: [{ type: String }],
      votes: { type: Number, default: 0 }, // Track the number of votes for the candidate
      applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateApplication' }
    },
    { timestamps: true } // Automatically adds `createdAt` and `updatedAt` fields
  );

  // Export the Candidate model
  export default mongoose.model('Candidate', candidateSchema);
