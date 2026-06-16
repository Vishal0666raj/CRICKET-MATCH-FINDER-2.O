const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetMatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'resolved'],
    default: 'pending',
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
