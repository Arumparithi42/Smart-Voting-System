import mongoose from 'mongoose';

export const DELIVERY_STATUSES = ['PENDING', 'SENDING', 'SENT', 'FAILED'];

// One row per (election, voter who actually voted). The unique index is the
// backstop against duplicate result emails: however many times publication
// or a retry is triggered, a voter can only ever have one delivery record
// per election, and only records that are not yet SENT are ever (re)sent.
//
// Deliberately stores NOTHING about the voter's ballot - only that a
// result email is owed to someone who participated.
const resultEmailDeliverySchema = new mongoose.Schema(
  {
    election: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
    clerkId: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true },
    recipientName: { type: String, trim: true },
    status: { type: String, enum: DELIVERY_STATUSES, default: 'PENDING' },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    lastError: { type: String },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

resultEmailDeliverySchema.index({ election: 1, clerkId: 1 }, { unique: true });
resultEmailDeliverySchema.index({ election: 1, status: 1 });

export default mongoose.model('ResultEmailDelivery', resultEmailDeliverySchema);
