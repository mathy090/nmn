// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  
  try {
    // Check if this is the special admin account
    const isSpecialAdmin = identifier === 'tafadzwarunowanda@gmail.com' && 
                          password === 'Mathews##$090';
    
    let user = await User.findOne({ identifier });
    
    // If special admin account doesn't exist, create it
    if (isSpecialAdmin && !user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      user = new User({
        identifier: 'tafadzwarunowanda@gmail.com',
        email: 'tafadzwarunowanda@gmail.com',
        firstName: 'Admin',
        lastName: 'User',
        password: hashedPassword,
        role: 'admin',
        badgeNumber: 'ADMIN-001',
        department: 'Administration'
      });
      
      await user.save();
    } 
    // If special admin account exists but role is wrong, fix it
    else if (isSpecialAdmin && user && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }
    // If not special admin and user doesn't exist
    else if (!isSpecialAdmin && !user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && !isSpecialAdmin) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Return JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5d' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          success: true,
          token,
          user: { 
            identifier: user.identifier,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            badgeNumber: user.badgeNumber,
            department: user.department
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', async (req, res) => {
  const { identifier, email, password, firstName, lastName, role, badgeNumber, department } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ $or: [{ identifier }, { email }] });
    if (user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }

    // Create new user
    user = new User({
      identifier,
      email,
      password,
      firstName,
      lastName,
      role: role || 'officer', // Default to officer role
      badgeNumber,
      department
    });

    // Encrypt password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user
    await user.save();

    // Return user data (without password)
    const userData = {
      identifier: user.identifier,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      badgeNumber: user.badgeNumber,
      department: user.department
    };

    res.json({ success: true, user: userData });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Generate password reset token
    const resetToken = user.getResetPasswordToken();
    await user.save();
    
    // Send email with reset link
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    
    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request',
        message
      });
      
      res.status(200).json({ 
        success: true, 
        message: 'Email sent with password reset instructions' 
      });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      
      console.error('Error sending email:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Email could not be sent' 
      });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   PUT /api/auth/reset-password/:token
 * @desc    Reset user password
 * @access  Public
 */
router.put('/reset-password/:token', async (req, res) => {
  try {
    // Hash token to compare with database
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    
    // Set new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Password reset successful' 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
