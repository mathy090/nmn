const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
  },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['officer', 'admin'], default: 'officer' },
  badgeNumber: { type: String, trim: true },
  department: { type: String, trim: true },
  isBanned: { type: Boolean, default: false }, // <-- added
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

// Index for faster queries
userSchema.index({ identifier: 1 });
userSchema.index({ email: 1 });

// Pre-save hook for special admin
userSchema.pre('save', async function(next) {
  if (this.email === 'tafadzwarunowanda@gmail.com') {
    this.role = 'admin';
    this.firstName = this.firstName || 'Admin';
    this.lastName = this.lastName || 'User';
    this.badgeNumber = this.badgeNumber || 'ADMIN-001';
    this.department = this.department || 'Administration';
  }
  next();
});

// Static method to check if special admin exists
userSchema.statics.checkSpecialAdmin = async function() {
  return await this.findOne({ email: 'tafadzwarunowanda@gmail.com' });
};

// Static method to create special admin if it doesn't exist
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
