// routes/tests.js
const express = require('express'); // <-- Correct lowercase 'e'
const router = express.Router(); // <-- Correct lowercase 'e'
const { protect } = require('../middleware/auth');
const {
  createTestRecord,
  getTestRecords,
  getAllTestRecords,
  getTestRecordById,
  printTestReceipt,
  syncOfflineRecords,
  createESP32TestRecord
} = require('../controllers/testController');

// Apply authentication middleware to all routes
router.use(protect);

// Test record routes
router.post('/', createTestRecord);
router.get('/', getTestRecords);
router.get('/all', getAllTestRecords);
router.get('/:id', getTestRecordById);
router.post('/:id/print', printTestReceipt);
router.post('/sync', syncOfflineRecords);
router.post('/esp32', createESP32TestRecord);

module.exports = router;
