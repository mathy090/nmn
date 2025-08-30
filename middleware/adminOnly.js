// middleware/adminOnly.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to allow only admin users
const adminOnly = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.user.id).select('-password');

      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      if (user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }

      req.user = user;
      next();
    } catch (err) {
      console.error('AdminOnly middleware error:', err.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

module.exports = adminOnly;
