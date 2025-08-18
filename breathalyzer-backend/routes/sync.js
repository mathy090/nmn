// routes/sync.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { syncRecords, getUnsyncedRecords } = require('../controllers/syncController');

// All routes require authentication
router.use(protect);

// Sync routes
router.post('/', syncRecords);
router.get('/unsynced', getUnsyncedRecords);

module.exports = router;