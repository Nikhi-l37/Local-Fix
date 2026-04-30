const mongoose = require('mongoose');

// Worker document persisted in MongoDB.
// Note: UI expects "category" in API responses, but DB stores multiple skills.
const WorkerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, index: true, trim: true },
    aadhaarLast4: { type: String, default: '****' },
    skills: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'skills must be a non-empty array',
      },
    },
    fcmToken: { type: String, default: null },
    location: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    availability: { type: Boolean, default: true },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    jobsDone: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Enable geo queries by location (future Phase 2).
WorkerSchema.index({ location: '2dsphere' });
WorkerSchema.index({ skills: 1 });

module.exports = mongoose.model('Worker', WorkerSchema);
