const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  profilePicture: {
    type: String,
    default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    get: function (val) {
      if (val && val.startsWith('/uploads/')) {
        const backendUrl = process.env.BACKEND_URL || 'https://cricket-match-finder-2-o.onrender.com';
        return `${backendUrl}${val}`;
      }
      return val;
    }
  },
  bio: {
    type: String,
    default: ''
  },
  age: {
    type: Number
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    default: 'Prefer not to say'
  },
  city: {
    type: String,
    index: true,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  preferredPosition: {
    type: String,
    enum: ['Batsman', 'Bowler', 'All-rounder', 'Wicket Keeper', 'Captain'],
    default: 'All-rounder'
  },
  skillLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Professional'],
    default: 'Intermediate'
  },
  battingStyle: {
    type: String,
    enum: ['Right Hand', 'Left Hand', 'None'],
    default: 'Right Hand'
  },
  bowlingStyle: {
    type: String,
    enum: ['Fast', 'Medium', 'Spin', 'None'],
    default: 'Medium'
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  githubId: {
    type: String,
    unique: true,
    sparse: true
  },
  statistics: {
    matchesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 },
    ratingsCount: { type: Number, default: 0 },
    attendancePercentage: { type: Number, default: 100 },
    presentCount: { type: Number, default: 0 },
    absentCount: { type: Number, default: 0 }
  },
  isLookingForMatch: {
    type: Boolean,
    default: false,
    index: true
  },
  lookingForMatchConfig: {
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    preferredRadius: {
      type: Number, // in kilometers
      default: 10
    },
    availability: {
      type: [String], // ['Weekend', 'Weekday', 'Evening', 'Morning']
      default: []
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'banned'],
    default: 'active'
  },
  refreshToken: {
    type: String
  }
}, { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } });

// Create geospatial index on lookingForMatchConfig.location
userSchema.index({ 'lookingForMatchConfig.location': '2dsphere' });

module.exports = mongoose.model('User', userSchema);
