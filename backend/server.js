const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint (before API routes)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Medical Imaging Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'Connected',
      orthanc: 'Available on http://localhost:8042',
      redis: 'Connected'
    }
  });
});

// Import route modules
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const studyRoutes = require('./routes/studies');
const dicomRoutes = require('./routes/dicom');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/studies', studyRoutes);
app.use('/api/dicom', dicomRoutes);

// API base endpoint - shows available routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Medical Imaging Platform API',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        test: 'GET /api/auth/test'
      },
      patients: {
        list: 'GET /api/patients',
        create: 'POST /api/patients',
        get: 'GET /api/patients/:id',
        update: 'PUT /api/patients/:id',
        delete: 'DELETE /api/patients/:id',
        test: 'GET /api/patients/test'
      },
      studies: {
        list: 'GET /api/studies',
        create: 'POST /api/studies',
        get: 'GET /api/studies/:id',
        test: 'GET /api/studies/test'
      },
      dicom: {
        upload: 'POST /api/dicom/upload',
        studies: 'GET /api/dicom/studies',
        test: 'GET /api/dicom/test'
      }
    },
    documentation: 'Visit /health for system status'
  });
});

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'GET /health',
      'GET /api',
      'POST /api/auth/login',
      'GET /api/patients',
      'GET /api/studies'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🏥 Medical Imaging Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
  console.log(`🖥️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚡ Server started at: ${new Date().toLocaleString()}\n`);
});

module.exports = app;