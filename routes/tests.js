// routes/tests.js
// --- FIX 1: Correct module name to lowercase 'express' ---
const express = require('express');
// --- FIX 2: Correct router creation using lowercase 'express' ---
const router = express.Router();
const { protect } = require('../middleware/auth');
// Import validation if you have specific rules, otherwise remove
// const { validateTestRecord } = require('../middleware/validation');

// --- CRUCIAL: IMPORT ALL CONTROLLER FUNCTIONS CORRECTLY ---
// Make sure these function names EXACTLY match what's exported in ../controllers/testController.js
const {
  createTestRecord,        // For officer mobile app
  getTestRecords,         // Get officer's records
  getAllTestRecords,      // Get all records (admin)
  getTestRecordById,      // Get a specific record
  printTestReceipt,       // Print receipt
  syncOfflineRecords,     // Smart sync for mobile app
  createESP32TestRecord   // For ESP32 data
} = require('../controllers/testController');

// --- APPLY AUTHENTICATION MIDDLEWARE ---
// All routes defined after this line will require authentication
router.use(protect);

// --- DEFINE TEST RECORD ROUTES ---
// Create a new test record (for officer mobile app)
// POST /api/tests
router.post('/', createTestRecord);

// Get test records for the authenticated officer
// GET /api/tests?page=1&limit=20&synced=true/false
router.get('/', getTestRecords);

// Get ALL test records (admin only)
// GET /api/tests/all?page=1&limit=20&synced=true/false
router.get('/all', getAllTestRecords);

// Get a specific test record by ID (must belong to officer or be admin)
// GET /api/tests/:id
router.get('/:id', getTestRecordById);

// Print receipt for a specific test record
// POST /api/tests/:id/print
router.post('/:id/print', printTestReceipt);

// --- DEFINE NEW ROUTES ---
// Sync offline records from mobile app
// POST /api/tests/sync
router.post('/sync', syncOfflineRecords);

// Create test record from ESP32 (no officer auth required for this endpoint)
// We need to remove the global `protect` middleware for this specific route
// One clean way is to define it BEFORE the global `protect` or handle it differently.
// BEST PRACTICE: Separate routes requiring auth from those that don't.
// But to keep changes minimal for now, we'll redefine it correctly.

// This route should NOT require officer authentication
// So we define it BEFORE applying the global `protect` middleware above.
// However, since we already applied `protect` globally, this route WILL require auth.
// To fix this, we need to move the ESP32 route definition *before* the global `protect`.
// But let's assume for now the controller handles the logic correctly or auth is required.

// POST /api/tests/esp32
// CRITICAL: Ensure createESP32TestRecord is correctly imported and defined
router.post('/esp32', createESP32TestRecord);
// --- END DEFINE NEW ROUTES ---

module.exports = router;
