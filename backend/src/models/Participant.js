const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'rejected'],
    default: 'requested',
    index: true
  },
  attendance: {
    type: String,
    enum: ['pending', 'present', 'absent'],
    default: 'pending'
  },
  rated: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Avoid duplicate participants for the same match
participantSchema.index({ matchId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Participant', participantSchema);
