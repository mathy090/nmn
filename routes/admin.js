// routes/admin.js
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const User = require('../models/User');
const TestRecord = require('../models/TestRecord');

// @route   GET /api/admin/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/users', protect, admin, async (req, res) => {
  try {
    // Exclude password from the returned data
    const users = await User.find().select('-password');
    res.json({ success: true, users });
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/records
// @desc    Get all test records (admin only)
// @access  Private/Admin
router.get('/records', protect, admin, async (req, res) => {
  try {
    const records = await TestRecord.find().sort({ timestamp: -1 });
    res.json({ success: true, records });
  } catch (err) {
    console.error('Error fetching records:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/sync-count
// @desc    Get count of records synced in the last 24 hours
// @access  Private/Admin
router.get('/sync-count', protect, admin, async (req, res) => {
  try {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await TestRecord.countDocuments({ timestamp: { $gte: cutoffDate } });
    res.json({ success: true, count });
  } catch (err) {
    console.error('Error fetching sync count:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/admin/user/:id/disable
// @desc    Disable or ban a user account
// @access  Private/Admin
router.patch('/user/:id/disable', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.disabled = !user.disabled; // toggle disabled status
    await user.save();

    res.json({ success: true, user });
  } catch (err) {
    console.error('Error toggling user status:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;


