const express = require('express');
const { body, validationResult, query } = require('express-validator');

const router = express.Router();

console.log('📊 Studies routes loaded');

// Sample studies data
const studies = [
  {
    id: 1,
    studyId: 'STU001',
    studyInstanceUID: '1.2.840.113619.2.5.1762583153.215519.978957063.78',
    patientId: 1,
    patientName: 'John Doe',
    modality: 'CT',
    description: 'Chest CT with Contrast',
    studyDate: '2024-01-15',
    studyTime: '14:30:00',
    accessionNumber: 'ACC001',
    referringPhysician: 'Dr. Smith',
    institutionName: 'Central Medical Center',
    seriesCount: 3,
    instanceCount: 150,
    status: 'completed',
    createdAt: '2024-01-15T14:30:00Z'
  },
  {
    id: 2,
    studyId: 'STU002',
    studyInstanceUID: '1.2.840.113619.2.5.1762583153.215519.978957063.79',
    patientId: 2,
    patientName: 'Jane Smith',
    modality: 'MRI',
    description: 'Brain MRI without Contrast',
    studyDate: '2024-01-16',
    studyTime: '09:15:00',
    accessionNumber: 'ACC002',
    referringPhysician: 'Dr. Johnson',
    institutionName: 'Central Medical Center',
    seriesCount: 5,
    instanceCount: 200,
    status: 'completed',
    createdAt: '2024-01-16T09:15:00Z'
  },
  {
    id: 3,
    studyId: 'STU003',
    studyInstanceUID: '1.2.840.113619.2.5.1762583153.215519.978957063.80',
    patientId: 3,
    patientName: 'Robert Johnson',
    modality: 'X-RAY',
    description: 'Chest X-Ray PA and Lateral',
    studyDate: '2024-01-17',
    studyTime: '11:45:00',
    accessionNumber: 'ACC003',
    referringPhysician: 'Dr. Williams',
    institutionName: 'Central Medical Center',
    seriesCount: 2,
    instanceCount: 2,
    status: 'completed',
    createdAt: '2024-01-17T11:45:00Z'
  },
  {
    id: 4,
    studyId: 'STU004',
    studyInstanceUID: '1.2.840.113619.2.5.1762583153.215519.978957063.81',
    patientId: 1,
    patientName: 'John Doe',
    modality: 'US',
    description: 'Abdominal Ultrasound',
    studyDate: '2024-01-18',
    studyTime: '16:20:00',
    accessionNumber: 'ACC004',
    referringPhysician: 'Dr. Brown',
    institutionName: 'Central Medical Center',
    seriesCount: 4,
    instanceCount: 85,
    status: 'in_progress',
    createdAt: '2024-01-18T16:20:00Z'
  }
];

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Studies routes are working!',
    totalStudies: studies.length,
    modalities: [...new Set(studies.map(s => s.modality))]
  });
});

// Get all studies (with filters and pagination)
router.get('/', [
  query('patientId').optional().isInt(),
  query('modality').optional().isString(),
  query('status').optional().isIn(['completed', 'in_progress', 'cancelled']),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('search').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let filteredStudies = [...studies];
    const {
      patientId,
      modality,
      status,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 10
    } = req.query;

    // Apply filters
    if (patientId) {
      filteredStudies = filteredStudies.filter(study => 
        study.patientId === parseInt(patientId)
      );
    }

    if (modality) {
      filteredStudies = filteredStudies.filter(study => 
        study.modality.toLowerCase() === modality.toLowerCase()
      );
    }

    if (status) {
      filteredStudies = filteredStudies.filter(study => 
        study.status === status
      );
    }

    if (dateFrom) {
      filteredStudies = filteredStudies.filter(study => 
        study.studyDate >= dateFrom
      );
    }

    if (dateTo) {
      filteredStudies = filteredStudies.filter(study => 
        study.studyDate <= dateTo
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredStudies = filteredStudies.filter(study => 
        study.studyId.toLowerCase().includes(searchLower) ||
        study.description.toLowerCase().includes(searchLower) ||
        study.patientName.toLowerCase().includes(searchLower) ||
        study.accessionNumber.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedStudies = filteredStudies.slice(startIndex, endIndex);

    res.json({
      studies: paginatedStudies,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(filteredStudies.length / limitNum),
        totalStudies: filteredStudies.length,
        limit: limitNum
      },
      filters: {
        modalities: [...new Set(studies.map(s => s.modality))],
        statuses: [...new Set(studies.map(s => s.status))]
      }
    });
  } catch (error) {
    console.error('Error fetching studies:', error);
    res.status(500).json({ error: 'Failed to fetch studies' });
  }
});

// Get single study
router.get('/:id', (req, res) => {
  try {
    const studyId = parseInt(req.params.id);
    const study = studies.find(s => s.id === studyId);
    
    if (!study) {
      return res.status(404).json({ error: 'Study not found' });
    }
    
    res.json(study);
  } catch (error) {
    console.error('Error fetching study:', error);
    res.status(500).json({ error: 'Failed to fetch study' });
  }
});

// Create new study
router.post('/', [
  body('studyId').notEmpty().withMessage('Study ID is required'),
  body('patientId').isInt().withMessage('Valid patient ID is required'),
  body('modality').notEmpty().withMessage('Modality is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('studyDate').isISO8601().withMessage('Valid study date is required'),
  body('referringPhysician').optional().isString(),
  body('accessionNumber').optional().isString()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if study ID already exists
    const existingStudy = studies.find(s => s.studyId === req.body.studyId);
    if (existingStudy) {
      return res.status(409).json({ error: 'Study ID already exists' });
    }

    const newStudy = {
      id: studies.length + 1,
      studyInstanceUID: `1.2.840.113619.2.5.1762583153.215519.${Date.now()}`,
      seriesCount: 0,
      instanceCount: 0,
      status: 'in_progress',
      institutionName: 'Central Medical Center',
      ...req.body,
      createdAt: new Date().toISOString()
    };

    studies.push(newStudy);
    
    res.status(201).json({
      message: 'Study created successfully',
      study: newStudy
    });
  } catch (error) {
    console.error('Error creating study:', error);
    res.status(500).json({ error: 'Failed to create study' });
  }
});

// Update study status
router.patch('/:id/status', [
  body('status').isIn(['completed', 'in_progress', 'cancelled']).withMessage('Valid status is required')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const studyId = parseInt(req.params.id);
    const studyIndex = studies.findIndex(s => s.id === studyId);
    
    if (studyIndex === -1) {
      return res.status(404).json({ error: 'Study not found' });
    }

    studies[studyIndex].status = req.body.status;
    studies[studyIndex].updatedAt = new Date().toISOString();
    
    res.json({
      message: 'Study status updated successfully',
      study: studies[studyIndex]
    });
  } catch (error) {
    console.error('Error updating study status:', error);
    res.status(500).json({ error: 'Failed to update study status' });
  }
});

// Delete study
router.delete('/:id', (req, res) => {
  try {
    const studyId = parseInt(req.params.id);
    const studyIndex = studies.findIndex(s => s.id === studyId);
    
    if (studyIndex === -1) {
      return res.status(404).json({ error: 'Study not found' });
    }

    const deletedStudy = studies.splice(studyIndex, 1)[0];
    
    res.json({
      message: 'Study deleted successfully',
      study: deletedStudy
    });
  } catch (error) {
    console.error('Error deleting study:', error);
    res.status(500).json({ error: 'Failed to delete study' });
  }
});

module.exports = router;