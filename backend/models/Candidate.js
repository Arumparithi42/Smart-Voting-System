  import mongoose from 'mongoose';

  const candidateSchema = new mongoose.Schema(
    {
      name: { type: String, required: true },
      partyName: { type: String },
      votes: { type: Number, default: 0 }, // Track the number of votes for the candidate
    },
    { timestamps: true } // Automatically adds `createdAt` and `updatedAt` fields
  );

  // Export the Candidate model
  export default mongoose.model('Candidate', candidateSchema);
