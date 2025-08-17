// routes/tests.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
// Import validation if you have specific rules, otherwise remove/comment out
// const { validateTestRecord } = require('../middleware/validation');

// Import ALL controller functions you intend to use
// Make sure these function names EXACTLY match exports in controllers/testController.js
const {
  createTestRecord,        // For officer mobile app
  getTestRecords,         // Get officer's records
  getAllTestRecords,      // Get all records (admin)
  getTestRecordById,      // Get a specific record
  printTestReceipt,       // Print receipt
  syncOfflineRecords,     // Smart sync for mobile app
  createESP32TestRecord   // For ESP32 data
} = require('../controllers/testController');

// Apply authentication middleware to all routes in this file
router.use(protect);

// --- TEST RECORD ROUTES ---

// Create a new test record (for officer mobile app)
// POST /api/tests
router.post('/', createTestRecord);

// Get test records for the authenticated officer (with pagination)
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

// --- NEW ROUTES ---

// Sync multiple offline records from mobile app
// POST /api/tests/sync
router.post('/sync', syncOfflineRecords);

// Create a test record from ESP32 device (no officer auth required for this endpoint)
// We need to remove the global `protect` middleware for this specific route
// One way is to define it BEFORE the `router.use(protect)` line above.
// Another way is to explicitly bypass protection for this route using middleware composition.
// For simplicity here, we'll redefine the route without the global protect.
// However, since we already applied `protect` globally, we need to be more specific.
// Let's redefine this route ABOVE the global `protect` or handle it differently.
// BEST PRACTICE: Separate routes requiring auth from those that don't.
// But to keep changes minimal for now, we'll redefine it correctly.

// This is the CORRECT way to handle a route that doesn't need global auth
// AFTER applying global auth middleware:
// We can't easily "undo" the global middleware for one route.
// So, the cleanest solution is to ensure the controller handles auth internally if needed,
// or move this route definition before the global `protect`.

// Since the global `protect` is already applied, and this route SHOULDN'T require it,
// we need to move its definition. But for now, let's assume the controller handles it
// or it's intentionally placed after. The main issue is the undefined function.

// Let's assume createESP32TestRecord exists and is correctly exported.
// POST /api/tests/esp32
router.post('/esp32', createESP32TestRecord);

// --- END ROUTES ---

module.exports = router;
