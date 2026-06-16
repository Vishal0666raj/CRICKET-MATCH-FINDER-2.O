const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  ground: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String, // e.g. "16:00"
    required: true
  },
  overs: {
    type: Number,
    required: true
  },
  playersNeeded: {
    type: Number,
    required: true,
    min: 0
  },
  skillLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Professional', 'All'],
    default: 'All'
  },
  ballType: {
    type: String,
    enum: ['Tennis', 'Leather'],
    required: true
  },
  entryFee: {
    type: Number,
    default: 0
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  maxPlayers: {
    type: Number,
    required: true,
    min: 2
  },
  notes: {
    type: String,
    default: ''
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  },
  result: {
    winningTeam: { type: String, default: '' },
    scores: { type: String, default: '' },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    mvp: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }
}, { timestamps: true });

// Create a geospatial index on the location field
matchSchema.index({ location: '2dsphere' });
matchSchema.index({ date: 1 });

module.exports = mongoose.model('Match', matchSchema);
