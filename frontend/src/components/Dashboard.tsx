import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Welcome back, {user?.firstName}!</h2>
          <p className="card-subtitle">Medical Imaging Platform Dashboard</p>
        </div>
        
        <div className="grid grid-3">
          <div className="card">
            <h3>📊 System Status</h3>
            <div className="status-item">
              <span className="badge badge-success">PACS Online</span>
            </div>
            <div className="status-item">
              <span className="badge badge-success">AI Services Ready</span>
            </div>
            <div className="status-item">
              <span className="badge badge-info">Database Connected</span>
            </div>
          </div>
          
          <div className="card">
            <h3>👥 Quick Stats</h3>
            <div className="stat-item">
              <strong>Patients:</strong> 2
            </div>
            <div className="stat-item">
              <strong>Studies:</strong> 3
            </div>
            <div className="stat-item">
              <strong>Images:</strong> 156
            </div>
          </div>
          
          <div className="card">
            <h3>🔧 Quick Actions</h3>
            <Link to="/patients" className="btn btn-primary">
              View Patients
            </Link>
            <Link to="/studies" className="btn btn-secondary">
              Browse Studies
            </Link>
            <button className="btn btn-success">
              Upload DICOM
            </button>
          </div>
        </div>
        
        <div className="card mt-2">
          <h3>🏥 Recent Activity</h3>
          <div className="activity-item">
            <span className="activity-time">10:30 AM</span>
            <span className="activity-text">New CT study uploaded for John Doe</span>
          </div>
          <div className="activity-item">
            <span className="activity-time">09:15 AM</span>
            <span className="activity-text">MRI analysis completed for Sarah Johnson</span>
          </div>
          <div className="activity-item">
            <span className="activity-time">08:45 AM</span>
            <span className="activity-text">System backup completed successfully</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;