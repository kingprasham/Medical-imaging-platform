const express = require("express");
const multer = require("multer");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const FormData = require("form-data");

const router = express.Router();

console.log("DICOM routes loaded with Orthanc integration");

// Orthanc configuration - Use nginx proxy with authentication
const ORTHANC_URL = "http://localhost:8080/pacs"; // Use nginx proxy
const ORTHANC_DIRECT_URL = "http://localhost:8042"; // Direct access for uploads

// Orthanc basic auth credentials (default: orthanc:orthanc)
const ORTHANC_AUTH = {
  username: 'orthanc',
  password: 'orthanc'
};

// Configure multer for DICOM file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/dicom");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = [".dcm", ".dicom", ""];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (
      allowedTypes.includes(fileExt) ||
      file.mimetype === "application/octet-stream"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only DICOM files are allowed"));
    }
  },
});

// Test Orthanc connection
router.get("/test", async (req, res) => {
  try {
    // Test both proxy and direct connections
    const proxyResponse = await axios.get(`${ORTHANC_URL}/system`);
    const directResponse = await axios.get(`${ORTHANC_DIRECT_URL}/system`, {
      auth: ORTHANC_AUTH
    });
    
    res.json({
      message: "DICOM routes working with Orthanc connection",
      orthancStatus: "Connected",
      orthancVersion: proxyResponse.data.Version,
      proxyUrl: ORTHANC_URL,
      directUrl: ORTHANC_DIRECT_URL,
      authConfigured: true
    });
  } catch (error) {
    res.json({
      message: "DICOM routes working but Orthanc connection failed",
      orthancStatus: "Disconnected",
      error: error.message,
      proxyUrl: ORTHANC_URL,
      directUrl: ORTHANC_DIRECT_URL
    });
  }
});

// Get studies from Orthanc
router.get("/studies", async (req, res) => {
  try {
    const response = await axios.get(`${ORTHANC_URL}/studies`);
    const studies = [];

    // Get detailed info for each study
    for (const studyId of response.data.slice(0, 20)) {
      // Limit to first 20
      try {
        const studyInfo = await axios.get(`${ORTHANC_URL}/studies/${studyId}`);
        const patientInfo = await axios.get(
          `${ORTHANC_URL}/patients/${studyInfo.data.ParentPatient}`
        );

        studies.push({
          id: studyId,
          studyInstanceUID:
            studyInfo.data.MainDicomTags.StudyInstanceUID || studyId,
          patientName: patientInfo.data.MainDicomTags.PatientName || "Unknown",
          patientId: patientInfo.data.MainDicomTags.PatientID || "Unknown",
          studyDate: studyInfo.data.MainDicomTags.StudyDate || "",
          studyTime: studyInfo.data.MainDicomTags.StudyTime || "",
          studyDescription:
            studyInfo.data.MainDicomTags.StudyDescription || "No Description",
          modality: studyInfo.data.MainDicomTags.Modality || "Unknown",
          seriesCount: studyInfo.data.Series ? studyInfo.data.Series.length : 0,
          instancesCount: studyInfo.data.CountInstances || 0,
        });
      } catch (studyError) {
        console.log(`Error fetching study ${studyId}:`, studyError.message);
      }
    }

    res.json({
      studies: studies,
      totalStudies: response.data.length,
      message: "Studies fetched from Orthanc PACS",
    });
  } catch (error) {
    console.error("Error fetching studies from Orthanc:", error.message);
    res.status(500).json({
      error: "Failed to fetch studies from Orthanc",
      message: error.message,
      orthancUrl: ORTHANC_URL,
    });
  }
});

// Upload DICOM files to both local storage and Orthanc
router.post(
  "/upload",
  (req, res, next) => {
    console.log("=== UPLOAD REQUEST DEBUG ===");
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    next();
  },
  upload.array("dicomFiles", 100),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No DICOM files uploaded" });
      }

      const uploadResults = [];

      for (const file of req.files) {
        const result = {
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          path: file.path,
          uploadTime: new Date().toISOString(),
          status: "uploaded_locally",
          orthancStatus: "pending",
        };

        // Try to send to Orthanc with proper authentication
        try {
          const fileBuffer = fs.readFileSync(file.path);
          
          console.log(`Uploading ${file.originalname} to Orthanc...`);
          
          // Use direct connection with authentication for uploads
          const orthancResponse = await axios.post(
            `${ORTHANC_DIRECT_URL}/instances`,
            fileBuffer,
            {
              headers: {
                "Content-Type": "application/dicom",
                "Content-Length": fileBuffer.length,
              },
              auth: ORTHANC_AUTH, // Add authentication
              timeout: 30000 // 30 second timeout
            }
          );

          result.orthancStatus = "uploaded";
          result.orthancId = orthancResponse.data.ID;
          result.status = "uploaded_to_pacs";

          console.log(
            `DICOM uploaded to Orthanc: ${file.originalname} -> ${orthancResponse.data.ID}`
          );
        } catch (orthancError) {
          console.error(
            `Failed to upload ${file.originalname} to Orthanc:`,
            orthancError.message
          );
          
          // More detailed error logging
          if (orthancError.response) {
            console.error('Response status:', orthancError.response.status);
            console.error('Response data:', orthancError.response.data);
          }
          
          result.orthancStatus = "failed";
          result.orthancError = orthancError.response ? 
            `${orthancError.response.status}: ${orthancError.response.statusText}` : 
            orthancError.message;
        }

        uploadResults.push(result);
      }

      const successCount = uploadResults.filter(
        (r) => r.orthancStatus === "uploaded"
      ).length;

      res.json({
        message: `DICOM files processed: ${successCount}/${uploadResults.length} uploaded to PACS`,
        files: uploadResults,
        totalFiles: uploadResults.length,
        pacsUploaded: successCount,
        orthancUrl: `${ORTHANC_DIRECT_URL}/app/explorer.html`,
      });
    } catch (error) {
      console.error("Error processing DICOM uploads:", error);
      res.status(500).json({ error: "Failed to process DICOM uploads" });
    }
  }
);

// Get specific study from Orthanc
router.get("/studies/:studyId", async (req, res) => {
  try {
    const studyId = req.params.studyId;
    const studyResponse = await axios.get(`${ORTHANC_URL}/studies/${studyId}`);
    const patientResponse = await axios.get(
      `${ORTHANC_URL}/patients/${studyResponse.data.ParentPatient}`
    );

    // Get series information
    const seriesPromises = studyResponse.data.Series.map((seriesId) =>
      axios.get(`${ORTHANC_URL}/series/${seriesId}`)
    );
    const seriesResponses = await Promise.all(seriesPromises);

    const study = {
      id: studyId,
      studyInstanceUID: studyResponse.data.MainDicomTags.StudyInstanceUID,
      patient: {
        name: patientResponse.data.MainDicomTags.PatientName,
        id: patientResponse.data.MainDicomTags.PatientID,
        birthDate: patientResponse.data.MainDicomTags.PatientBirthDate,
        sex: patientResponse.data.MainDicomTags.PatientSex,
      },
      study: {
        date: studyResponse.data.MainDicomTags.StudyDate,
        time: studyResponse.data.MainDicomTags.StudyTime,
        description: studyResponse.data.MainDicomTags.StudyDescription,
        accessionNumber: studyResponse.data.MainDicomTags.AccessionNumber,
      },
      series: seriesResponses.map((response) => ({
        id: response.data.ID,
        modality: response.data.MainDicomTags.Modality,
        description: response.data.MainDicomTags.SeriesDescription,
        instanceCount: response.data.CountInstances,
        seriesNumber: response.data.MainDicomTags.SeriesNumber,
      })),
      viewerUrls: {
        orthanc: `${ORTHANC_DIRECT_URL}/app/explorer.html#study?uuid=${studyId}`,
        stone: `${ORTHANC_DIRECT_URL}/stone-webviewer/index.html?study=${studyId}`,
        osimis: `${ORTHANC_DIRECT_URL}/osimis-viewer/app/index.html?study=${studyId}`,
      },
    };

    res.json(study);
  } catch (error) {
    console.error("Error fetching study from Orthanc:", error.message);
    res.status(500).json({
      error: "Failed to fetch study from Orthanc",
      studyId: req.params.studyId,
    });
  }
});

// Delete study from Orthanc
router.delete("/studies/:studyId", async (req, res) => {
  try {
    const studyId = req.params.studyId;
    await axios.delete(`${ORTHANC_DIRECT_URL}/studies/${studyId}`, {
      auth: ORTHANC_AUTH
    });

    res.json({
      message: "Study deleted from PACS successfully",
      studyId: studyId,
    });
  } catch (error) {
    console.error("Error deleting study from Orthanc:", error.message);
    res.status(500).json({
      error: "Failed to delete study from PACS",
      studyId: req.params.studyId,
    });
  }
});

module.exports = router;