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
const syncRoutes = require('./routes/sync');

const app = express();
connectDB();

// core middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

// rate limit with sane defaults
const windowMin = parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10);
const maxReq = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
app.use(rateLimit({
  windowMs: windowMin * 60 * 1000,
  max: maxReq,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
}));

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sync', syncRoutes);

// health
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Breathalyzer backend is running', timestamp: new Date().toISOString() });
});

// initialize special admin
(async () => {
  try {
    await new Promise((resolve, reject) => {
      if (mongoose.connection.readyState === 1) return resolve();
      mongoose.connection.once('open', resolve);
      mongoose.connection.once('error', reject);
    });

    console.log('DB connected, checking special admin...');
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');

    let admin = await User.findOne({ email: 'tafadzwarunowanda@gmail.com' });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash('Mathews##$090', salt);
      admin = new User({
        identifier: 'tafadzwarunowanda@gmail.com',
        email: 'tafadzwarunowanda@gmail.com',
        firstName: 'Admin',
        lastName: 'User',
        password: hashed,
        role: 'admin',
        badgeNumber: 'ADMIN-001',
        department: 'Administration',
      });
      await admin.save();
      console.log('Special admin created.');
    } else if (admin.role !== 'admin') {
      admin.role = 'admin';
      admin.firstName = admin.firstName || 'Admin';
      admin.lastName = admin.lastName || 'User';
      admin.badgeNumber = admin.badgeNumber || 'ADMIN-001';
      admin.department = admin.department || 'Administration';
      await admin.save();
      console.log('Special admin updated.');
    } else {
      console.log('Special admin OK.');
    }
  } catch (e) {
    console.error('Special admin init error:', e.message);
  }
})();

// 404
app.use('*', (req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!', error: process.env.NODE_ENV === 'development' ? err.message : {} });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Breathalyzer backend running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log('Special admin: tafadzwarunowanda@gmail.com / Mathews##$090');
});
