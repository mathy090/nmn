const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const TestRecord = require('../models/TestRecord');

// @route   GET /api/tests
// @desc    Get test records for the logged-in officer
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const records = await TestRecord.find({ identifier: req.user.id })
      .sort({ timestamp: -1 })
      .limit(5);
    res.json(records);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// @route   POST /api/tests
// @desc    Create a new test record
// @access  Private
router.post('/', protect, async (req, res) => {
  const { idNumber, gender, numberPlate, alcoholLevel, location, deviceSerial, notes } = req.body;
  
  try {
    // Create new test record
    const testRecord = new TestRecord({
      idNumber,
      gender,
      identifier: req.user.id,
      numberPlate,
      alcoholLevel,
      location,
      deviceSerial,
      notes
    });
    
    await testRecord.save();
    res.json(testRecord);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
