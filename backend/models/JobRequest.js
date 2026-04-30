const mongoose = require('mongoose');

const JobRequestSchema = new mongoose.Schema(
  {
    // User's phone number for Phase 1/2 (authentication later).
    userId: { type: String, required: true },
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true, index: true },
    problem: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    userLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'completed'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobRequest', JobRequestSchema);

