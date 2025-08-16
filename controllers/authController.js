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
    
    // Find user
    let user = await User.findOne({ identifier });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if this is the special admin account
    if (identifier === 'tafadzwarunowanda@gmail.com') {
      user.role = 'admin';
      user.email = 'tafadzwarunowanda@gmail.com';
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
        email: user.email,
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

// Signup new user
const signup = async (req, res) => {
  try {
    const { identifier, email, firstName, lastName, badgeNumber } = req.body;
    
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Identifier is required'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ identifier }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this identifier or email already exists'
      });
    }
    
    // Create new user
    const user = new User({
      identifier,
      email,
      firstName,
      lastName,
      badgeNumber,
      role: identifier === 'tafadzwarunowanda@gmail.com' ? 'admin' : 'officer'
    });
    
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        identifier: user.identifier,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Account creation failed',
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
  signup,
  getProfile
};
