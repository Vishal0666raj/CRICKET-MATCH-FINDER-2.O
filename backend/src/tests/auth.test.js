require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');

const runTests = async () => {
  console.log('--- STARTING BACKEND INTEGRATION TESTS ---');
  
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cricket-finder';
  console.log(`Connecting to MongoDB at: ${uri}`);
  
  try {
    await mongoose.connect(uri);
    console.log('√ MongoDB connection successful');
  } catch (error) {
    console.error('X MongoDB connection failed:', error.message);
    process.exit(1);
  }

  const testEmail = 'testplayer@cricket.com';

  try {
    // 1. Clean up prior tests
    await OTP.deleteOne({ email: testEmail });
    await User.deleteOne({ email: testEmail });
    console.log('√ Cleaned prior test records');

    // 2. Generate and store OTP
    const rawOtp = '123456';
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(rawOtp, salt);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const cooldown = new Date(Date.now() + 60 * 1000);

    const otpDoc = await OTP.create({
      email: testEmail,
      otp: hashedOtp,
      expiresAt,
      resendCooldownExpiry: cooldown
    });
    console.log('√ Stored OTP in Database successfully');

    // 3. Verify OTP Hashing
    const otpRecord = await OTP.findOne({ email: testEmail });
    const isMatch = await bcrypt.compare(rawOtp, otpRecord.otp);
    if (isMatch) {
      console.log('√ Cryptographic bcrypt comparison passed');
    } else {
      throw new Error('OTP comparison failed');
    }

    // 4. Create Mock User
    const user = await User.create({
      name: 'Test Cricket Player',
      username: 'testplayer99',
      email: testEmail,
      preferredPosition: 'All-rounder',
      skillLevel: 'Intermediate',
      battingStyle: 'Right Hand',
      bowlingStyle: 'Spin',
      role: 'user',
      status: 'active'
    });
    console.log('√ User account created successfully');
    
    // 5. Verify Stats Default Values
    if (
      user.statistics.matchesPlayed === 0 &&
      user.statistics.rating === 5.0 &&
      user.statistics.attendancePercentage === 100
    ) {
      console.log('√ Mongoose schema default stats verified (Matches: 0, Rating: 5.0, Attendance: 100%)');
    } else {
      throw new Error('Default statistics values mismatch');
    }

    // 6. Clean up
    await OTP.deleteOne({ email: testEmail });
    await User.deleteOne({ email: testEmail });
    console.log('√ Cleaned up test records');

    console.log('\n--- ALL BACKEND INTEGRATION TESTS PASSED ---');
    process.exit(0);
  } catch (err) {
    console.error('\nX TEST EXECUTION FAILED:', err.message);
    // Attempt clean up anyway
    await OTP.deleteOne({ email: testEmail }).catch(() => {});
    await User.deleteOne({ email: testEmail }).catch(() => {});
    process.exit(1);
  }
};

runTests();
