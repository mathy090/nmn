// routes/auth.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validation');
const { login, getProfile } = require('../controllers/authController');

// Public routes
router.post('/login', validateLogin, login);

// Protected routes
router.get('/profile', protect, getProfile);

module.exports = router;