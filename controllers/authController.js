// controllers/authController.js
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // For generating reset tokens
// const sgMail = require('@sendgrid/mail'); // If using SendGrid for emails
// const nodemailer = require('nodemailer'); // If using Nodemailer

// Simple signup (creates user without email verification)
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
    const saltRounds = 10; // Adjust rounds as needed for security/performance
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Determine role (e.g., first user is admin, rest are officers)
    // This is a simple check, you might want a more robust admin assignment method
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'officer';

    // Create new user
    const user = new User({
      identifier,
      email: email || undefined, // Allow email to be optional or undefined
      firstName,
      lastName,
      password: hashedPassword, // Store the hashed password
      badgeNumber: badgeNumber || undefined, // Allow badgeNumber to be optional
      role // Assign role
    });

    const savedUser = await user.save();

    // Generate JWT token for the new user
    const token = generateToken(savedUser._id);

    // Respond with success, token, and user info (excluding password)
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
        // Add other non-sensitive user fields if needed
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


// Simple login (no verification)
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Identifier and password are required'
      });
    }

    // Find user by identifier (could be ID number, badge number, email, etc.)
    // We'll search by identifier or email
    const user = await User.findOne({
      $or: [{ identifier }, { email: identifier }] // Allow login with email as identifier
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
        // Add other non-sensitive user fields if needed
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
    // `req.user` is populated by the `protect` middleware
    const user = await User.findById(req.user.id).select('-password'); // Exclude password

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

// --- Forgot Password Implementation ---

/**
 * Forgot Password
 * 1. Finds user by email
 * 2. Generates reset token
 * 3. Hashes token and saves to DB with expiry
 * 4. (TODO) Sends email with reset link/token
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // 1. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if email exists
      return res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link shortly.'
      });
    }

    // 2. Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 3. Hash token and set expiry (e.g., 1 hour)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour from now

    // 4. Save hashed token and expiry to user document
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = resetTokenExpiry;
    await user.save({ validateBeforeSave: false }); // Skip validation to avoid issues with other fields

    // 5. TODO: Send email with reset token/link
    // IMPORTANT: You need to implement email sending here.
    // Example using Nodemailer or SendGrid (see commented imports above)
    /*
    const resetUrl = `https://your-frontend-domain.com/reset-password/${resetToken}`;
    const message = `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    try {
      await sgMail.send({
        to: user.email,
        from: 'noreply@yourdomain.com', // Use your verified sender
        subject: 'Password Reset Request',
        html: message,
      });
      // OR using Nodemailer:
      // await transporter.sendMail({...options...});
    } catch (emailError) {
       console.error('Error sending password reset email:', emailError);
       // Optionally, you might want to clear the reset token if email fails
       // user.passwordResetToken = undefined;
       // user.passwordResetExpires = undefined;
       // await user.save({ validateBeforeSave: false });
       // return res.status(500).json({ success: false, message: 'Failed to send email. Please try again.' });
    }
    */

    // For now, just log the token (DO NOT DO THIS IN PRODUCTION!)
    console.log(`Password reset token for ${user.email}: ${resetToken}`);
    console.log(`(Hashed token in DB: ${hashedToken})`);

    res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link shortly.'
      // You might choose to send the (unhashed) token back ONLY in development/testing
      // token: process.env.NODE_ENV === 'development' ? resetToken : undefined
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

/**
 * Reset Password
 * 1. Finds user by hashed token and checks expiry
 * 2. Validates new password
 * 3. Hashes new password and saves
 * 4. Clears reset token fields
 * 5. Logs user in (optional: generate new token)
 */
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params; // Get token from URL params
    const { newPassword } = req.body; // Get new password from request body

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

    // 1. Hash the token from the URL to compare with DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find user with matching hashed token and not expired
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() } // Check if not expired
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token'
      });
    }

    // 3. Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 4. Update user's password and clear reset token fields
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // Optional: Update last password change timestamp
    user.lastPasswordChange = Date.now();
    await user.save();

    // 5. (Optional) Log the user in automatically by generating a new token
    const newToken = generateToken(user._id);

    // 6. Send success response (optionally with new token)
    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      token: newToken // Include new token if auto-login desired
      // user: { ... } // Optionally include user info
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

module.exports = {
  signup,
  login,
  getProfile,
  forgotPassword,
  resetPassword // Add resetPassword to exports
};
