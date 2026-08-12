import mongoose from 'mongoose';

const electionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    candidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' }], // Array of candidate IDs
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
    voters: [{ clerkId: { type: String, required: true, ref: 'User' } }], // Array of voter IDs
},
  { timestamps: true } // Automatically adds `createdAt` and `updatedAt` fields
);

// Export the Election model
export default mongoose.model('Election', electionSchema);
