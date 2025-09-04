import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import DicomUpload from './DicomUpload';

interface Study {
  id: string;
  studyInstanceUID: string;
  patientName: string;
  patientID: string;
  studyDescription: string;
  studyDate: string;
  modality: string;
  numberOfSeries: number;
}

interface OrthancStudy {
  ID: string;
  PatientMainDicomTags: {
    PatientID: string;
    PatientName: string;
  };
  MainDicomTags: {
    StudyInstanceUID: string;
    StudyDescription: string;
    StudyDate: string;
  };
  Series: string[];
}

const StudyList: React.FC = () => {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModality, setSelectedModality] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const loadStudies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const orthancResponse = await fetch('http://localhost:8080/pacs/studies');

      if (orthancResponse.ok) {
        const orthancStudyIds: string[] = await orthancResponse.json();
        const studyDetailsPromises = orthancStudyIds.slice(0, 50).map(async (studyId) => {
          try {
            const detailResponse = await fetch(`http://localhost:8080/pacs/studies/${studyId}`);
            if (!detailResponse.ok) return null;
            const studyDetail: OrthancStudy = await detailResponse.json();

            let modality = 'UNKNOWN';
            if (studyDetail.Series && studyDetail.Series.length > 0) {
              const seriesResponse = await fetch(`http://localhost:8080/pacs/series/${studyDetail.Series[0]}`);
              if (seriesResponse.ok) {
                const seriesDetail = await seriesResponse.json();
                modality = seriesDetail.MainDicomTags?.Modality || 'UNKNOWN';
              }
            }

            return {
              id: studyDetail.ID,
              studyInstanceUID: studyDetail.MainDicomTags.StudyInstanceUID,
              patientName: studyDetail.PatientMainDicomTags.PatientName || 'Unknown',
              patientID: studyDetail.PatientMainDicomTags.PatientID || 'Unknown',
              studyDescription: studyDetail.MainDicomTags.StudyDescription || 'No Description',
              studyDate: studyDetail.MainDicomTags.StudyDate || 'Unknown',
              modality: modality,
              numberOfSeries: studyDetail.Series ? studyDetail.Series.length : 0,
            };
          } catch (e) {
            return null;
          }
        });
        
        const resolvedStudies = (await Promise.all(studyDetailsPromises)).filter((s): s is Study => s !== null);
        setStudies(resolvedStudies);

      } else {
        throw new Error('Failed to fetch studies from PACS');
      }
    } catch (error) {
      console.error('Error loading studies:', error);
      setError(error instanceof Error ? error.message : 'Failed to load studies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudies();
  }, [loadStudies]);

  const handleUploadSuccess = () => {
    setShowUpload(false);
    setTimeout(() => {
      loadStudies();
    }, 1000);
  };

  const availableModalities = Array.from(new Set(studies.map(s => s.modality))).filter(Boolean);

  const filteredStudies = studies.filter(study => {
    const searchLower = searchTerm.toLowerCase();
    const matchesModality = !selectedModality || study.modality === selectedModality;
    const matchesSearch = !searchTerm || 
      study.patientName.toLowerCase().includes(searchLower) ||
      study.patientID.toLowerCase().includes(searchLower) ||
      study.studyDescription.toLowerCase().includes(searchLower);
    
    return matchesModality && matchesSearch;
  });

  const formatDate = (dateString: string) => {
    if (!dateString || dateString.length !== 8) return 'N/A';
    return `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`;
  };

  if (loading) {
    return (
      <div className="card text-center">
        <div className="spinner"></div>
        <p>Loading studies from PACS...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header flex justify-between align-center">
        <div>
          <h2 className="card-title">Study Management</h2>
          <p className="card-subtitle">Browse and manage studies from the PACS server</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? 'Cancel Upload' : 'Upload DICOM'}
          </button>
        </div>
      </div>

      {showUpload && <DicomUpload onUploadSuccess={handleUploadSuccess} />}

      <div className="flex justify-between align-center mb-2 mt-2">
        <input
          type="text"
          placeholder="Search by patient name, ID, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ width: '400px' }}
        />
        <select value={selectedModality} onChange={(e) => setSelectedModality(e.target.value)} className="form-input">
          <option value="">All Modalities</option>
          {availableModalities.map(modality => (
            <option key={modality} value={modality}>{modality}</option>
          ))}
        </select>
      </div>

      {error && <div className="error-message">Error: {error}</div>}

      <p className="mb-2">Displaying {filteredStudies.length} of {studies.length} total studies.</p>

      <table className="table">
        <thead>
          <tr>
            <th>Patient Name</th>
            <th>Patient ID</th>
            <th>Study Description</th>
            <th>Modality</th>
            <th>Study Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudies.length > 0 ? filteredStudies.map(study => (
            <tr key={study.id}>
              <td><strong>{study.patientName}</strong></td>
              <td>{study.patientID}</td>
              <td>{study.studyDescription}</td>
              <td><span className={`badge badge-info`}>{study.modality}</span></td>
              <td>{formatDate(study.studyDate)}</td>
              <td>
                <div className="flex">
                  <a
                    href={`http://localhost:8080/pacs/weasis-pacs-connector/viewer?studyUID=${study.studyInstanceUID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Weasis
                  </a>
                  <a
                    href={`http://localhost:8080/pacs/app/explorer.html#study?uuid=${study.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Orthanc
                  </a>
                  {/* THIS IS THE FIX: Use study.studyInstanceUID in the link */}
                  <Link
                    to={`/viewer/${study.studyInstanceUID}`}
                    className="btn btn-success"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    View
                  </Link>
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={6} className="text-center">No studies match your criteria.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StudyList;

