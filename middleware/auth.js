const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect middleware
exports.protect = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      req.user = await User.findById(decoded.user.id).select('-password');
      
      next();
    } catch (err) {
      console.error(err.message);
      res.status(401).json({ 
        success: false, 
        message: 'Not authorized, token failed' 
      });
    }
  }
  
  if (!token) {
    res.status(401).json({ 
      success: false, 
      message: 'Not authorized, no token' 
    });
  }
};
