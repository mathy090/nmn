// routes/auth.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
// Import validation if you have specific rules, otherwise remove
// const { validateLogin, validateSignup } = require('../middleware/validation');
const {
  login,
  signup,
  getProfile,
  forgotPassword, // Import the new functions
  resetPassword   // Import the new functions
} = require('../controllers/authController');

// Public routes
// router.post('/login', validateLogin, login); // Add validation if you have it
router.post('/login', login);
// router.post('/signup', validateSignup, signup); // Add validation if you have it
router.post('/signup', signup);
router.post('/forgot-password', forgotPassword); // New route for forgot password
router.put('/reset-password/:token', resetPassword); // New route for reset password (PUT or POST)

// Protected routes
router.get('/profile', protect, getProfile);

module.exports = router;
