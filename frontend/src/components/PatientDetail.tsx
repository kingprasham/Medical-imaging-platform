import React, { useState, useEffect, useCallback } from 'react'; // <-- THIS LINE IS FIXED
import { useParams, Link } from 'react-router-dom';

// Interfaces for data from Orthanc
interface PatientDetails {
  ID: string;
  MainDicomTags: {
    PatientID: string;
    PatientName: string;
    PatientBirthDate: string;
    PatientSex: string;
  };
  Studies: string[]; // List of Study IDs
}

interface Study {
  id: string;
  studyInstanceUID: string;
  studyDescription: string;
  studyDate: string;
}

const PatientDetail: React.FC = () => {
  // Get the patient's Orthanc ID from the URL
  const { patientId } = useParams<{ patientId: string }>();
  
  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatientData = useCallback(async () => {
    if (!patientId) return;

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch the main patient details
      const patientResponse = await fetch(`http://localhost:8080/pacs/patients/${patientId}`);
      if (!patientResponse.ok) throw new Error("Patient not found.");
      const patientData: PatientDetails = await patientResponse.json();
      setPatient(patientData);

      // 2. Fetch details for each of the patient's studies
      if (patientData.Studies && patientData.Studies.length > 0) {
        const studyPromises = patientData.Studies.map(studyId =>
          fetch(`http://localhost:8080/pacs/studies/${studyId}`).then(res => res.json())
        );
        const studiesDetails = await Promise.all(studyPromises);
        
        const formattedStudies = studiesDetails.map(detail => ({
            id: detail.ID,
            studyInstanceUID: detail.MainDicomTags.StudyInstanceUID,
            studyDescription: detail.MainDicomTags.StudyDescription || 'No Description',
            studyDate: detail.MainDicomTags.StudyDate || 'N/A'
        }));
        setStudies(formattedStudies);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient data.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  const formatDate = (dateString: string) => {
    if (!dateString || dateString.length !== 8) return 'N/A';
    return `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`;
  };
  
  if (loading) return <div className="card text-center"><div className="spinner"></div><p>Loading patient details...</p></div>;
  if (error) return <div className="card form-error">Error: {error}</div>;
  if (!patient) return <div className="card">Patient not found.</div>;

  return (
    <div className="card">
      <div className="card-header flex justify-between align-center">
        <h2 className="card-title">Patient Details</h2>
        <Link to="/patients" className="btn btn-secondary">&larr; Back to Patient List</Link>
      </div>
      
      <div className="patient-info-grid mt-2">
        <div><strong>Patient Name:</strong> {patient.MainDicomTags.PatientName}</div>
        <div><strong>Patient ID:</strong> {patient.MainDicomTags.PatientID}</div>
        <div><strong>Date of Birth:</strong> {formatDate(patient.MainDicomTags.PatientBirthDate)}</div>
        <div><strong>Gender:</strong> {patient.MainDicomTags.PatientSex}</div>
      </div>
      
      <h3 className="mt-3">Studies for this Patient ({studies.length})</h3>
      
      <table className="table mt-2">
        <thead>
          <tr>
            <th>Study Date</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {studies.length > 0 ? (
            studies.map(study => (
              <tr key={study.id}>
                <td>{formatDate(study.studyDate)}</td>
                <td>{study.studyDescription}</td>
                <td className="flex">
                  <Link to={`/viewer/${study.studyInstanceUID}`} className="btn btn-primary btn-small">View</Link>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="text-center">No studies found for this patient.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PatientDetail;