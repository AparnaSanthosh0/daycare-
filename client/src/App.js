import React from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';

import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import LandingPage from './components/Landing/LandingPage'; // Keep only this; NewLandingPage removed
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import JobsLanding from './pages/Jobs/JobsLanding';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
// import Children from './pages/Children/Children';
// import Parents from './pages/Parents/Parents';
import Staff from './pages/Staff/Staff';
import MealPlanning from './pages/Staff/MealPlanning';
import Visitors from './pages/Staff/Visitors';
import Emergency from './pages/Staff/Emergency';
import Transport from './pages/Staff/Transport';
import Communication from './pages/Staff/Communication';
import Attendance from './pages/Attendance/Attendance';
import Billing from './pages/Billing/Billing';
import Activities from './pages/Activities/Activities';
import Reports from './pages/Reports/Reports';
import Profile from './pages/Profile/Profile';
import ParentDashboard from './pages/Parents/ParentDashboard';
import CustomerDashboard from './pages/Customer/CustomerDashboard';
import CustomerLogin from './pages/Customer/CustomerLogin';
import LoadingSpinner from './components/Common/LoadingSpinner';
import { EcommerceDemo } from './components/Ecommerce';
import CustomerRegister from './pages/Customer/CustomerRegister';
import VendorRegister from './pages/Vendor/VendorRegister';
import VendorDashboard from './pages/Vendor/VendorDashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserManagement from './pages/Admin/UserManagement';
import CustomerManagement from './pages/Admin/CustomerManagement';
import Families from './pages/Families/Families';
const InventoryPage = React.lazy(() => import('./pages/Admin/Inventory'));
const AboutLazy = React.lazy(() => import('./pages/About/About'));
const ApproachLazy = React.lazy(() => import('./pages/About/Approach'));
const CurriculumLazy = React.lazy(() => import('./pages/Curriculum/Curriculum'));

function ForceLandingOnFirstLoad({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const hasForced = React.useRef(false);

  React.useEffect(() => {
    if (!hasForced.current) {
      hasForced.current = true;
      if (location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  return children;
}

// When navigating to /login or /admin-login, always show the login screen
// and clear any existing session so it never bounces back to the last page.
function AlwaysLogin({ admin = false }) {
  const { logout } = useAuth();
  const did = React.useRef(false);
  React.useEffect(() => {
    if (did.current) return; // avoid double-call in StrictMode
    did.current = true;
    logout();
    // Clear any cached role payload used for redirects
    try { localStorage.removeItem('token_payload'); } catch {}
  }, [logout]);
  return <Login />;
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
            element={<LandingPage />} 
          />
          
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={<AlwaysLogin />} 
          />
          <Route 
            path="/admin-login" 
            element={<AlwaysLogin admin />}
          />
          <Route 
            path="/register" 
            element={!user ? <Register /> : <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'customer' ? '/customer' : '/dashboard'} replace />} 
          />
          {/* Explicit parent and staff registration paths (no dropdowns) */}
          <Route
            path="/register/parent"
            element={!user ? <Register fixedRole="parent" /> : <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'customer' ? '/customer' : '/dashboard'} replace />} 
          />
          <Route
            path="/register/staff"
            element={!user ? <Register fixedRole="staff" /> : <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'customer' ? '/customer' : '/dashboard'} replace />} 
          />
          <Route
            path="/forgot-password"
            element={!user ? <ForgotPassword /> : <Navigate to="/dashboard" replace />} 
          />
          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />
          
          {/* Jobs Landing - Public Route */}
          <Route 
            path="/jobs" 
            element={<JobsLanding />} 
          />

          {/* About, Approach and Curriculum Pages (no dashboard layout) */}
          <Route path="/about" element={<React.Suspense fallback={null}><AboutLazy /></React.Suspense>} />
          <Route path="/approach" element={<React.Suspense fallback={null}><ApproachLazy /></React.Suspense>} />
          <Route path="/curriculum" element={<React.Suspense fallback={null}><CurriculumLazy /></React.Suspense>} />

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
          
          {/* Customer Login - Public Route */}
          <Route
            path="/customer-login"
            element={<CustomerLogin />}
          />

          {/* Vendor Registration - Public Route (many can register; admin approves one) */}
          <Route
            path="/vendor-register"
            element={<VendorRegister />}
          />

          {/* Vendor Dashboard - Protected by login; also shown for vendor role after login */}
          <Route
            path="/vendor"
            element={user ? <Layout><VendorDashboard /></Layout> : <Navigate to="/" replace />}
          />
          
          {/* Protected Routes */}
          <Route 
            path="/dashboard" 
            element={user ? <Layout>{user.role === 'parent' ? <ParentDashboard /> : <Dashboard />}</Layout> : <Navigate to="/" replace />} 
          />
          {/* Parent sidebar routes mapped to dashboard tabs */}
          <Route 
            path="/parent/notifications" 
            element={user?.role === 'parent' ? <Layout><ParentDashboard initialTab="notifications" /></Layout> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/parent/messaging" 
            element={user?.role === 'parent' ? <Layout><ParentDashboard initialTab="messaging" /></Layout> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/parent/billing" 
            element={user?.role === 'parent' ? <Layout><ParentDashboard initialTab="billing" /></Layout> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/parent/feedback" 
            element={user?.role === 'parent' ? <Layout><ParentDashboard initialTab="feedback" /></Layout> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/parent/staff" 
            element={user?.role === 'parent' ? <Layout><ParentDashboard initialTab="staff" /></Layout> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/parent/reports" 
            element={user?.role === 'parent' ? <Layout><ParentDashboard initialTab="reports" /></Layout> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/parent/admissions" 
            element={user?.role === 'parent' ? <Layout><ParentDashboard initialTab="admissions" /></Layout> : <Navigate to="/dashboard" replace />} 
          />
          {/* Customer Dashboard */}
          <Route
            path="/customer"
            element={user?.role === 'customer' ? <Layout><CustomerDashboard /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />}
          />
          {/* Redirect old modules to unified Families */}
          <Route 
            path="/children" 
            element={<Navigate to="/families" replace />} 
          />
          <Route 
            path="/parents" 
            element={<Navigate to="/families" replace />} 
          />
          <Route
            path="/families"
            element={user ? <Layout><Families /></Layout> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/staff" 
            element={user && (user.role === 'admin' || user.role === 'staff') ? <Layout><Staff /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
          />
          <Route 
            path="/meal-planning" 
            element={user && (user.role === 'admin' || user.role === 'staff') ? <Layout><MealPlanning /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
          />
          <Route 
            path="/visitors" 
            element={user && (user.role === 'admin' || user.role === 'staff') ? <Layout><Visitors /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
          />
          <Route 
            path="/emergency" 
            element={user && (user.role === 'admin' || user.role === 'staff') ? <Layout><Emergency /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
          />
          <Route 
            path="/transport" 
            element={user && (user.role === 'admin' || user.role === 'staff') ? <Layout><Transport /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
          />
          <Route 
            path="/communication" 
            element={user && (user.role === 'admin' || user.role === 'staff') ? <Layout><Communication /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
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
          
          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={user?.role === 'admin' ? <Layout><AdminDashboard /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
          />
          <Route 
            path="/admin/users" 
            element={user?.role === 'admin' ? <Layout><UserManagement /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
          />
          <Route 
            path="/admin/inventory" 
            element={user?.role === 'admin' ? <Layout><React.Suspense fallback={null}><InventoryPage /></React.Suspense></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
          />
          <Route 
            path="/admin/customers" 
            element={user?.role === 'admin' ? <Layout><CustomerManagement /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
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