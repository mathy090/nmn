// controllers/authController.js
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // For generating reset tokens

// --- SIGNUP IMPLEMENTATION ---
const signup = async (req, res) => {
  try {
    const { identifier, email, firstName, lastName, password, badgeNumber } = req.body;

    // Basic validation
    if (!identifier || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Identifier, password, first name, and last name are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ identifier }, { email }] // Check by identifier or email
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this identifier or email already exists'
      });
    }

    // Hash password before saving
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Determine role (first user is admin)
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'officer';

    // Create new user
    const user = new User({
      identifier,
      email: email || undefined,
      firstName,
      lastName,
      password: hashedPassword,
      badgeNumber: badgeNumber || undefined,
      role
    });

    const savedUser = await user.save();

    // Generate JWT token
    const token = generateToken(savedUser._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: savedUser._id,
        identifier: savedUser.identifier,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        badgeNumber: savedUser.badgeNumber,
        role: savedUser.role,
        createdAt: savedUser.createdAt
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Signup failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// --- LOGIN IMPLEMENTATION ---
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Identifier and password are required'
      });
    }

    // Find user by identifier or email
    const user = await User.findOne({
      $or: [{ identifier }, { email: identifier }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save();

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
        firstName: user.firstName,
        lastName: user.lastName,
        badgeNumber: user.badgeNumber,
        role: user.role,
        lastLogin: user.lastLogin
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

// --- GET PROFILE IMPLEMENTATION ---
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

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

// --- FORGOT PASSWORD IMPLEMENTATION ---
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
        console.log(`Forgot password requested for non-existent email: ${email}`);
        return res.status(200).json({
            success: true,
            message: 'If your email is registered, you will receive a password reset link shortly.'
        });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = resetTokenExpiry;
    await user.save({ validateBeforeSave: false });

    console.log(`*** PASSWORD RESET TOKEN FOR ${user.email}: ${resetToken} ***`);
    console.log(`(Hashed token in DB: ${hashedToken})`);
    console.log(`Expiry: ${new Date(resetTokenExpiry).toISOString()}`);

    res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link shortly.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset request failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// --- RESET PASSWORD IMPLEMENTATION ---
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 8) {
         return res.status(400).json({
             success: false,
             message: 'Password must be at least 8 characters long.'
         });
     }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!strongPasswordRegex.test(newPassword)) {
        return res.status(400).json({
            success: false,
            message: 'Password must contain uppercase, lowercase, number, and special character.'
        });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token'
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.lastPasswordChange = Date.now();
    await user.save();

    const newToken = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      token: newToken
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// --- EXPORT ALL FUNCTIONS ---
module.exports = {
  signup,          // Make sure this line is present and matches the function name
  login,
  getProfile,
  forgotPassword,
  resetPassword
};
