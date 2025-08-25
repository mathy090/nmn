// routes/test.js
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const TestRecord = require('../models/TestRecord');

// @route   GET /api/tests
// @desc    Get test records for the logged-in officer
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const records = await TestRecord.find({ identifier: req.user.identifier })
      .sort({ timestamp: -1 })
      .limit(5);
    res.json(records);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   GET /api/tests/all
// @desc    Get ALL test records (admin only)
// @access  Private/Admin
router.get('/all', protect, admin, async (req, res) => {
  try {
    const records = await TestRecord.find().sort({ timestamp: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   POST /api/tests
// @desc    Create a new test record
// @access  Private
router.post('/', protect, async (req, res) => {
  // Validation and creation logic remains the same
  // ...
});

module.exports = router;
