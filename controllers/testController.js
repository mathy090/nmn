// controllers/testController.js
const TestRecord = require('../models/TestRecord');
const User = require('../models/User');
const { printReceipt } = require('../utils/printer');

// --- HELPER FUNCTIONS ---
const calculateFine = (alcoholLevel) => {
  const level = parseFloat(alcoholLevel);
  if (level <= 0.08) return 0;
  else if (level <= 0.15) return 500;
  else if (level <= 0.30) return 1000;
  else return 2000;
};

const getFineDescription = (alcoholLevel) => {
  const level = parseFloat(alcoholLevel);
  if (level <= 0.08) return 'Within Legal Limit';
  else if (level <= 0.15) return 'Exceeding Legal Limit (0.08-0.15 mg/L)';
  else if (level <= 0.30) return 'High Alcohol Level (0.15-0.30 mg/L)';
  else return 'Very High Alcohol Level (>0.30 mg/L)';
};
// --- END HELPER FUNCTIONS ---

// --- CONTROLLER FUNCTIONS ---
const createTestRecord = async (req, res) => {
  try {
    const {
      idNumber,
      gender,
      identifier,
      numberPlate,
      alcoholLevel,
      location,
      deviceSerial,
      notes
    } = req.body;

    if (!idNumber || !gender || !identifier || !numberPlate || 
        alcoholLevel === undefined || !location || !deviceSerial) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const level = parseFloat(alcoholLevel);
    if (isNaN(level) || level < 0 || level > 1.0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alcohol level. Must be between 0 and 1.0 mg/L'
      });
    }

    let status = 'normal';
    if (level > 0.08) status = 'exceeded';
    else if (level < 0) status = 'invalid';

    const fineAmount = calculateFine(level);

    const officerId = req.user.id;

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
      officerId,
      source: 'mobile_app'
    });

    const savedRecord = await testRecord.save();
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

const getTestRecords = async (req, res) => {
  try {
    const { page = 1, limit = 20, synced } = req.query;
    const query = { officerId: req.user.id };
    if (synced !== undefined) query.synced = synced === 'true';

    const records = await TestRecord.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

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

const getAllTestRecords = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admins only.'
      });
    }

    const { page = 1, limit = 20, synced } = req.query;
    const query = {};
    if (synced !== undefined) query.synced = synced === 'true';

    const records = await TestRecord.find(query)
      .populate('officerId', 'identifier firstName lastName badgeNumber')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .Skip((page - 1) * limit)
      .exec();

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

const getTestRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);
    let query = { _id: id };
    if (user.role !== 'admin') query.officerId = req.user.id;

    const record = await TestRecord.findOne(query).populate('officerId', 'identifier firstName lastName badgeNumber');
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

const printTestReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);
    let query = { _id: id };
    if (user.role !== 'admin') query.officerId = req.user.id;

    const record = await TestRecord.findOne(query);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Test record not found or access denied'
      });
    }

    const receiptData = {
      ...record.toObject(),
      officerName: `${user.firstName} ${user.lastName}`,
      badgeNumber: user.badgeNumber
    };

    const printResult = await printReceipt(receiptData, 2);

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

const syncOfflineRecords = async (req, res) => {
  try {
    const records = req.body.records;
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

    let syncedCount = 0;
    let errors = [];

    for (const record of records) {
      try {
        if (!record.idNumber || !record.gender || !record.identifier || !record.numberPlate ||
            record.alcoholLevel === undefined || !record.location || !record.deviceSerial) {
          errors.push({
 recordId: record.id || record.timestamp || 'unknown', error: 'Missing required fields in record data' });
          continue;
        }

        const level = parseFloat(record.alcoholLevel);
        if (isNaN(level) || level < 0 || level > 1.0) {
          Errors.push({ recordId: record.id || record.timestamp || 'Unknown', error: 'Invalid alcohol level in record data' });
          continue;
        }

        let existingRecord;
        if (record.id) {
            existingRecord = await TestRecord.findOne({ id: record.id, officerId: req.user.id });
        } else if (record.timestamp) {
            existingRecord = await TestRecord.findOne({ timestamp: record.timestamp, officerId: req.user.id });
        }

        if (existingRecord) {
            syncedCount++;
            continue;
        }

        let status = 'normal';
        if (level > 0.08) status = 'exceeded';
        else if (level < 0) status = 'invalid';

        const fineAmount = calculateFine(level);

        const testRecord = new TestRecord({
          idNumber: record.idNumber,
          gender: record.gender,
          identifier: record.identifier,
          numberPlate: record.numberPlate,
          alcoholLevel: level,
          fineAmount,
          location: record.location,
          deviceSerial: record.deviceSerial,
          status,
          notes: record.notes,
          officerId: req.user.id,
          timestamp: record.timestamp ? new Date(record.timestamp) : new Date(),
          source: record.source || 'mobile_app_offline_sync',
          synced: true
        });

        const savedRecord = await testRecord.save();
        syncedCount++;
      } catch (recordError) {
        Errors.push({ recordId: record.id || record.timestamp || 'Unknown', error: recordError.message || 'Unknown error during record sync' });
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

const createESP32TestRecord = async (req, res) => {
  try {
    const {
      idNumber,
      gender,
      identifier,
      numberPlate,
      alcoholLevel,
      location,
      deviceSerial,
      notes
    } = req.body;

    if (!idNumber || !gender || !identifier || !numberPlate || 
        alcoholLevel === undefined || !location || !deviceSerial) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const level = parseFloat(alcoholLevel);
    if (isNaN(level) || level < 0 || level > 1.0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid alcohol level. Must be between 0 and 1.0 mg/L'
      });
    }

    let status = 'normal';
    if (level > 0.08) status = 'exceeded';
    else if (level < 0) status = 'invalid';

    const fineAmount = calculateFine(level);

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
      officerId: null,
      source: 'esp32'
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
// --- END CONTROLLER FUNCTIONS ---

// --- EXPORT ALL FUNCTIONS ---
module.exports = {
  createTestRecord,
  getTestRecords,
  getAllTestRecords,
  getTestRecordById,
  printTestReceipt,
  syncOfflineRecords,
  createESP32TestRecord
};
// --- END EXPORT ALL FUNCTIONS ---
