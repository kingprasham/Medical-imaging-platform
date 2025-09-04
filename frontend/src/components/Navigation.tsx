import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

interface NavigationProps {
  user: User;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ user, onLogout }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'nav-item active' : 'nav-item';
  };

  return (
    <nav className="navigation">
      <div className="nav-header">
        <h1>🏥 Medical Imaging</h1>
        <div className="user-info">
          <div><strong>{user.firstName} {user.lastName}</strong></div>
          <div>{user.role} • {user.username}</div>
        </div>
      </div>
      
      <div className="nav-menu">
        <Link to="/dashboard" className={isActive('/dashboard')}>
          📊 Dashboard
        </Link>
        
        <Link to="/patients" className={isActive('/patients')}>
          👥 Patients
        </Link>
        
        <Link to="/studies" className={isActive('/studies')}>
          📋 Studies
        </Link>
        
        <div style={{ marginTop: 'auto' }}>
          <button className="nav-item logout" onClick={onLogout}>
            🔓 Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;