const mongoose = require('mongoose');

const testRecordSchema = new mongoose.Schema({
  idNumber: {
    type: String,
    required: true,
    trim: true,
    minlength: [3, 'ID Number must be at least 3 characters'],
    maxlength: [20, 'ID Number cannot exceed 20 characters']
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other']
  },
  identifier: {
    type: String,
    required: true,
    trim: true
  },
  numberPlate: {
    type: String,
    required: true,
    trim: true,
    maxlength: [15, 'Number plate cannot exceed 15 characters']
  },
  alcoholLevel: {
    type: Number,
    required: true,
    min: [0, 'Alcohol level cannot be negative'],
    max: [1.0, 'Maximum alcohol level is 1.0 mg/L']
  },
  fineAmount: {
    type: Number,
    default: 0,
    min: [0, 'Fine amount cannot be negative']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  synced: {
    type: Boolean,
    default: false
  },
  receiptPrinted: {
    type: Boolean,
    default: false
  },
  deviceSerial: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Device serial cannot exceed 50 characters']
  },
  status: {
    type: String,
    enum: ['normal', 'exceeded', 'invalid'],
    default: 'normal'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Pre-save middleware to set status based on alcohol level
testRecordSchema.pre('save', function(next) {
  if (this.alcoholLevel > 0.05) {
    this.status = 'exceeded';
  } else {
    this.status = 'normal';
  }
  
  // Set fine amount based on status
  if (this.status === 'exceeded') {
    // Calculate fine based on alcohol level (example: $100 per 0.01 over limit)
    this.fineAmount = Math.max(100, Math.floor((this.alcoholLevel - 0.05) * 10000));
  } else {
    this.fineAmount = 0;
  }
  
  next();
});

// Index for faster queries
testRecordSchema.index({ identifier: 1, timestamp: -1 });
testRecordSchema.index({ synced: 1 });
testRecordSchema.index({ timestamp: -1 });

module.exports = mongoose.model('TestRecord', testRecordSchema);
