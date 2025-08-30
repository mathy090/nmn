// routes/receipts.js
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const TestRecord = require('../models/TestRecord');
const User = require('../models/User');

// @route   POST /api/receipts
// @desc    Create a new test record (officer)
// @access  Private
router.post('/', protect, async (req, res) => {
  const { driverName, vehicleNumber, BAC, fine, date } = req.body;

  try {
    const officer = await User.findById(req.user.id);

    const record = new TestRecord({
      officerId: officer._id,
      officerName: `${officer.firstName} ${officer.lastName}`,
      driverName,
      vehicleNumber,
      BAC,
      fine,
      date: date || new Date(),
    });

    await record.save();

    res.json({ success: true, record });
  } catch (err) {
    console.error('Error creating record:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/receipts
// @desc    Get all receipts for logged-in officer
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const records = await TestRecord.find({ officerId: req.user.id }).sort({ date: -1 });
    res.json({ success: true, records });
  } catch (err) {
    console.error('Error fetching records:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/receipts/:officerId
// @desc    Admin: get receipts for specific officer
// @access  Private/Admin
router.get('/:officerId', protect, admin, async (req, res) => {
  try {
    const records = await TestRecord.find({ officerId: req.params.officerId }).sort({ date: -1 });
    res.json({ success: true, records });
  } catch (err) {
    console.error('Error fetching officer records:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

