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
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    // Special admin account email is required
    required: function() {
      return this.email === 'tafadzwarunowanda@gmail.com';
    }
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    // Special admin account has specific first name
    default: function() {
      return this.email === 'tafadzwarunowanda@gmail.com' ? 'Admin' : '';
    }
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    // Special admin account has specific last name
    default: function() {
      return this.email === 'tafadzwarunowanda@gmail.com' ? 'User' : '';
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 6 // Enforce minimum password length
  },
  role: {
    type: String,
    enum: ['officer', 'admin'],
    default: function() {
      // Special admin account always gets admin role
      return this.email === 'tafadzwarunowanda@gmail.com' ? 'admin' : 'officer';
    }
  },
  badgeNumber: {
    type: String,
    trim: true,
    // Special admin account has specific badge number
    default: function() {
      return this.email === 'tafadzwarunowanda@gmail.com' ? 'ADMIN-001' : '';
    }
  },
  department: {
    type: String,
    trim: true,
    // Special admin account has specific department
    default: function() {
      return this.email === 'tafadzwarunowanda@gmail.com' ? 'Administration' : '';
    }
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

// Pre-save hook to ensure special admin account has correct details
userSchema.pre('save', function(next) {
  // If this is the special admin account
  if (this.email === 'tafadzwarunowanda@gmail.com') {
    // Ensure role is admin
    this.role = 'admin';
    
    // Ensure other fields are properly set
    this.firstName = this.firstName || 'Admin';
    this.lastName = this.lastName || 'User';
    this.badgeNumber = this.badgeNumber || 'ADMIN-001';
    this.department = this.department || 'Administration';
  }
  next();
});

// Static method to check if special admin account exists
userSchema.statics.checkSpecialAdmin = async function() {
  return await this.findOne({ email: 'tafadzwarunowanda@gmail.com' });
};

// Static method to create special admin account if it doesn't exist
userSchema.statics.createSpecialAdmin = async function() {
  const specialAdminExists = await this.checkSpecialAdmin();
  
  if (!specialAdminExists) {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Mathews##$090', salt);
    
    const specialAdmin = new this({
      identifier: 'tafadzwarunowanda@gmail.com',
      email: 'tafadzwarunowanda@gmail.com',
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      role: 'admin',
      badgeNumber: 'ADMIN-001',
      department: 'Administration'
    });
    
    await specialAdmin.save();
    console.log('Special admin account created successfully');
    return specialAdmin;
  }
  
  return null;
};

module.exports = mongoose.model('User', userSchema);
