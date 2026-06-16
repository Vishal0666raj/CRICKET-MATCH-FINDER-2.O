const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP, oauthLogin, refreshToken, logout } = require('../controllers/authController');

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/oauth', oauthLogin);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

module.exports = router;
