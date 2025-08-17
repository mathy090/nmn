// controllers/authController.js
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // For generating reset tokens

// --- Existing imports and functions (signup, login, getProfile) remain unchanged ---

// --- FORGOT PASSWORD IMPLEMENTATION ---
/**
 * Forgot Password
 * 1. Finds user by email
 * 2. Generates reset token
 * 3. Hashes token and saves to DB with expiry
 * 4. Logs token to console (for now, later send email)
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
        console.log(`Forgot password requested for non-existent email: ${email}`);
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

    // 5. Log the token (DO NOT DO THIS IN PRODUCTION!)
    // In production, you would send an email with a link like:
    // `https://your-frontend-domain.com/reset-password/${resetToken}`
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

    // Basic password strength check (you can expand this)
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!strongPasswordRegex.test(newPassword)) {
        return res.status(400).json({
            success: false,
            message: 'Password must contain uppercase, lowercase, number, and special character.'
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

// --- EXPORT UPDATED FUNCTIONS ---
module.exports = {
  signup,          // Existing function
  login,           // Existing function
  getProfile,      // Existing function
  forgotPassword,  // New function
  resetPassword    // New function
};
