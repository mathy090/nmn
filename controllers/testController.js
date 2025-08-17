// controllers/testController.js
const TestRecord = require('../models/TestRecord');
const User = require('../models/User');
const { printReceipt } = require('../utils/printer');

// Calculate fine based on alcohol level
const calculateFine = (alcoholLevel) => {
  if (alcoholLevel <= 0.08) {
    return 0; // No fine if within legal limit
  } else if (alcoholLevel <= 0.15) {
    return 500; // Fine for 0.08 - 0.15 mg/L
  } else if (alcoholLevel <= 0.30) {
    return 1000; // Fine for 0.15 - 0.30 mg/L
  } else {
    return 2000; // Fine for above 0.30 mg/L
  }
};

// --- Main Function to Create Test Record (for mobile app/officers) ---
const createTestRecord = async (req, res) => {
  try {
    const {
      idNumber,
      gender,
      identifier, // This is the officer's identifier/name
      numberPlate,
      alcoholLevel,
      location,
      deviceSerial,
      notes,
      fineAmount: providedFineAmount // Accept fineAmount if sent from frontend
    } = req.body;

    // Validate required fields
    if (!idNumber || !gender || !identifier || !numberPlate ||
        alcoholLevel === undefined || alcoholLevel === null || !location || !deviceSerial) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: idNumber, gender, identifier, numberPlate, alcoholLevel, location, deviceSerial'
      });
    }

    // Validate alcohol level range
    const level = parseFloat(alcoholLevel);
    if (isNaN(level) || level < 0 || level > 1.0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alcohol level. Must be a number between 0 and 1.0'
      });
    }

    // Determine status based on alcohol level
    let status = 'normal';
    if (level > 0.08) {
      status = 'exceeded';
    } else if (level < 0) {
      status = 'invalid';
    }

    // Calculate fine amount if not provided, otherwise use the provided one
    // (Useful if frontend has specific calculation logic)
    const fineAmount = providedFineAmount !== undefined ? parseFloat(providedFineAmount) : calculateFine(level);

    // Associate record with the authenticated officer
    // req.user is populated by the `protect` middleware
    const officerId = req.user.id;

    // Create new test record
    const testRecord = new TestRecord({
      idNumber,
      gender,
      identifier, // Name/ID of the person tested
      numberPlate,
      alcoholLevel: level,
      fineAmount,
      location,
      deviceSerial,
      status,
      notes,
      officerId,
      source: 'mobile_app' // Indicate source
    });

    const savedRecord = await testRecord.save();

    // Populate officer details for the response (optional)
    await savedRecord.populate('officerId', 'identifier firstName lastName badgeNumber');

    res.status(201).json({
      success: true,
      message: 'Test record created successfully',
      data: savedRecord
    });
  } catch (error) {
    console.error('Create test record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create test record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// --- Function to Create Test Record from ESP32 (no officer auth required) ---
const createESP32TestRecord = async (req, res) => {
  try {
    const {
      idNumber,
      gender,
      identifier, // Name/ID of the person tested
      numberPlate,
      alcoholLevel,
      location,
      deviceSerial,
      notes
    } = req.body;

    // Validate required fields for ESP32 data
    if (!idNumber || !gender || !identifier || !numberPlate ||
        alcoholLevel === undefined || alcoholLevel === null || !location || !deviceSerial) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for ESP32 record'
      });
    }

    const level = parseFloat(alcoholLevel);
    if (isNaN(level) || level < 0 || level > 1.0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alcohol level for ESP32 record. Must be between 0 and 1.0'
      });
    }

    // Determine status
    let status = 'normal';
    if (level > 0.08) {
      status = 'exceeded';
    } else if (level < 0) {
      status = 'invalid';
    }

    // Calculate fine
    const fineAmount = calculateFine(level);

    // Create record (no officerId initially, marked as ESP32 source)
    const testRecord = new TestRecord({
      idNumber,
      gender,
      identifier,
      numberPlate,
      alcoholLevel: level,
      fineAmount,
      location,
      deviceSerial,
      status,
      notes,
      officerId: null, // Will be linked when officer reviews/approves
      source: 'esp32'
    });

    const savedRecord = await testRecord.save();

    res.status(201).json({
      success: true,
      message: 'ESP32 test record created successfully',
      data: savedRecord
    });
  } catch (error) {
    console.error('Create ESP32 test record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ESP32 test record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get test records for the logged-in officer
const getTestRecords = async (req, res) => {
  try {
    const { page = 1, limit = 20, synced } = req.query;

    // Build query for officer's records
    const query = { officerId: req.user.id };
    if (synced !== undefined) {
      query.synced = synced === 'true';
    }

    // Execute query with pagination
    const records = await TestRecord.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count
    const count = await TestRecord.countDocuments(query);

    res.status(200).json({
      success: true,
      count: records.length,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: records
    });
  } catch (error) {
    console.error('Get test records error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve test records',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get ALL test records (admin only)
const getAllTestRecords = async (req, res) => {
  try {
    // Check if user is admin (this check should ideally be in middleware)
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admins only.'
      });
    }

    const { page = 1, limit = 20, synced } = req.query;

    // Build query
    const query = {};
    if (synced !== undefined) {
      query.synced = synced === 'true';
    }

    // Execute query with pagination and populate officer info
    const records = await TestRecord.find(query)
      .populate('officerId', 'identifier firstName lastName badgeNumber')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count
    const count = await TestRecord.countDocuments(query);

    res.status(200).json({
      success: true,
      count: records.length,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: records
    });
  } catch (error) {
    console.error('Get all test records error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve all test records',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single test record by ID (must belong to officer or be admin)
const getTestRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);

    let query = { _id: id };

    // If not admin, restrict to officer's own records
    if (user.role !== 'admin') {
      query.officerId = req.user.id;
    }

    const record = await TestRecord.findOne(query).populate('officerId', 'identifier firstName lastName badgeNumber');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Test record not found or access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Get test record error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve test record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Print receipt for test record
const printTestReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);

    let query = { _id: id };

    // If not admin, restrict to officer's own records
    if (user.role !== 'admin') {
      query.officerId = req.user.id;
    }

    const record = await TestRecord.findOne(query);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Test record not found or access denied'
      });
    }

    // Generate and print receipt
    // Note: Actual printing logic depends on your setup (network printer, etc.)
    // This is a placeholder for the print action
    const printResult = await printReceipt(record.toObject(), 2); // Print 2 copies

    // Update record status
    record.receiptPrinted = true;
    await record.save();

    res.status(200).json({
      success: true,
      message: 'Receipt printed successfully',
      data: printResult
    });
  } catch (error) {
    console.error('Print receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to print receipt',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export all functions
module.exports = {
  createTestRecord,        // Main creation function for officers
  createESP32TestRecord,  // Creation function for ESP32 data
  getTestRecords,         // Get officer's records
  getAllTestRecords,      // Get all records (admin)
  getTestRecordById,      // Get a specific record
  printTestReceipt        // Print receipt
};
