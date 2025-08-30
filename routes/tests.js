const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateTestRecord } = require('../middleware/validation');
const TestRecord = require('../models/TestRecord');

// GET /api/tests (current officer)
router.get('/', protect, async (req, res) => {
  try {
    const records = await TestRecord.find({ officerId: req.user.id })
      .sort({ timestamp: -1 })
      .limit(20);
    res.json({ success: true, count: records.length, records });
  } catch (err) {
    console.error('Get tests error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/tests (create new record)
router.post('/', protect, validateTestRecord, async (req, res) => {
  try {
    const { idNumber, gender, identifier, numberPlate, alcoholLevel, location, deviceSerial, notes, photo } = req.body;

    const record = new TestRecord({
      idNumber,
      gender,
      identifier,
      numberPlate,
      alcoholLevel,
      location,
      deviceSerial,
      notes,
      photo,           // base64 or URL string; stored as-is
      officerId: req.user.id,
      source: 'mobile_app',
      synced: true,
    });

    const saved = await record.save();
    res.status(201).json({ success: true, record: saved });
  } catch (err) {
    console.error('Create test error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

