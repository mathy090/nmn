// controllers/testController.js (updated section)
// Add this new function to handle ESP32 data
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
    
    // Validate required fields
    if (!idNumber || !gender || !identifier || !numberPlate || 
        alcoholLevel === undefined || !location || !deviceSerial) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
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
      officerId: null, // ESP32 records might not have an officer ID initially
      source: 'esp32' // Mark as coming from ESP32
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

// Update exports to include the new function
module.exports = {
  createTestRecord,
  createESP32TestRecord, // Add this line
  getTestRecords,
  getAllTestRecords,
  getTestRecordById,
  printTestReceipt
};
