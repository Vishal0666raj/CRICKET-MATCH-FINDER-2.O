const bcrypt = require('bcryptjs');
const OTP = require('../models/OTP');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

// @desc    Send 6-digit OTP to Email
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const emailLower = email.toLowerCase().trim();

    // Check resend cooldown
    const existingOTP = await OTP.findOne({ email: emailLower });
    if (existingOTP && existingOTP.resendCooldownExpiry > new Date()) {
      const secondsLeft = Math.ceil((existingOTP.resendCooldownExpiry - new Date()) / 1000);
      return res.status(429).json({ 
        message: `Please wait ${secondsLeft} seconds before requesting a new OTP.` 
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(otp, salt);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
    const resendCooldownExpiry = new Date(Date.now() + 60 * 1000); // 60 seconds cooldown

    // Save/update OTP in database
    await OTP.findOneAndUpdate(
      { email: emailLower },
      { 
        otp: hashedOTP, 
        expiresAt, 
        resendCooldownExpiry 
      },
      { upsert: true, new: true }
    );

    // Send email
    const textContent = `Your 6-digit OTP verification code is: ${otp}. It will expire in 5 minutes.`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc;">
        <h2 style="color: #22c55e; text-align: center;">Cricket Match Finder</h2>
        <p style="font-size: 16px; text-align: center;">Use the OTP code below to sign in to your account:</p>
        <div style="font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 4px; color: #e2e8f0; background-color: #1e293b; padding: 15px; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">This code is valid for 5 minutes. Do not share this OTP with anyone.</p>
      </div>
    `;

    const mailResult = await sendEmail({
      to: emailLower,
      subject: 'Your Cricket Match Finder OTP Code',
      text: textContent,
      html: htmlContent
    });

    res.status(200).json({ 
      message: 'OTP sent successfully. Please check your email.',
      // Log the OTP in development payload in case the console is hard to check
      ...(mailResult.mock ? { devOtp: otp } : {})
    });
  } catch (error) {
    console.error(`Send OTP error: ${error.message}`);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
};

// @desc    Verify OTP & Log In / Sign Up
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    const emailLower = email.toLowerCase().trim();
    const otpRecord = await OTP.findOne({ email: emailLower });

    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP has expired or is invalid. Please request a new one.' });
    }

    // Compare OTP
    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
    }

    // Check expiration
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ email: emailLower });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Correct OTP, delete from DB
    await OTP.deleteOne({ email: emailLower });

    // Check if user exists
    let user = await User.findOne({ email: emailLower });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      // Generate a temporary username
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const emailPrefix = emailLower.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      const username = `${emailPrefix}${randomId}`;

      user = await User.create({
        name: emailLower.split('@')[0],
        username,
        email: emailLower,
        role: 'user',
        status: 'active'
      });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ message: 'Your account has been banned.' });
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token in secure cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        role: user.role,
        isLookingForMatch: user.isLookingForMatch,
        preferredPosition: user.preferredPosition,
        skillLevel: user.skillLevel
      },
      token: accessToken,
      isNewUser
    });
  } catch (error) {
    console.error(`Verify OTP error: ${error.message}`);
    res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
};

// @desc    OAuth Login / Signup (Supports production OAuth callbacks or offline development mocks)
// @route   POST /api/auth/oauth
// @access  Public
const oauthLogin = async (req, res) => {
  const { provider, email, name, profilePicture, id } = req.body;

  if (!provider || !email || !id) {
    return res.status(400).json({ message: 'Provider, Email, and ID are required' });
  }

  try {
    const emailLower = email.toLowerCase().trim();
    let query = { email: emailLower };
    
    // Check if user exists by email first, or specific ID
    let user = await User.findOne(query);

    if (!user) {
      // Create user
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const emailPrefix = emailLower.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      const username = `${emailPrefix}${randomId}`;

      const userFields = {
        name: name || emailLower.split('@')[0],
        username,
        email: emailLower,
        profilePicture: profilePicture || undefined,
        role: 'user',
        status: 'active'
      };

      if (provider === 'google') userFields.googleId = id;
      if (provider === 'github') userFields.githubId = id;

      user = await User.create(userFields);
    } else {
      // Update social credentials if missing
      let changed = false;
      if (provider === 'google' && !user.googleId) {
        user.googleId = id;
        changed = true;
      }
      if (provider === 'github' && !user.githubId) {
        user.githubId = id;
        changed = true;
      }
      if (profilePicture && user.profilePicture.includes('photo-1535713875002-d1d0cf377fde')) {
        user.profilePicture = profilePicture;
        changed = true;
      }
      if (changed) {
        await user.save();
      }
    }

    if (user.status === 'banned') {
      return res.status(403).json({ message: 'Your account has been banned.' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        role: user.role,
        isLookingForMatch: user.isLookingForMatch,
        preferredPosition: user.preferredPosition,
        skillLevel: user.skillLevel
      },
      token: accessToken
    });
  } catch (error) {
    console.error(`OAuth login error: ${error.message}`);
    res.status(500).json({ message: 'OAuth authentication failed.' });
  }
};

// @desc    Refresh JWT Token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
  const tokenFromCookie = req.cookies ? req.cookies.refreshToken : null;
  const tokenFromBody = req.body.refreshToken;
  const token = tokenFromCookie || tokenFromBody;

  if (!token) {
    return res.status(401).json({ message: 'Refresh token not found' });
  }

  try {
    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ message: 'Refresh token is invalid or revoked' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ message: 'Your account has been banned.' });
    }

    const accessToken = generateAccessToken(user);
    res.status(200).json({ token: accessToken });
  } catch (error) {
    console.error(`Refresh token error: ${error.message}`);
    res.status(500).json({ message: 'Token refresh failed.' });
  }
};

// @desc    Logout User
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  const token = req.cookies ? req.cookies.refreshToken : null;

  try {
    if (token) {
      const decoded = verifyRefreshToken(token);
      if (decoded) {
        const user = await User.findById(decoded.id);
        if (user) {
          user.refreshToken = undefined;
          await user.save();
        }
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(`Logout error: ${error.message}`);
    res.status(500).json({ message: 'Logout failed.' });
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  oauthLogin,
  refreshToken,
  logout
};
