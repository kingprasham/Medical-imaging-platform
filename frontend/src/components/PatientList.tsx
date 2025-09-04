import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import './PatientDetail.css';

interface Patient {
  id: string; // Orthanc UUID
  patientId: string; // DICOM Patient ID
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  studyCount: number;
  lastStudyDate: string;
  orthancId: string;
}

const PatientList: React.FC = () => {
  const { token } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPatients = useCallback(async (page: number = 1, search: string = '') => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`http://localhost:5000/api/patients?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch patients');
      }

      const data = await response.json();
      setPatients(data.patients || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPatients(currentPage, searchTerm);
  }, [fetchPatients, currentPage, searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPatients(1, searchTerm);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchPatients(newPage, searchTerm);
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString.length !== 8) return 'N/A';
    return `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`;
  };

  const getGenderBadgeClass = (gender: string) => {
    switch (gender?.toUpperCase()) {
      case 'M': return 'badge-info';
      case 'F': return 'badge-warning';
      default: return 'badge-secondary';
    }
  };

  const getGenderDisplay = (gender: string) => {
    switch (gender?.toUpperCase()) {
      case 'M': return 'Male';
      case 'F': return 'Female';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="card text-center">
        <div className="spinner"></div>
        <p>Loading patients from PACS...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex justify-between align-center">
          <div>
            <h2 className="card-title">Patient Management</h2>
            <p className="card-subtitle">Manage patient records from the PACS server</p>
          </div>
          <div>
            <button 
              className="btn btn-primary"
              onClick={() => fetchPatients(currentPage, searchTerm)}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-2">
        <div className="flex">
          <input
            type="text"
            placeholder="Search by patient name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ flex: 1, marginRight: '10px' }}
          />
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
          {searchTerm && (
            <button 
              type="button" 
              className="btn btn-outline ml-1"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
                fetchPatients(1, '');
              }}
            >
              Clear
            </button>
          )}
        </div>
      </form>
        
      {error && <div className="form-error">Error: {error}</div>}
      
      {patients.length === 0 && !loading && (
        <div className="text-center">
          <p>No patients found. Upload some DICOM files to see patients here.</p>
        </div>
      )}
      
      {patients.length > 0 && (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Patient ID</th>
                <th>Date of Birth</th>
                <th>Gender</th>
                <th>Studies</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <strong>{patient.fullName}</strong>
                    <br />
                    <small className="text-muted">
                      {patient.firstName} {patient.lastName}
                    </small>
                  </td>
                  <td><strong>{patient.patientId}</strong></td>
                  <td>{formatDate(patient.dateOfBirth)}</td>
                  <td>
                    <span className={`badge ${getGenderBadgeClass(patient.gender)}`}>
                      {getGenderDisplay(patient.gender)}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-success">
                      {patient.studyCount} studies
                    </span>
                  </td>
                  <td>
                    <Link
                      to={`/patients/${patient.id}`} // Using Orthanc UUID
                      className="btn btn-primary btn-small"
                    >
                      View Studies
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center align-center mt-2">
              <button
                className="btn btn-outline btn-small"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="mx-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-outline btn-small"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PatientList;