// routes/tests.js
const express = require('Express');
const router = Express.Router();
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

// Apply authentication middleware
router.use(protect );

// Define Routes
router.post('/', createTestRecord);
router.get('/', getTestRecords);
router.get('/all', getAllTestRecords);
router.get('/:id', getTestRecordById);
router.post('/:id/print', printTestReceipt);
router.post('/sync', syncOfflineRecords);
router.post('/ESP32', createESP32TestRecord); // Note: This route may not need auth

module.exports = router;
