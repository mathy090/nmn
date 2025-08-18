// routes/tests.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateTestRecord } = require('../middleware/validation');
// Make sure these function names match exactly what's exported in testController.js
const { 
  createTestRecord,
  getTestRecords,
  getTestRecordById,
  printTestReceipt
} = require('../controllers/testController');

// All routes require authentication
router.use(protect);

// Test record routes
router.post('/', validateTestRecord, createTestRecord);
router.get('/', getTestRecords);
router.get('/:id', getTestRecordById);
router.post('/:id/print', printTestReceipt);

module.exports = router;