// controllers/testController.js
const TestRecord = require('../models/TestRecord');
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

// Create new test record
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
    
    // Determine status based on alcohol level
    let status = 'normal';
    if (alcoholLevel > 0.08) {
      status = 'exceeded';
    } else if (alcoholLevel < 0) {
      status = 'invalid';
    }
    
    // Calculate fine amount
    const fineAmount = calculateFine(alcoholLevel);
    
    // Create new test record
    const testRecord = new TestRecord({
      idNumber,
      gender,
      identifier,
      numberPlate,
      alcoholLevel,
      fineAmount,
      location,
      deviceSerial,
      status,
      notes,
      officerId: req.user.id
    });
    
    const savedRecord = await testRecord.save();
    
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

// Get test records for officer
const getTestRecords = async (req, res) => {
  try {
    const { page = 1, limit = 20, synced } = req.query;
    
    // Build query
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

// Get single test record
const getTestRecordById = async (req, res) => {
  try {
    const record = await TestRecord.findOne({
      _id: req.params.id,
      officerId: req.user.id
    });
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Test record not found'
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
    const record = await TestRecord.findOne({
      _id: req.params.id,
      officerId: req.user.id
    });
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Test record not found'
      });
    }
    
    // Generate and print receipt
    const receiptData = {
      ...record.toObject()
    };
    
    const printResult = await printReceipt(receiptData, 2); // Print 2 copies
    
    // Update record
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

module.exports = {
  createTestRecord,
  getTestRecords,
  getTestRecordById,
  printTestReceipt
};