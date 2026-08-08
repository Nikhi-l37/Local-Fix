const mongoose = require('mongoose');

const WorkerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true }, // e.g., 'Plumber', 'Electrician'
  phone: { type: String, required: true },
  aadhaarLast4: { type: String, default: '****' },
  rating: { type: Number, default: 4.5 },
  totalRatings: { type: Number, default: 0 },
  jobsDone: { type: Number, default: 0 },
  available: { type: Boolean, default: true },
  memberSince: { type: String, default: () => new Date().toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  createdAt: { type: Date, default: Date.now }
});

WorkerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Worker', WorkerSchema);
