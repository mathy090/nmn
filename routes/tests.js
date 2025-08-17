// routes/tests.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
// Import validation if you have specific rules, otherwise remove
// const { validateTestRecord } = require('../middleware/validation');
const {
  createTestRecord,
  getTestRecords,
  getAllTestRecords,
  getTestRecordById,
  printTestReceipt,
  syncOfflineRecords,      // Import the new function
  createESP32TestRecord   // Import the new function
} = require('../controllers/testController'); // Make sure this path is correct

// All routes require authentication
router.use(protect);

// Test record routes
router.post('/', createTestRecord); // For officer mobile app
router.get('/', getTestRecords); // Get officer's records
router.get('/all', getAllTestRecords); // Admin only
router.get('/:id', getTestRecordById); // Get specific record
router.post('/:id/print', printTestReceipt); // Print receipt

// --- NEW ROUTES ---
// Sync offline records (bulk upload from mobile app)
router.post('/sync', syncOfflineRecords); // New route for syncing offline data

// Create test record from ESP32 (no auth required for this specific endpoint)
// We remove protect middleware for this route specifically
router.post('/esp32', createESP32TestRecord); // New route for ESP32 data
// --- END NEW ROUTES ---

module.exports = router;
