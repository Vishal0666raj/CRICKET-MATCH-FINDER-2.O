const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['invite', 'match_accepted', 'match_cancelled', 'player_joined', 'player_left', 'reminder', 'attendance_reminder', 'chat'],
    required: true
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match'
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
