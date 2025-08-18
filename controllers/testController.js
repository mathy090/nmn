// controllers/testController.js
const TestRecord = require('../models/TestRecord');
const User = require('../models/User');
const { printReceipt } = require('../utils/printer');

// --- HELPER FUNCTIONS ---
// Calculate fine based on alcohol level
const calculateFine = (alcoholLevel) => {
  const level = parseFloat(alcoholLevel);
  if (level <= 0.08) {
    return 0; // No fine if within legal limit
  } else if (level <= 0.15) {
    return 500; // Fine for 0.08 - 0.15 mg/L
  } else if (level <= 0.30) {
    return 1000; // Fine for 0.15 - 0.30 mg/L
  } else {
    return 2000; // Fine for above 0.30 mg/L
  }
};

// Get fine description
const getFineDescription = (alcoholLevel) => {
  const level = parseFloat(alcoholLevel);
  if (level <= 0.08) {
    return 'Within Legal Limit';
  } else if (level <= 0.15) {
    return 'Exceeding Legal Limit (0.08-0.15 mg/L)';
  } else if (level <= 0.30) {
    return 'High Alcohol Level (0.15-0.30 mg/L)';
  } else {
    return 'Very High Alcohol Level (>0.30 mg/L)';
  }
};
// --- END HELPER FUNCTIONS ---

// --- CONTROLLER FUNCTIONS ---

// Create new test record (for officer mobile app)
const createTestRecord = async (req, res) => {
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
    
    // Validate required fields
    if (!idNumber || !gender || !identifier || !numberPlate || 
        alcoholLevel === undefined || !location || !deviceSerial) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Validate alcohol level
    const level = parseFloat(alcoholLevel);
    if (isNaN(level) || level < 0 || level > 1.0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alcohol level. Must be between 0 and 1.0 mg/L'
      });
    }
    
    // Determine status based on alcohol level
    let status = 'normal';
    if (level > 0.08) {
      status = 'exceeded';
    } else if (level < 0) {
      status = 'invalid';
    }
    
    // Calculate fine amount
    const fineAmount = calculateFine(level);
    
    // Associate record with the authenticated officer
    // `req.user` is populated by the `protect` middleware
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
      officerId, // Associate with the authenticated officer
      source: 'mobile_app' // Indicate source
    });
    
    const savedRecord = await testRecord.save();
    
    // Populate officer details for the response (optional)
    await savedRecord.populate('officerId', 'identifier firstName lastName badgeNumber');
    
    res.status(201).json({
      success: true,
      message: 'Test record created successfully',
       savedRecord
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

// Get test records for officer
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
       records
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
       records
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

// Get single test record by ID
const getTestRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);
    
    let query = { _id: id };
    
    // If not admin, restrict to officer's own records
    if (user.role !== 'admin') {
      query.officerId = req.user.id;
    }
    
    const record = await TestRecord.findOne(query).populate('officerId', 'identifier firstName lastName badgeNumber badgeNumber');
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Test record not found or access denied'
      });
    }
    
    res.status(200).json({
      success: true,
       record
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
    const receiptData = {
      ...record.toObject(),
      officerName: `${user.firstName} ${user.lastName}`,
      badgeNumber: user.badgeNumber
    };
    
    const printResult = await printReceipt(receiptData, 2); // Print 2 copies
    
    // Update record
    record.receiptPrinted = true;
    await record.save();
    
    res.status(200).json({
      success: true,
      message: 'Receipt printed successfully',
       printResult
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

// --- SMART SYNC OFFLINE RECORDS ---
/**
 * Sync Offline Records
 * 1. Receives an array of records from the frontend
 * 2. Filters out records that are already synced (based on a unique ID or timestamp)
 * 3. Processes and saves unsynced records to the database
 * 4. Returns a summary of synced records and any errors
 */
const syncOfflineRecords = async (req, res) => {
  try {
    const records = req.body.records; // Expecting an array of record objects

    // Validate input
    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format. Expected an array of records.'
      });
    }

    if (records.length === 0) {
        return res.status(200).json({
            success: true,
            message: 'No records provided for sync.',
            synced: 0,
            errors: []
        });
    }

    console.log(`Starting sync for ${records.length} records from user ${req.user.id}...`);

    let syncedCount = 0;
    let errors = [];

    // Process each record
    for (const record of records) {
      try {
        // --- VALIDATE RECORD ---
        // Check for required fields (basic check)
        if (!record.idNumber || !record.gender || !record.identifier || !record.numberPlate ||
            record.alcoholLevel === undefined || !record.location || !record.deviceSerial) {
          console.warn(`Skipping record due to missing fields:`, record);
          errors.push({
            recordId: record.id || record.timestamp || 'unknown',
            error: 'Missing required fields in record data'
          });
          continue; // Skip this record
        }

        // Validate alcohol level
        const level = parseFloat(record.alcoholLevel);
        if (isNaN(level) || level < 0 || level > 1.0) {
          console.warn(`Skipping record due to invalid alcohol level:`, record);
          errors.push({
            recordId: record.id || record.timestamp || 'unknown',
            error: 'Invalid alcohol level in record data'
          });
          continue; // Skip this record
        }
        // --- END VALIDATE RECORD ---

        // --- SMART SYNC LOGIC ---
        // Check if record already exists in DB (prevent duplicates)
        // We assume each record from the frontend has a unique `id` or `timestamp`
        // You might need a more robust way to identify duplicates (e.g., hash of data)
        let existingRecord;
        if (record.id) {
            // If frontend provides a unique ID
            existingRecord = await TestRecord.findOne({ id: record.id, officerId: req.user.id });
        } else if (record.timestamp) {
            // If using timestamp (less reliable if multiple records per second)
            existingRecord = await TestRecord.findOne({ timestamp: record.timestamp, officerId: req.user.id });
        }

        if (existingRecord) {
            // Record already exists, skip syncing
            console.log(`Skipping duplicate/synced record ID: ${record.id || record.timestamp}`);
            syncedCount++; // Count as "processed"
            continue; // Move to the next record
        }
        // --- END SMART SYNC LOGIC ---

        // --- PROCESS AND SAVE NEW RECORD ---
        // Determine status based on alcohol level
        let status = 'normal';
        const level = parseFloat(record.alcoholLevel);
        if (level > 0.08) {
          status = 'exceeded';
        } else if (level < 0) {
          status = 'invalid';
        }

        // Calculate fine amount (use your existing logic or send from frontend)
        const fineAmount = record.fineAmount !== undefined ? parseFloat(record.fineAmount) : calculateFine(level);

        // Create new test record
        const testRecord = new TestRecord({
          idNumber: record.idNumber,
          gender: record.gender,
          identifier: record.identifier, // Name/ID of the person tested
          numberPlate: record.numberPlate,
          alcoholLevel: level,
          fineAmount,
          location: record.location,
          deviceSerial: record.deviceSerial,
          status,
          notes: record.notes,
          officerId: req.user.id, // Associate with the authenticated officer
          timestamp: record.timestamp ? new Date(record.timestamp) : new Date(), // Use provided timestamp or current
          source: record.source || 'mobile_app_offline_sync', // Indicate source
          synced: true // Mark as synced upon successful creation
          // receiptPrinted would be false by default
        });

        const savedRecord = await testRecord.save();
        console.log(`Successfully synced record ID: ${savedRecord._id}`);
        syncedCount++;
        // --- END PROCESS AND SAVE NEW RECORD ---

      } catch (recordError) {
        console.error(`Error syncing individual record:`, recordError);
        errors.push({
          // Include identifying info if available
          recordId: record.id || record.timestamp || 'unknown',
          error: recordError.message || 'Unknown error during record sync'
        });
      }
    }

    const message = `Sync completed: ${syncedCount} records processed (${records.length - errors.length} successful).`;
    console.log(message);
    console.log(`Errors: ${errors.length}`);

    res.status(200).json({
      success: true,
      message,
      synced: syncedCount,
      totalProcessed: records.length,
      errors
    });

  } catch (error) {
    console.error('Sync offline records error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync offline records',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// --- END SMART SYNC OFFLINE RECORDS ---

// --- CREATE TEST RECORD FROM ESP32 ---
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
    
    // Validate required fields
    if (!idNumber || !gender || !identifier || !numberPlate || 
        alcoholLevel === undefined || !location || !deviceSerial) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Validate alcohol level
    const level = parseFloat(alcoholLevel);
    if (isNaN(level) || level < 0 || level > 1.0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alcohol level. Must be between 0 and 1.0 mg/L'
      });
    }
    
    // Determine status based on alcohol level
    let status = 'normal';
    if (level > 0.08) {
      status = 'exceeded';
    } else if (level < 0) {
      status = 'invalid';
    }
    
    // Calculate fine amount
    const fineAmount = calculateFine(level);
    
    // Create new test record (no officerId initially, marked as ESP32 source)
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
      officerId: null, // Will be linked when officer reviews/approves
      source: 'esp32' // Mark as coming from ESP32
    });
    
    const savedRecord = await testRecord.save();
    
    res.status(201).json({
      success: true,
      message: 'ESP32 test record created successfully',
       savedRecord
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
// --- END CREATE TEST RECORD FROM ESP32 ---

// --- EXPORT ALL FUNCTIONS ---
module.exports = {
  createTestRecord,        // For officer mobile app
  getTestRecords,         // Get officer's records
  getAllTestRecords,      // Get all records (admin)
  getTestRecordById,      // Get a specific record
  printTestReceipt,       // Print receipt
  syncOfflineRecords,     // Smart sync for mobile app
  createESP32TestRecord   // For ESP32 data
};
// --- END EXPORT ALL FUNCTIONS ---
