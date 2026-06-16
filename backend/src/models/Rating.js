const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true,
    index: true
  },
  rater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sportsmanship: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  skill: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  teamwork: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  punctuality: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  averageRating: {
    type: Number,
    required: true
  }
}, { timestamps: true });

// Prevent double rating the same player for the same match by the same user
ratingSchema.index({ matchId: 1, rater: 1, ratee: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
