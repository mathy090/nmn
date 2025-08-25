const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
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
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && !isSpecialAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
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
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
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
      role: role || 'officer',
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
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router;
