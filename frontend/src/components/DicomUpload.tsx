import React, { useState } from 'react';
import { useAuth } from '../App';
import './DicomUpload.css';

interface UploadResult {
  filename: string;
  size: number;
  instanceId?: string;
  status: 'success' | 'error';
  error?: string;
}

interface DicomUploadProps {
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadSuccess?: () => void;
}

const DicomUpload: React.FC<DicomUploadProps> = ({ onUploadComplete, onUploadSuccess }) => {
  const { token } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
    }
  };

const uploadFiles = async () => {
  if (selectedFiles.length === 0) return;

  setUploading(true);
  setResults([]);
  const uploadResults: UploadResult[] = [];

  console.log(`Starting upload of ${selectedFiles.length} files`);

  // Create FormData and append ALL files at once with correct field name
  const formData = new FormData();
  selectedFiles.forEach((file, index) => {
    console.log(`Appending file ${index + 1}: ${file.name}`);
    formData.append('dicomFiles', file); // MUST match backend expectation
  });

  try {
    console.log('Sending request to backend...');
    const response = await fetch('http://localhost:5000/api/dicom/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // DO NOT set Content-Type - let browser set it with multipart boundary
      },
      body: formData
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Upload result:', result);
      
      // Process results from backend response
      if (result.files && Array.isArray(result.files)) {
        result.files.forEach((fileResult: any) => {
          uploadResults.push({
            filename: fileResult.originalName || fileResult.filename,
            size: fileResult.size,
            instanceId: fileResult.orthancId,
            status: fileResult.orthancStatus === 'uploaded' ? 'success' : 'error',
            error: fileResult.orthancError || fileResult.error
          });
        });
      } else {
        // Fallback if result structure is different
        selectedFiles.forEach(file => {
          uploadResults.push({
            filename: file.name,
            size: file.size,
            status: 'success'
          });
        });
      }
    } else {
      const errorText = await response.text();
      console.error('Upload failed:', errorText);
      
      // Mark all files as failed
      selectedFiles.forEach(file => {
        uploadResults.push({
          filename: file.name,
          size: file.size,
          status: 'error',
          error: errorText || 'Upload failed'
        });
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    
    // Mark all files as failed
    selectedFiles.forEach(file => {
      uploadResults.push({
        filename: file.name,
        size: file.size,
        status: 'error',
        error: error instanceof Error ? error.message : 'Network error'
      });
    });
  }

  setResults(uploadResults);
  setUploading(false);
  setSelectedFiles([]);
  
  // Call callbacks
  if (onUploadComplete) {
    onUploadComplete(uploadResults);
  }
  
  if (onUploadSuccess && uploadResults.every(r => r.status === 'success')) {
    onUploadSuccess();
  }
};

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="dicom-upload">
      <div
        className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('dicom-file-input')?.click()}
      >
        <div className="upload-content">
          <div className="upload-icon">📁</div>
          <h3>Upload DICOM Files</h3>
          <p>Drag and drop DICOM files here, or click to select</p>
          <p className="upload-hint">Supported formats: .dcm, .dicom, or files without extension</p>
          
          <input
            id="dicom-file-input"
            type="file"
            multiple
            accept=".dcm,.dicom"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <h4>Selected Files ({selectedFiles.length})</h4>
          <div className="file-list">
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-item">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
              </div>
            ))}
          </div>
          
          <div className="upload-actions">
            <button 
              className="upload-btn"
              onClick={uploadFiles}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
            <button 
              className="clear-btn"
              onClick={() => setSelectedFiles([])}
              disabled={uploading}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
          <p>Uploading files to PACS server...</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="upload-results">
          <h4>Upload Results</h4>
          {results.map((result, index) => (
            <div key={index} className={`result-item ${result.status}`}>
              <span className="result-filename">{result.filename}</span>
              <span className={`result-status ${result.status}`}>
                {result.status === 'success' ? '✅ Success' : '❌ Failed'}
              </span>
              {result.error && <p className="result-error">{result.error}</p>}
              {result.instanceId && <p className="result-id">Instance ID: {result.instanceId}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DicomUpload;