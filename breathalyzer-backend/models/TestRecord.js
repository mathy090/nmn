// models/TestRecord.js
const mongoose = require('mongoose');

const testRecordSchema = new mongoose.Schema({
  idNumber: {
    type: String,
    required: true,
    trim: true
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
    trim: true
  },
  alcoholLevel: {
    type: Number,
    required: true,
    min: 0,
    max: 1.0
  },
  fineAmount: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  officerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true
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
    required: true
  },
  status: {
    type: String,
    enum: ['normal', 'exceeded', 'invalid'],
    default: 'normal'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for faster queries
testRecordSchema.index({ officerId: 1, timestamp: -1 });
testRecordSchema.index({ synced: 1 });

module.exports = mongoose.model('TestRecord', testRecordSchema);