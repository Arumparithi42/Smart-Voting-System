import mongoose from 'mongoose';

const candidateApplicationSchema = new mongoose.Schema({
  electionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
  clerkId: { type: String, required: true },
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  dateOfBirth: { type: Date },
  address: { type: String, trim: true },
  profilePhotoUrl: { type: String, trim: true },
  partyName: { type: String, trim: true },
  partySymbolUrl: { type: String, trim: true },
  qualification: { type: String, trim: true },
  occupation: { type: String, trim: true },
  about: { type: String, trim: true },
  manifesto: { type: String, trim: true },
  promises: [{ type: String, trim: true }],
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: { type: String, trim: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { timestamps: true });

candidateApplicationSchema.index({ electionId: 1, clerkId: 1 }, { unique: true });

export default mongoose.model('CandidateApplication', candidateApplicationSchema);
