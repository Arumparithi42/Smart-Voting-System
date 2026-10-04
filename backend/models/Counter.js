import mongoose from 'mongoose';

// Generic atomic sequence (e.g. _id "complaint-2026" -> seq 124). Used for
// human-readable reference numbers; $inc on a single document is atomic, so
// concurrent requests never get the same number.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export default mongoose.model('Counter', counterSchema);
