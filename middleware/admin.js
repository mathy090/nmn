// routes/admin.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth'); // Your existing authentication middleware

/**
 * Admin Authorization Middleware
 * Checks if the authenticated user has admin role
 */
const admin = async (req, res, next) => {
  try {
    // Get user from token
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(401).json({ msg: 'User not found' });
    }
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin access required' });
    }
    
    next();
  } catch (err) {
    console.error('Admin middleware error:', err.message);
    res.status(500).send('Server error');
  }
};

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user (admin only)
 * @access  Private/Admin
 */
router.post(
  '/users',
  [
    auth,
    admin,
    [
      check('identifier', 'Identifier is required').not().isEmpty(),
      check('email', 'Please include a valid email').isEmail(),
      check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
      check('firstName', 'First name is required').not().isEmpty(),
      check('lastName', 'Last name is required').not().isEmpty(),
      check('role', 'Role is required').isIn(['officer', 'admin'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, email, password, firstName, lastName, role, badgeNumber, department } = req.body;

    try {
      // Check if user exists
      let user = await User.findOne({ $or: [{ identifier }, { email }] });
      if (user) {
        return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
      }

      // Create new user
      user = new User({
        identifier,
        email,
        password,
        firstName,
        lastName,
        role,
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

      res.json(userData);
    } catch (err) {
      console.error('Error creating user:', err.message);
      res.status(500).send('Server error');
    }
  }
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get(
  '/users',
  [auth, admin],
  async (req, res) => {
    try {
      // Exclude password field from the results
      const users = await User.find().select('-password');
      res.json(users);
    } catch (err) {
      console.error('Error fetching users:', err.message);
      res.status(500).send('Server error');
    }
  }
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user (admin only)
 * @access  Private/Admin
 */
router.put(
  '/users/:id',
  [
    auth,
    admin,
    [
      check('role', 'Role must be officer or admin').optional().isIn(['officer', 'admin']),
      check('password', 'Password must be at least 6 characters').optional().isLength({ min: 6 })
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { role, password, badgeNumber, department } = req.body;

    try {
      let user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      // Don't allow modifying the special admin account's role
      if (user.email === 'tafadzwarunowanda@gmail.com' && role && role !== 'admin') {
        return res.status(400).json({ msg: 'Cannot change special admin role' });
      }

      // Update fields
      if (role) user.role = role;
      if (badgeNumber) user.badgeNumber = badgeNumber;
      if (department) user.department = department;
      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }

      await user.save();

      // Return updated user (without password)
      const userData = {
        identifier: user.identifier,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        badgeNumber: user.badgeNumber,
        department: user.department
      };

      res.json(userData);
    } catch (err) {
      console.error('Error updating user:', err.message);
      res.status(500).send('Server error');
    }
  }
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user (admin only)
 * @access  Private/Admin
 */
router.delete(
  '/users/:id',
  [auth, admin],
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      // Don't allow deletion of the special admin account
      if (user.email === 'tafadzwarunowanda@gmail.com') {
        return res.status(400).json({ msg: 'Cannot delete the special admin account' });
      }

      await user.remove();
      res.json({ msg: 'User removed' });
    } catch (err) {
      console.error('Error deleting user:', err.message);
      res.status(500).send('Server error');
    }
  }
);

/**
 * @route   POST /api/admin/init-special-admin
 * @desc    Initialize the special admin account if it doesn't exist
 * @access  Public
 */
router.post('/init-special-admin', async (req, res) => {
  try {
    // Check if special admin already exists
    let specialAdmin = await User.findOne({ email: 'tafadzwarunowanda@gmail.com' });
    
    if (specialAdmin) {
      // Update if exists but role is not admin
      if (specialAdmin.role !== 'admin') {
        specialAdmin.role = 'admin';
        specialAdmin.firstName = specialAdmin.firstName || 'Admin';
        specialAdmin.lastName = specialAdmin.lastName || 'User';
        specialAdmin.badgeNumber = specialAdmin.badgeNumber || 'ADMIN-001';
        specialAdmin.department = specialAdmin.department || 'Administration';
        await specialAdmin.save();
      }
      return res.json({ 
        msg: 'Special admin account already exists', 
        user: {
          identifier: specialAdmin.identifier,
          email: specialAdmin.email,
          role: specialAdmin.role
        }
      });
    }

    // Create special admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Mathews##$090', salt);
    
    specialAdmin = new User({
      identifier: 'tafadzwarunowanda@gmail.com',
      email: 'tafadzwarunowanda@gmail.com',
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      role: 'admin',
      badgeNumber: 'ADMIN-001',
      department: 'Administration'
    });
    
    await specialAdmin.save();
    
    res.json({ 
      msg: 'Special admin account created successfully',
      user: {
        identifier: specialAdmin.identifier,
        email: specialAdmin.email,
        role: specialAdmin.role
      }
    });
  } catch (err) {
    console.error('Error initializing special admin:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
