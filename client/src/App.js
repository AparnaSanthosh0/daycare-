import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import MealPlanApproval from './pages/MealPlan/MealPlanApproval';
import Visitors from './pages/Staff/Visitors';
import Emergency from './pages/Staff/Emergency';
import Transport from './pages/Staff/Transport';
import Communication from './pages/Staff/Communication';
import Billing from './pages/Billing/Billing';
import Reports from './pages/Reports/Reports';
import Profile from './pages/Profile/Profile';
// Customer components restored - original OTP-based system
import CustomerRegister from './pages/Customer/CustomerRegister';
import CustomerLogin from './pages/Customer/CustomerLogin';
import PaymentDemo from './pages/Customer/PaymentDemo';
import PaymentSuccess from './pages/Customer/PaymentSuccess';
import ParentDashboard from './pages/Parents/ParentDashboard';
import CustomerOrders from './pages/Customer/CustomerOrders';
import VendorCustomerManagement from './pages/Vendor/VendorCustomerManagement';
import Attendance from './pages/Attendance/Attendance';
import Activities from './pages/Activities/Activities';
import LoadingSpinner from './components/Common/LoadingSpinner';
import { EcommerceDemo } from './components/Ecommerce';
import Wishlist from './components/Ecommerce/Wishlist';
import ProductDetail from './components/Ecommerce/ProductDetail';
import CartPage from './components/Ecommerce/CartPage';
import { ShopProvider } from './contexts/ShopContext';
import TrackOrder from './pages/TrackOrder';
import Stores from './pages/Stores';
import VendorRegister from './pages/Vendor/VendorRegister';
import VendorDashboard from './pages/Vendor/VendorDashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserManagement from './pages/Admin/UserManagement';
import StaffConsole from './pages/Admin/StaffConsole';
import AdminOrders from './pages/Admin/AdminOrders';
import DoctorManagement from './pages/Admin/DoctorManagement';
import VendorOrders from './pages/Vendor/VendorOrders';
import Families from './pages/Families/Families';
import SupportCenter from './pages/Support/SupportCenter';
import RecommendationTestPage from './pages/RecommendationTestPage';
import FeedbackClassification from './components/FeedbackClassification';
const InventoryPage = React.lazy(() => import('./pages/Admin/Inventory'));
const AboutLazy = React.lazy(() => import('./pages/About/About'));
const ApproachLazy = React.lazy(() => import('./pages/About/Approach'));
const CurriculumLazy = React.lazy(() => import('./pages/Curriculum/Curriculum'));

// Removed ForceLandingOnFirstLoad: it caused unexpected redirects to the landing page on refresh.

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
    <ShopProvider>
    <Box sx={{ minHeight: '100vh' }}>
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
          {/* Public registration is only for customers */}
          <Route 
            path="/register" 
            element={<Register />} 
          />
          {/* Explicit parent and staff registration paths */}
          <Route path="/register/parent" element={<Register fixedRole="parent" />} />
          <Route path="/register/staff" element={<Register fixedRole="staff" />} />
          <Route path="/register/teacher" element={<Register fixedRole="staff" fixedStaffType="teacher" />} />
          <Route path="/register/driver" element={<Register fixedRole="staff" fixedStaffType="driver" />} />
          <Route path="/register/delivery" element={<Register fixedRole="staff" fixedStaffType="delivery" />} />
          <Route path="/register/nanny" element={<Register fixedRole="staff" fixedStaffType="nanny" />} />
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

          {/* Support Center - Public Route */}
          <Route 
            path="/support" 
            element={<SupportCenter />} 
          />

          {/* Recommendation Test Page - Public Route */}
          <Route 
            path="/recommendations-test" 
            element={<RecommendationTestPage />} 
          />

          {/* Feedback Classification Page - Public Route */}
          <Route 
            path="/feedback-classification" 
            element={<FeedbackClassification />} 
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

          {/* Track Order - Public Route */}
          <Route
            path="/track-order"
            element={<TrackOrder />}
          />

          {/* Stores & Preschools - Public Route */}
          <Route
            path="/stores"
            element={<Stores />}
          />

          {/* Shortlist/Wishlist - Public Route */}
          <Route 
            path="/shortlist" 
            element={<Wishlist />} 
          />

          {/* Cart Page - Public Route (login required only to checkout) */}
          <Route
            path="/cart"
            element={<CartPage />}
          />

          {/* Product Detail */}
          <Route 
            path="/product/:id" 
            element={<ProductDetail />} 
          />

          {/* Fashion Aggregated Page - Public Route */}
          <Route
            path="/fashion"
            element={<EcommerceDemo initialCategory="fashion" filterMode="categoryOnly" initialQuery="" />}
          />

          {/* Festival Offers landing - Public Route */}
          <Route
            path="/festival-offers"
            element={<EcommerceDemo initialCategory="girl" initialQuery="festival, fest, diwali, offer" filterMode="union" />}
          />

          {/* Customer Registration - OTP-based */}
          <Route
            path="/customer-register"
            element={<CustomerRegister />}
          />
          
          {/* Customer Login - OTP-based */}
          <Route
            path="/customer-login"
            element={<CustomerLogin />}
          />

          {/* Payment Demo - Public Route */}
          <Route
            path="/payment-demo"
            element={<PaymentDemo />}
          />

          {/* Payment Success - Public Route */}
          <Route
            path="/payment-success"
            element={<PaymentSuccess />}
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
          <Route
            path="/vendor/customers"
            element={user?.role === 'vendor' ? <Layout><VendorCustomerManagement /></Layout> : <Navigate to="/" replace />}
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
          {/* Customer Orders - Protected Route */}
          <Route
            path="/orders"
            element={user ? <CustomerOrders /> : <Navigate to="/" replace />}
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
            path="/meal-plan-approval" 
            element={user && (user.role === 'admin' || user.role === 'staff') ? <Layout><MealPlanApproval /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
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
            element={user ? <Profile /> : <Navigate to="/" replace />} 
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
            path="/admin/staff-console" 
            element={user?.role === 'admin' ? <Layout><StaffConsole /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
          />
          <Route 
            path="/admin/inventory" 
            element={user?.role === 'admin' ? <Layout><React.Suspense fallback={null}><InventoryPage /></React.Suspense></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
          />
          <Route 
            path="/admin/orders" 
            element={user?.role === 'admin' ? <Layout><AdminOrders /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
          />
          <Route 
            path="/admin/doctors" 
            element={user?.role === 'admin' ? <Layout><DoctorManagement /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
          />
          <Route 
            path="/vendor/orders" 
            element={user?.role === 'vendor' ? <Layout><VendorOrders /></Layout> : <Navigate to={user ? '/dashboard' : '/'} replace />} 
          />
          
          {/* Fallback */}
          <Route
            path="*"
            element={user ? <Navigate to={user.role === 'customer' ? '/shop' : '/dashboard'} replace /> : <Navigate to="/" replace />}
          />
        </Routes>
    </Box>
    </ShopProvider>
  );
}

export default App;