// middleware/admin.js
const User = require('../models/User');

/**
 * Admin Authorization Middleware
 * Checks if the authenticated user has admin role
 */
const admin = async (req, res, next) => {
  try {
    // Get user from token
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Special admin account check
    const isSpecialAdmin = user.email === 'tafadzwarunowanda@gmail.com';
    
    // Check if user is admin (including special admin)
    if (user.role !== 'admin' && !isSpecialAdmin) {
      return res.status(403).json({ 
        success: false,
        message: 'Admin access required' 
      });
    }
    
    // If special admin but role is not set correctly, fix it
    if (isSpecialAdmin && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }
    
    next();
  } catch (err) {
    console.error('Admin middleware error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = admin;
