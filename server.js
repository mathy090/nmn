const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/tests');

// Initialize app
const app = express();

// Connect to database
connectDB();

// Security middleware
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Breathalyzer backend is running',
    timestamp: new Date().toISOString()
  });
});

// --- INITIALIZE SPECIAL ADMIN ACCOUNT ON STARTUP ---
(async () => {
  try {
    // Wait for database connection to be established
    await new Promise((resolve, reject) => {
      const state = mongoose.connection.readyState;
      if (state === 1) { // 1 = connected
        resolve();
      } else {
        mongoose.connection.once('open', resolve);
        mongoose.connection.once('error', reject);
      }
    });
    
    console.log('Database connected, initializing special admin account...');
    
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    
    // Check if special admin already exists
    let specialAdmin = await User.findOne({ email: 'tafadzwarunowanda@gmail.com' });
    
    if (specialAdmin) {
      // Update if exists but role is not admin
      if (specialAdmin.role !== 'admin') {
        specialAdmin.role = 'admin';
        specialAdmin.firstName = specialAdmin.firstName || 'Admin';
        specialAdmin.lastName = specialAdmin.lastName || 'User';
        specialAdmin.badgeNumber = specialAdmin.badgeNumber || 'ADMIN-001';
        specialAdmin.department = specialAdmin.department || 'Administration';
        await specialAdmin.save();
      }
      console.log('Special admin account already exists:', {
        identifier: specialAdmin.identifier,
        email: specialAdmin.email,
        role: specialAdmin.role
      });
    } else {
      // Create special admin
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
      console.log('Special admin account created successfully:', {
        identifier: specialAdmin.identifier,
        email: specialAdmin.email,
        role: specialAdmin.role
      });
    }
  } catch (error) {
    console.error('Error initializing special admin account:', error);
  }
})();
// --- END INITIALIZE SPECIAL ADMIN ACCOUNT ---

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Breathalyzer backend running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log('Special admin account: tafadzwarunowanda@gmail.com / Mathews##$090');
});
