// controllers/syncController.js
const TestRecord = require('../models/TestRecord');

// Sync records from mobile app
const syncRecords = async (req, res) => {
  try {
    const records = req.body.records;
    
    // Validate records
    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format. Expected array of records.'
      });
    }
    
    // Process each record
    const processedRecords = [];
    const errors = [];
    
    for (const record of records) {
      try {
        // Check if record already exists
        const existingRecord = await TestRecord.findOne({
          _id: record._id,
          officerId: req.user.id
        });
        
        if (existingRecord) {
          // Update existing record
          Object.assign(existingRecord, record);
          existingRecord.synced = true;
          await existingRecord.save();
          processedRecords.push(existingRecord);
        } else {
          // Create new record
          const newRecord = new TestRecord({
            ...record,
            officerId: req.user.id,
            synced: true
          });
          const savedRecord = await newRecord.save();
          processedRecords.push(savedRecord);
        }
      } catch (recordError) {
        errors.push({
          recordId: record._id,
          error: recordError.message
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Synced ${processedRecords.length} records successfully`,
      processed: processedRecords.length,
      errors: errors.length,
      data: {
        processedRecords,
        errors
      }
    });
  } catch (error) {
    console.error('Sync records error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync records',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get unsynced records
const getUnsyncedRecords = async (req, res) => {
  try {
    const records = await TestRecord.find({
      officerId: req.user.id,
      synced: false
    }).sort({ timestamp: -1 });
    
    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Get unsynced records error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve unsynced records',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  syncRecords,
  getUnsyncedRecords
};