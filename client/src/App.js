import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';

import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import LandingPage from './components/Landing/LandingPage';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Children from './pages/Children/Children';
import Parents from './pages/Parents/Parents';
import Staff from './pages/Staff/Staff';
import Attendance from './pages/Attendance/Attendance';
import Billing from './pages/Billing/Billing';
import Activities from './pages/Activities/Activities';
import Reports from './pages/Reports/Reports';
import Profile from './pages/Profile/Profile';
import LoadingSpinner from './components/Common/LoadingSpinner';
import { EcommerceDemo } from './components/Ecommerce';
import CustomerRegister from './pages/Customer/CustomerRegister';

function ForceLandingOnFirstLoad({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const hasForced = React.useRef(false);

  React.useEffect(() => {
    if (!user && !hasForced.current) {
      hasForced.current = true;
      // Only force to '/' if we're not already on it
      if (location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);

  return children;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <ForceLandingOnFirstLoad>
        <Routes>
          {/* Landing Page */}
          <Route 
            path="/" 
            element={!user ? <LandingPage /> : <Navigate to="/dashboard" replace />} 
          />
          
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={!user ? <Login /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/register" 
            element={!user ? <Register /> : <Navigate to="/dashboard" replace />} 
          />
          
          {/* Ecommerce Demo - Public Route */}
          <Route 
            path="/shop" 
            element={<EcommerceDemo />} 
          />

          {/* Customer Registration - Public Route */}
          <Route
            path="/customer-register"
            element={<CustomerRegister />}
          />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/children" 
            element={user ? <Layout><Children /></Layout> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/parents" 
            element={user ? <Layout><Parents /></Layout> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/staff" 
            element={user ? <Layout><Staff /></Layout> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/attendance" 
            element={user ? <Layout><Attendance /></Layout> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/billing" 
            element={user ? <Layout><Billing /></Layout> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/activities" 
            element={user ? <Layout><Activities /></Layout> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/reports" 
            element={user ? <Layout><Reports /></Layout> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/profile" 
            element={user ? <Layout><Profile /></Layout> : <Navigate to="/" replace />} 
          />
          
          {/* Fallback */}
          <Route 
            path="*" 
            element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />} 
          />
        </Routes>
      </ForceLandingOnFirstLoad>
    </Box>
  );
}

export default App;