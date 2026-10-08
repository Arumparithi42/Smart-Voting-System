import Counter from '../models/Counter.js';

// Atomically returns the next number in a named sequence.
export const nextSequence = async (name) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return counter.seq;
};

// e.g. CMP-2026-00124
export const nextComplaintReference = async (date = new Date()) => {
  const year = date.getFullYear();
  const seq = await nextSequence(`complaint-${year}`);
  return `CMP-${year}-${String(seq).padStart(5, '0')}`;
};

// e.g. FB-2026-00012
export const nextFeedbackReference = async (date = new Date()) => {
  const year = date.getFullYear();
  const seq = await nextSequence(`feedback-${year}`);
  return `FB-${year}-${String(seq).padStart(5, '0')}`;
};
