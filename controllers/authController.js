// controllers/authController.js
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Simple login (no verification)
const login = async (req, res) => {
  try {
    const { identifier } = req.body; // Could be ID number, badge number, etc.
    
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Identifier is required'
      });
    }
    
    // Find or create user
    let user = await User.findOne({ identifier });
    if (!user) {
      user = new User({ identifier });
      await user.save();
    }
    
    // Generate JWT token
    const token = generateToken(user._id);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        identifier: user.identifier,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  login,
  getProfile
};