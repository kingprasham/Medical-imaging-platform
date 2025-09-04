import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PatientList from './components/PatientList';
import StudyList from './components/StudyList';
import DicomViewer from './components/DicomViewer';
import Navigation from './components/Navigation';
import initCornerstone from './services/cornerstoneService';
import PatientDetail from './components/PatientDetail'; // <-- 1. IMPORT THE NEW COMPONENT

// Types
interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

// Create Auth Context
const AuthContext = React.createContext<AuthContextType | null>(null);

let cornerstoneInitialized = false;

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on app load
  useEffect(() => {
    if (!cornerstoneInitialized) {
      initCornerstone();
      cornerstoneInitialized = true;
    }

    const savedToken = localStorage.getItem('medicalToken');
    const savedUser = localStorage.getItem('medicalUser');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    
    setIsLoading(false);
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      
      localStorage.setItem('medicalToken', data.token);
      localStorage.setItem('medicalUser', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);
      
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('medicalToken');
    localStorage.removeItem('medicalUser');
    setToken(null);
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading Medical Imaging Platform...</p>
      </div>
    );
  }

  const authValue: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading: false
  };

  return (
    <AuthContext.Provider value={authValue}>
      <Router>
        <div className="App">
          {user ? (
            <div className="app-layout">
              <Navigation user={user} onLogout={logout} />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/patients" element={<PatientList />} />
                  {/* 👇 2. ADD THIS NEW ROUTE FOR THE DETAIL PAGE 👇 */}
                  <Route path="/patients/:patientId" element={<PatientDetail />} />
                  <Route path="/studies" element={<StudyList />} />
                  <Route path="/viewer/:studyInstanceUID" element={<DicomViewer />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </main>
            </div>
          ) : (
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          )}
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default App;