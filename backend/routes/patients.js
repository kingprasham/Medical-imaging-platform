const express = require('express');
const axios = require('axios');

const router = express.Router();

console.log('👥 Patients routes loaded with Orthanc integration (Simple Version)');

// Orthanc configuration - Use nginx proxy instead of direct access
const ORTHANC_URL = 'http://localhost:8080/pacs';

// Test route
router.get('/test', async (req, res) => {
  try {
    const response = await axios.get(`${ORTHANC_URL}/patients`);
    res.json({ 
      message: 'Patients routes working with Orthanc connection',
      orthancStatus: 'Connected',
      totalPatients: response.data.length,
      orthancUrl: ORTHANC_URL,
      patients: response.data.slice(0, 5) // First 5 patient IDs
    });
  } catch (error) {
    res.json({
      message: 'Patients routes working but Orthanc connection failed',
      orthancStatus: 'Disconnected',
      error: error.message,
      orthancUrl: ORTHANC_URL
    });
  }
});

// Get all patients from Orthanc (simplified version)
router.get('/', async (req, res) => {
  try {
    console.log('Fetching patients from Orthanc...');
    
    // Fetch all patients from Orthanc
    const response = await axios.get(`${ORTHANC_URL}/patients`);
    const patientIds = response.data;
    
    console.log(`Found ${patientIds.length} patients in Orthanc`);

    const patients = [];
    
    // Get detailed info for each patient (limit to first 10 for now)
    for (let i = 0; i < Math.min(patientIds.length, 10); i++) {
      const patientId = patientIds[i];
      try {
        console.log(`Fetching details for patient ${i + 1}/${Math.min(patientIds.length, 10)}: ${patientId}`);
        
        const patientInfo = await axios.get(`${ORTHANC_URL}/patients/${patientId}`);
        const mainTags = patientInfo.data.MainDicomTags || {};
        
        // Get study count for this patient
        const studyCount = patientInfo.data.Studies ? patientInfo.data.Studies.length : 0;
        
        // Extract name parts safely
        const patientName = mainTags.PatientName || 'Unknown Patient';
        const nameParts = patientName.split('^');
        const lastName = nameParts[0] || 'Unknown';
        const firstName = nameParts[1] || nameParts[0] || 'Unknown';
        
        patients.push({
          id: patientId,
          patientId: mainTags.PatientID || 'Unknown',
          firstName: firstName,
          lastName: lastName,
          fullName: patientName,
          dateOfBirth: mainTags.PatientBirthDate || '',
          gender: mainTags.PatientSex || 'U',
          studyCount: studyCount,
          lastStudyDate: patientInfo.data.LastUpdate || '',
          orthancId: patientId
        });
        
        console.log(`Added patient: ${patientName}`);
        
      } catch (patientError) {
        console.log(`Error fetching patient ${patientId}:`, patientError.message);
      }
    }

    console.log(`Successfully processed ${patients.length} patients`);

    res.json({
      patients: patients,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalPatients: patients.length,
        limit: 10
      },
      source: 'orthanc',
      totalInPacs: patientIds.length
    });

  } catch (error) {
    console.error('Error fetching patients from Orthanc:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch patients from Orthanc PACS',
      message: error.message,
      orthancUrl: ORTHANC_URL,
      details: error.response ? error.response.data : 'No additional details'
    });
  }
});

// Get single patient (keep this simple too)
router.get('/:id', async (req, res) => {
  try {
    const patientId = req.params.id;
    console.log(`Fetching patient details for: ${patientId}`);
    
    const patientResponse = await axios.get(`${ORTHANC_URL}/patients/${patientId}`);
    const patientData = patientResponse.data;
    const mainTags = patientData.MainDicomTags || {};
    
    const patientName = mainTags.PatientName || 'Unknown Patient';
    const nameParts = patientName.split('^');
    
    const patient = {
      id: patientId,
      patientId: mainTags.PatientID || 'Unknown',
      firstName: nameParts[1] || nameParts[0] || 'Unknown',
      lastName: nameParts[0] || 'Unknown',
      fullName: patientName,
      dateOfBirth: mainTags.PatientBirthDate || '',
      gender: mainTags.PatientSex || 'U',
      studyCount: patientData.Studies ? patientData.Studies.length : 0,
      orthancId: patientId,
      lastUpdate: patientData.LastUpdate
    };
    
    res.json(patient);
    
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: 'Patient not found in PACS' });
    }
    
    console.error('Error fetching patient from Orthanc:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch patient from Orthanc PACS',
      patientId: req.params.id,
      message: error.message
    });
  }
});

module.exports = router;