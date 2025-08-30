// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/tests');
const adminRoutes = require('./routes/admin');

// Initialize app
const app = express();

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Breathalyzer backend is running',
    timestamp: new Date().toISOString()
  });
});

// --- Initialize special admin account ---
(async () => {
  try {
    await new Promise((resolve, reject) => {
      const state = mongoose.connection.readyState;
      if (state === 1) resolve(); // connected
      else {
        mongoose.connection.once('open', resolve);
        mongoose.connection.once('error', reject);
      }
    });

    console.log('Database connected, checking special admin account...');

    const User = require('./models/User');
    const bcrypt = require('bcryptjs');

    let specialAdmin = await User.findOne({ email: 'tafadzwarunowanda@gmail.com' });

    if (!specialAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Mathews##$090', salt);

      specialAdmin = new User({
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
      console.log('Special admin account created successfully.');
    } else if (specialAdmin.role !== 'admin') {
      specialAdmin.role = 'admin';
      specialAdmin.firstName = specialAdmin.firstName || 'Admin';
      specialAdmin.lastName = specialAdmin.lastName || 'User';
      specialAdmin.badgeNumber = specialAdmin.badgeNumber || 'ADMIN-001';
      specialAdmin.department = specialAdmin.department || 'Administration';
      await specialAdmin.save();
      console.log('Special admin account updated to admin.');
    } else {
      console.log('Special admin account already exists.');
    }
  } catch (error) {
    console.error('Error initializing special admin account:', error);
  }
})();
// --- End admin initialization ---

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Breathalyzer backend running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log('Special admin credentials: tafadzwarunowanda@gmail.com / Mathews##$090');
});
