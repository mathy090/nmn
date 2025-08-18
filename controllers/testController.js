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

        // Validate alcohol level (rename 'level' to 'alcoholLevelFloat' to avoid conflict)
        const alcoholLevelFloat = parseFloat(record.alcoholLevel);
        if (isNaN(alcoholLevelFloat) || alcoholLevelFloat < 0 || alcoholLevelFloat > 1.0) {
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
        // Determine status based on alcohol level (use renamed variable)
        let status = 'normal';
        if (alcoholLevelFloat > 0.08) {
          status = 'exceeded';
        } else if (alcoholLevelFloat < 0) {
          status = 'invalid';
        }

        // Calculate fine amount (use renamed variable)
        const fineAmount = calculateFine(alcoholLevelFloat);

        // Create new test record
        const testRecord = new TestRecord({
          idNumber: record.idNumber,
          gender: record.gender,
          identifier: record.identifier, // Name/ID of the person tested
          numberPlate: record.numberPlate,
          alcoholLevel: alcoholLevelFloat, // Use renamed variable
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
