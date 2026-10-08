import mongoose from 'mongoose';

// Small uploaded files (profile photos, complaint attachments) kept in
// MongoDB so the project needs no extra storage service. Size is capped by
// the upload middleware (well under MongoDB's 16 MB document limit).
const storedFileSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['profile-photo', 'complaint-attachment', 'candidate-document', 'election-manifest', 'application-manifesto'], required: true },
    ownerClerkId: { type: String, required: true, index: true },
    filename: { type: String, required: true, maxlength: 200 },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    // Random, unguessable token for files served publicly (profile photos,
    // so <img> tags can load them). Complaint attachments never get one -
    // they're only served to their owner and admins.
    publicToken: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

export default mongoose.model('StoredFile', storedFileSchema);
