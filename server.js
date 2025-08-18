// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron'); // <-- Import cron
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

// --- AUTO-CLEAR SYNCED RECORDS EVERY 24 HOURS ---
// Schedule a task to run daily at midnight (0 0 * * *)
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Scheduled task: Clearing synced records older than 24 hours...');
    const TestRecord = require('./models/TestRecord'); // Import model inside the task
    
    // Calculate the cutoff date (24 hours ago)
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Delete synced records older than the cutoff date
    const result = await TestRecord.deleteMany({
      synced: true,
      timestamp: { $lt: cutoffDate }
    });
    
    console.log(`Auto-clear task completed. Deleted ${result.deletedCount} synced records.`);
  } catch (error) {
    console.error('Scheduled auto-clear task error:', error);
  }
});
// --- END AUTO-CLEAR SYNCED RECORDS ---

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
  // Log that the auto-clear task is scheduled
  console.log('Scheduled task: Auto-clear synced records every 24 hours at midnight.');
});
