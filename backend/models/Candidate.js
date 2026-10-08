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
      applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateApplication' },
      // Uploaded files (StoredFile). MANIFESTO = public once the election is
      // visible; DOCUMENT = staff only (admins / Election Officers).
      documents: [{
        _id: false,
        fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoredFile' },
        docType: { type: String, enum: ['MANIFESTO', 'DOCUMENT'], default: 'DOCUMENT' },
        title: { type: String, trim: true, maxlength: 120 },
        filename: { type: String },
        contentType: { type: String },
        size: { type: Number },
        uploadedAt: { type: Date, default: Date.now },
      }]
    },
    { timestamps: true } // Automatically adds `createdAt` and `updatedAt` fields
  );

  // Export the Candidate model
  export default mongoose.model('Candidate', candidateSchema);
