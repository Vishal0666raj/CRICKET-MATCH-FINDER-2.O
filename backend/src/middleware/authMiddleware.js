const User = require('../models/User');
const { verifyAccessToken } = require('../utils/jwt');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = verifyAccessToken(token);

      if (!decoded) {
        return res.status(401).json({ message: 'Not authorized, token invalid or expired' });
      }

      req.user = await User.findById(decoded.id).select('-refreshToken');
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      if (req.user.status === 'banned') {
        return res.status(403).json({ message: 'Your account has been banned' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

module.exports = { protect, admin };
