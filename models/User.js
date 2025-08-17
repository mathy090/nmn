// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    unique: true, // Ensure identifier is unique
    trim: true
  },
  email: {
    type: String,
    // Not required for all users, but unique if provided
    unique: true, // Ensure email is unique if provided
    sparse: true, // Allows multiple documents with null/undefined email
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6 // Enforce minimum password length
  },
  role: {
    type: String,
    enum: ['officer', 'admin'],
    default: 'officer'
  },
  badgeNumber: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  lastPasswordChange: {
    type: Date
  },
  // --- Fields for Password Reset ---
  passwordResetToken: {
    type: String,
    select: false // Exclude by default from queries for security
  },
  passwordResetExpires: {
    type: Date,
    select: false // Exclude by default from queries for security
  }
  // -------------------------------
});

// Index for faster queries on commonly searched fields
userSchema.index({ identifier: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
