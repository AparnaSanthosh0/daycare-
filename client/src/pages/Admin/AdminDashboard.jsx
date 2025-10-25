import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Avatar,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  SupervisorAccount,
  People,
  Group,
  Business,
  CheckCircle,
  Cancel,
  Visibility,
  PersonAdd,
  Refresh,
  ExpandMore,
  Receipt,
  Payment,
  Calculate,
  Assessment,
  Add,
  Edit
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';
// import StaffChildAssignment from './StaffChildAssignment';
import { API_BASE_URL } from '../../config/api';
// Animated counter for stats
const CountUp = ({ value, duration = 600 }) => {
  const [display, setDisplay] = React.useState(0);
  const prevRef = React.useRef(0);
  React.useEffect(() => {
    const start = performance.now();
    const from = prevRef.current;
    const to = Number(value) || 0;
    const d = Math.max(duration, 200);
    let raf;
    const step = (now) => {
      const t = Math.min(1, (now - start) / d);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    prevRef.current = to;
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display}</>;
};

const StatCard = ({ title, value, icon, color, onClick }) => (
  <Card sx={{ height: '100%', cursor: onClick ? 'pointer' : 'default', transition: 'transform 120ms ease, box-shadow 120ms ease', '&:hover': { transform: onClick ? 'translateY(-3px)' : 'none', boxShadow: 6 } }} onClick={onClick}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom variant="overline">
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            <CountUp value={value} />
          </Typography>
        </Box>
        <Avatar sx={{ backgroundColor: color, width: 56, height: 56 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);

  // Handle URL parameters for tab selection
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tab = urlParams.get('tab');
    if (tab === 'staff') {
      setTabValue(3); // Staff Management tab
    }
  }, [location.search]);
  const [search, setSearch] = useState('');
  
  // Data states
  const [pendingStaff, setPendingStaff] = useState([]);
  const [pendingParents, setPendingParents] = useState([]);
  const [pendingVendors, setPendingVendors] = useState([]);
  const [currentVendor, setCurrentVendor] = useState(null);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Create child form (and parent selection)
  const [childForm, setChildForm] = useState({
    parentId: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    program: 'preschool',
    tuitionRate: 0,
    allergies: [],
    medicalConditions: [],
    emergencyContacts: [],
    authorizedPickup: []
  });
  const [parentsList, setParentsList] = useState([]);
  const [prefilledLocked, setPrefilledLocked] = useState(false);
  // Vendor edit dialog
  const [editVendorDialog, setEditVendorDialog] = useState({ open: false });
  const [vendorForm, setVendorForm] = useState({
    vendorName: '',
    companyName: '',
    email: '',
    phone: '',
    businessLicenseNumber: '',
    address: { street: '', city: '', state: '', zipCode: '' },
    notes: ''
  });
  const [assignmentDialog, setAssignmentDialog] = useState({ open: false, child: null, selectedStaffId: '', selectedChildId: '' });

  // Families (parents + children combined)
  const [families, setFamilies] = useState([]);

  // All users data
  const [allStaff, setAllStaff] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [allChildren, setAllChildren] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Customers state for e-commerce
  const [customers, setCustomers] = useState([]);
  const [customerForm, setCustomerForm] = useState({
    parentId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: { street: '', city: '', state: '', zipCode: '' },
    preferredProducts: []
  });
  const [createCustomerDialog, setCreateCustomerDialog] = useState(false);
  const [actionDialog, setActionDialog] = useState({ open: false, data: null, type: '', action: '' });
  const [createChildDialog, setCreateChildDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [viewDialog, setViewDialog] = useState({ open: false, data: null, type: '' });
  const [editAssignmentDialog, setEditAssignmentDialog] = useState({ open: false, staff: null, children: [] });
  
  // Billing and Payment states
  const [invoiceDialog, setInvoiceDialog] = useState({ open: false, parent: null, child: null });
  const [paymentDialog, setPaymentDialog] = useState({ open: false, invoice: null });
  const [billingStats, setBillingStats] = useState({
    totalRevenue: 0,
    paidInvoices: 0,
    pendingPayments: 0,
    overdueAmount: 0
  });
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoiceForm, setInvoiceForm] = useState({
    parentId: '',
    childId: '',
    amount: '',
    dueDate: '',
    description: '',
    items: []
  });
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: '',
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardData();
      // Load parents to select when creating a child
      (async () => {
        try {
          const res = await api.get('/api/admin/parents', { params: { page: 1, limit: 100 } });
          console.log('Parents API response:', res.data);
          setParentsList(res.data || []);
        } catch (e) {
          console.error('Load parents list error:', e);
          setError('Failed to load parents list: ' + (e?.response?.data?.message || e.message));
        }
      })();
      // Load all users data for the comprehensive view
      (async () => {
        try {
          setUsersLoading(true);
          const [staffRes, vendorsRes, childrenRes] = await Promise.all([
            api.get('/api/admin/staff'),
            api.get('/api/admin/vendors'),
            api.get('/api/children')
          ]);
          setAllStaff(staffRes.data || []);
          setAllVendors(vendorsRes.data || []);
          setAllChildren(childrenRes.data || []);
        } catch (e) {
          console.error('Load all users error:', e);
        } finally {
          setUsersLoading(false);
        }
      })();
      // Load staff assignments
      fetchStaffAssignments();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, staffRes, parentsRes, vendorsRes, currentVendorRes] = await Promise.all([
        api.get('/api/admin/dashboard/stats'),
        api.get('/api/admin/staff/pending'),
        api.get('/api/admin/parents/pending'),
        api.get('/api/admin/vendors/pending'),
        api.get('/api/vendor')
      ]);

      setStats(statsRes.data);
      setPendingStaff(staffRes.data);
      setPendingParents(parentsRes.data);
      setPendingVendors(vendorsRes.data);
      setCurrentVendor(currentVendorRes.data?.vendor || null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignStaff = async (childId) => {
    try {
      await api.put(`/api/children/${childId}/unassign-staff`);
      fetchStaffAssignments();
    } catch (error) {
      console.error('Error unassigning staff:', error);
      setError('Failed to unassign staff');
    }
  };

  // Vendor management handlers are intentionally omitted from UI for now to avoid unused code warnings.

  const handleUpdateVendor = async () => {
    try {
      if (!currentVendor?._id) return;
      const payload = { ...vendorForm };
      await api.put(`/api/admin/vendors/${currentVendor._id}`, payload);
      setEditVendorDialog({ open: false });
      fetchDashboardData();
    } catch (e) {
      console.error('Update vendor error:', e);
      setError(e?.response?.data?.message || 'Failed to update vendor');
    }
  };

  // Billing functions
  const generateInvoice = async () => {
    try {
      const response = await api.post('/api/billing/invoices', invoiceForm);
      setInvoices([...invoices, response.data]);
      setInvoiceDialog({ open: false, parent: null, child: null });
      setInvoiceForm({
        parentId: '',
        childId: '',
        amount: '',
        dueDate: '',
        description: '',
        items: []
      });
      fetchBillingStats();
    } catch (error) {
      console.error('Generate invoice error:', error);
      setError('Failed to generate invoice');
    }
  };

  const recordPayment = async () => {
    try {
      const response = await api.post('/api/billing/payments', paymentForm);
      setPayments([...payments, response.data]);
      setPaymentDialog({ open: false, invoice: null });
      setPaymentForm({
        invoiceId: '',
        amount: '',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchBillingStats();
    } catch (error) {
      console.error('Record payment error:', error);
      setError('Failed to record payment');
    }
  };

  const calculateLateFees = async () => {
    try {
      await api.post('/api/billing/calculate-late-fees');
      fetchBillingStats();
      setSuccess('Late fees calculated successfully');
    } catch (error) {
      console.error('Calculate late fees error:', error);
      setError('Failed to calculate late fees');
    }
  };

  const generateFinancialReport = async () => {
    try {
      const response = await api.get('/api/billing/reports/financial');
      // Handle report generation (download or display)
      console.log('Financial report:', response.data);
      setSuccess('Financial report generated successfully');
    } catch (error) {
      console.error('Generate report error:', error);
      setError('Failed to generate financial report');
    }
  };

  const fetchBillingStats = async () => {
    try {
      const response = await api.get('/api/billing/stats');
      setBillingStats(response.data);
    } catch (error) {
      console.error('Fetch billing stats error:', error);
    }
  };

  // const handleDeleteVendor = async () => { /* intentionally removed (unused) */ };

  // const handleResetVendorPassword = async () => { /* intentionally removed (unused) */ };

  const prefillFromAdmission = async (parentId) => {
    try {
      const res = await api.get('/api/admin/admissions/pending');
      const list = res.data || [];
      const ar = list.find((x) => (
        (x.parentUser && (x.parentUser._id === parentId || x.parentUser === parentId)) ||
        (x.parent && (x.parent._id === parentId || x.parent === parentId))
      ));
      if (!ar) { setPrefilledLocked(false); return; }
      const name = ar.child?.name || '';
      const [firstName = '', ...rest] = name.trim().split(' ');
      const lastName = rest.join(' ');
      const dob = ar.child?.dateOfBirth ? new Date(ar.child.dateOfBirth) : null;
      const dobStr = dob && !isNaN(dob.getTime()) ? dob.toISOString().slice(0, 10) : '';

      setChildForm((prev) => ({
        ...prev,
        parentId,
        firstName,
        lastName,
        dateOfBirth: dobStr,
        gender: ar.child?.gender || 'male',
        program: ar.child?.program || 'preschool',
        tuitionRate: prev.tuitionRate || 0,
        allergies: [],
        medicalConditions: ar.child?.medicalInfo ? [ar.child.medicalInfo] : [],
        emergencyContacts: ar.child?.emergencyContactName ? [{
          name: ar.child.emergencyContactName,
          phone: ar.child.emergencyContactPhone || '',
          relationship: 'Emergency'
        }] : [],
        authorizedPickup: []
      }));
      setPrefilledLocked(true);
    } catch (e) {
      console.error('Prefill from admission error:', e);
      setPrefilledLocked(false);
    }
  };

  // Staff assignment functions
  const fetchStaffAssignments = async () => {
    try {
      setLoadingAssignments(true);
      const [assignmentsRes, staffRes] = await Promise.all([
        api.get('/api/children/assignments/staff'),
        api.get('/api/children/available-staff')
      ]);
      setStaffAssignments(assignmentsRes.data.staffAssignments || []);
      setAvailableStaff(staffRes.data || []);
    } catch (error) {
      console.error('Error fetching staff assignments:', error);
      setError('Failed to load staff assignments');
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleAssignStaff = async () => {
    try {
      const childId = assignmentDialog.child?._id || assignmentDialog.selectedChildId;
      if (!childId || !assignmentDialog.selectedStaffId) return;

      await api.put(`/api/children/${childId}/assign-staff`, {
        staffId: assignmentDialog.selectedStaffId
      });

      setAssignmentDialog({ open: false, child: null, selectedStaffId: '', selectedChildId: '' });
      fetchStaffAssignments();
    } catch (error) {
      console.error('Error assigning staff:', error);
      setError('Failed to assign staff');
    }
  };

  // const handleQuickAssignment = async () => { /* intentionally removed (unused) */ };

  const handleApproveReject = async (id, type, action) => {
    try {
      let endpoint = `/api/admin/${type}/${id}/status`;
      let payload = { status: action, reason };

      if (type === 'vendors') {
        endpoint = `/api/admin/vendors/${id}/${action === 'approved' ? 'approve' : 'reject'}`;
        payload = undefined; // no body needed for the new endpoints
      }

      if (payload) {
        await api.put(endpoint, payload);
      } else {
        await api.put(endpoint);
      }

      setActionDialog({ open: false, data: null, type: '', action: '' });
      setReason('');
      fetchDashboardData();
    } catch (error) {
      console.error(`Error ${action}ing ${type}:`, error);
      setError(`Failed to ${action} ${type}`);
    }
  };

  const handleCreateChild = async () => {
    try {
      if (!childForm.parentId) { 
        setError('Please select a parent'); 
        return; 
      }
      if (!childForm.firstName || !childForm.lastName || !childForm.dateOfBirth) { 
        setError('Please fill in all required fields (First Name, Last Name, Date of Birth)'); 
        return; 
      }
      
      // If parentId looks like an email, we need to find the actual parent ID
      let parentId = childForm.parentId;
      if (childForm.parentId.includes('@')) {
        try {
          const parentRes = await api.get(`/api/admin/parents`);
          const parent = parentRes.data.find(p => p.email === childForm.parentId);
          if (!parent) {
            setError('Parent not found with email: ' + childForm.parentId);
            return;
          }
          parentId = parent._id;
        } catch (e) {
          setError('Could not find parent. Please check the email address.');
          return;
        }
      }

      // Validate parent exists and is active
      try {
        const parentRes = await api.get(`/api/admin/parents/${parentId}`);
        if (!parentRes.data || !parentRes.data.isActive) {
          setError('Selected parent is not active. Please activate the parent first.');
          return;
        }
      } catch (e) {
        setError('Parent not found or inactive. Please select a valid parent.');
        return;
      }

      // Build emergencyContacts respecting schema required fields
      const ec0 = (Array.isArray(childForm.emergencyContacts) ? childForm.emergencyContacts[0] : null) || {};
      const emergencyContacts = (ec0.name && ec0.phone)
        ? [{ name: ec0.name.trim(), phone: ec0.phone.trim(), relationship: (ec0.relationship || 'Emergency').trim(), canPickup: !!ec0.canPickup }]
        : [];

      const ap0 = (Array.isArray(childForm.authorizedPickup) ? childForm.authorizedPickup[0] : null) || {};
      const authorizedPickup = (ap0.name || ap0.phone)
        ? [{ name: (ap0.name || '').trim(), phone: (ap0.phone || '').trim(), relationship: (ap0.relationship || '').trim(), photoId: ap0.photoId || '' }]
        : [];

      const payload = {
        firstName: childForm.firstName.trim(),
        lastName: childForm.lastName.trim(),
        dateOfBirth: childForm.dateOfBirth,
        gender: childForm.gender,
        parentId: parentId, // Send parentId instead of parents array for admin route
        program: childForm.program,
        tuitionRate: Number(childForm.tuitionRate) || 0,
        allergies: (childForm.allergies || []).map((a) => String(a)).filter(Boolean),
        medicalConditions: (childForm.medicalConditions || []).map((c) => ({ condition: String(c) })).filter((m) => m.condition),
        emergencyContacts,
        authorizedPickup,
        schedule: {}
      };
      
      console.log('Creating child with payload:', payload);
      const response = await api.post('/api/admin/children', payload);
      console.log('Child creation response:', response.data);
      
      setCreateChildDialog(false);
      setChildForm({ 
        parentId: '', 
        firstName: '', 
        lastName: '', 
        dateOfBirth: '', 
        gender: 'male', 
        program: 'preschool', 
        tuitionRate: 0, 
        allergies: [], 
        medicalConditions: [], 
        emergencyContacts: [], 
        authorizedPickup: [] 
      });
      setPrefilledLocked(false);
      setError(''); // Clear any previous errors
      fetchDashboardData();
      
      // Show success message
      setSuccess(`Child profile created successfully for ${payload.firstName} ${payload.lastName}`);
    } catch (error) {
      console.error('Error creating child:', error);
      const errorMessage = error?.response?.data?.message || error?.response?.data?.errors?.[0]?.msg || 'Failed to create child profile';
      setError(errorMessage);
    }
  };

  const handleRegisterCustomer = async () => {
    try {
      if (!customerForm.email) { setError('Email is required'); return; }
      if (!customerForm.parentId && (!customerForm.firstName || !customerForm.lastName)) { setError('Name is required for new customers'); return; }

      const payload = {
        parentId: customerForm.parentId || null,
        firstName: customerForm.firstName || '',
        lastName: customerForm.lastName || '',
        email: customerForm.email,
        phone: customerForm.phone || '',
        address: customerForm.address,
        preferredProducts: customerForm.preferredProducts
      };

      // Assuming an API endpoint for registering customers
      await api.post('/api/customers', payload);

      setCreateCustomerDialog(false);
      setCustomerForm({
        parentId: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: { street: '', city: '', state: '', zipCode: '' },
        preferredProducts: []
      });

      // Refresh customers list (assuming fetchCustomers function)
      // For now, just add to local state
      setCustomers(prev => [...prev, { ...payload, _id: Date.now() }]);
    } catch (error) {
      console.error('Error registering customer:', error);
      setError(error?.response?.data?.message || 'Failed to register customer');
    }
  };

  const filteredPending = useMemo(() => {
    if (!search.trim()) {
      return {
        staff: pendingStaff,
        parents: pendingParents,
        vendors: pendingVendors,
      };
    }
    const q = search.trim().toLowerCase();
    const applyFilter = (list, type) => (list || []).filter((it) => {
      const name = type === 'vendors' ? it.vendorName : `${it.firstName || ''} ${it.lastName || ''}`;
      return (
        (name || '').toLowerCase().includes(q) ||
        (it.email || '').toLowerCase().includes(q)
      );
    });

    return {
      staff: applyFilter(pendingStaff, 'staff'),
      parents: applyFilter(pendingParents, 'parents'),
      vendors: applyFilter(pendingVendors, 'vendors'),
    };
  }, [search, pendingStaff, pendingParents, pendingVendors]);

  const renderPendingTable = useCallback((raw, type) => {
    const data = filteredPending[type] || [];
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Date Applied</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item._id}>
                <TableCell>
                  {type === 'vendors'
                    ? item.vendorName
                    : (
                      <Button
                        size="small"
                        onClick={() => {
                          // Open Create Child dialog prefilled with this parent and default child fields from last admission if any
                          setCreateChildDialog(true);
                          setPrefilledLocked(true);
                          prefillFromAdmission(item._id);
                          setChildForm((prev) => ({
                            ...prev,
                            parentId: item._id,
                            firstName: '',
                            lastName: '',
                            dateOfBirth: '',
                            gender: 'male',
                            program: 'preschool',
                            tuitionRate: 0,
                            allergies: [],
                            medicalConditions: [],
                            emergencyContacts: item.emergencyContacts || [],
                            authorizedPickup: []
                          }));
                        }}
                      >
                        {`${item.firstName} ${item.lastName}`}
                      </Button>
                    )}
                </TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell>{item.phone}</TableCell>
                <TableCell>
                  {new Date(item.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton
                      onClick={() => setViewDialog({ open: true, data: item, type })}
                      size="small"
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Approve">
                    <IconButton
                      onClick={() => setActionDialog({
                        open: true,
                        data: item,
                        type: type === 'vendors' ? 'vendors' : type,
                        action: 'approved'
                      })}
                      size="small"
                      color="success"
                    >
                      <CheckCircle />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reject">
                    <IconButton
                      onClick={() => setActionDialog({
                        open: true,
                        data: item,
                        type: type === 'vendors' ? 'vendors' : type,
                        action: 'rejected'
                      })}
                      size="small"
                      color="error"
                    >
                      <Cancel />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No pending {type} found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }, [filteredPending]);

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Admin privileges required.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Welcome banner */}
      <Paper elevation={0} sx={{ mb: 3, p: 3, borderRadius: 3, background: (theme) => theme.palette.mode === 'light' ? 'linear-gradient(135deg,#e3f2fd,#ede7f6)' : 'linear-gradient(135deg,#263238,#37474f)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight={800}>Welcome back, {user?.firstName || 'Admin'} 👋</Typography>
            <Typography variant="body2" color="text.secondary">Here’s what’s happening today. Use quick actions to move faster.</Typography>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<PersonAdd />}
              onClick={() => setCreateChildDialog(true)}
              sx={{ mr: 2 }}
            >
              Create Child Profile
            </Button>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={fetchDashboardData}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Statistics Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Staff"
            value={stats.totalStaff || 0}
            icon={<Group />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Parents"
            value={stats.totalParents || 0}
            icon={<People />}
            color="#388e3c"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Children"
            value={stats.totalChildren || 0}
            icon={<SupervisorAccount />}
            color="#f57c00"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Approvals"
            value={stats.pendingApprovals?.total || 0}
            icon={<Business />}
            color="#d32f2f"
          />
        </Grid>
      </Grid>

      {/* Attendance Management Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" gutterBottom>
            Attendance Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<Assessment />}
            onClick={() => window.open('/attendance', '_blank')}
          >
            Open Attendance Dashboard
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Comprehensive attendance tracking for all children and staff. View today's summary, recent activity, and manage attendance records.
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Today's Attendance Summary</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Real-time attendance data for today
                </Typography>
                <Button
                  variant="outlined"
                  onClick={async () => {
                    try {
                      const today = new Date().toISOString().split('T')[0];
                      const res = await api.get(`/api/attendance/admin-summary?date=${today}`);
                      alert(`Today's Summary:\nPresent: ${res.data.present}\nAbsent: ${res.data.absent}\nLate: ${res.data.late}\nTotal: ${res.data.total}`);
                    } catch (error) {
                      console.error('Error fetching attendance summary:', error);
                    }
                  }}
                >
                  View Today's Summary
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Recent Activity</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Latest check-ins and check-outs
                </Typography>
                <Button
                  variant="outlined"
                  onClick={async () => {
                    try {
                      const res = await api.get('/api/attendance/recent-activity');
                      if (res.data && res.data.length > 0) {
                        const activityText = res.data.slice(0, 5).map(activity => 
                          `${activity.entityName} - ${activity.action} (${activity.status})`
                        ).join('\n');
                        alert(`Recent Activity:\n${activityText}`);
                      } else {
                        alert('No recent activity found');
                      }
                    } catch (error) {
                      console.error('Error fetching recent activity:', error);
                    }
                  }}
                >
                  View Recent Activity
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Parents & Children Combined (Families) */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Parents & Children</Typography>
          <Button size="small" onClick={async () => {
            try {
              const [parentsRes, childrenRes] = await Promise.all([
                api.get('/api/admin/parents'),
                api.get('/api/children')
              ]);
              const parents = Array.isArray(parentsRes.data) ? parentsRes.data : (parentsRes.data || []);
              const children = Array.isArray(childrenRes.data) ? childrenRes.data : (childrenRes.data.children || []);
              const byParent = new Map();
              for (const p of parents) byParent.set(p._id, { parent: p, children: [] });
              for (const c of children) (c.parents || []).forEach((pid) => {
                if (!byParent.has(pid)) byParent.set(pid, { parent: { _id: pid }, children: [] });
                byParent.get(pid).children.push(c);
              });
              setFamilies(Array.from(byParent.values()));
            } catch (e) { console.error('Refresh families error:', e); }
          }}>Refresh</Button>
        </Box>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Parent</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Children</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {families.map((f, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>
                    {f.parent?.firstName || f.parent?.lastName ? (
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{f.parent.firstName} {f.parent.lastName}</Typography>
                        <Typography variant="caption" color="text.secondary">ID: {f.parent._id}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2">(Unknown Parent)</Typography>
                    )}
                  </TableCell>
                  <TableCell>{f.parent?.email || '—'}</TableCell>
                  <TableCell>{f.parent?.phone || '—'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {f.children.length === 0 && <Chip size="small" label="No children" variant="outlined" />}
                      {f.children.map((c) => (
                        <Chip key={c._id} size="small" label={`${c.firstName} ${c.lastName} • ${c.program}`} />
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {families.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">No families found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Pending Approvals Section */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" gutterBottom>
            Pending Approvals & Staff Console
          </Typography>
          {/* Quick search/filter */}
          <TextField size="small" placeholder="Search name or email" onChange={(e) => setSearch(e.target.value)} sx={{ ml: 2, width: 260 }} />
        </Box>
        
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Staff
                {pendingStaff.length > 0 && (
                  <Chip size="small" label={pendingStaff.length} color="error" />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Parents
                {pendingParents.length > 0 && (
                  <Chip size="small" label={pendingParents.length} color="error" />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Vendors
                {pendingVendors.length > 0 && (
                  <Chip size="small" label={pendingVendors.length} color="error" />
                )}
              </Box>
            }
          />
          <Tab label="Staff Console" />
          <Tab label="Customers" />
          <Tab label="Billing & Payments" />
          <Tab label="All Users" />
        </Tabs>

        <Box sx={{ mt: 3 }}>
          {tabValue === 0 && renderPendingTable(pendingStaff, 'staff')}
          {tabValue === 1 && renderPendingTable(pendingParents, 'parents')}
          {tabValue === 2 && renderPendingTable(pendingVendors, 'vendors')}
          {tabValue === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Staff Management & Assignments</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button 
                    variant="outlined" 
                    onClick={fetchStaffAssignments} 
                    disabled={loadingAssignments}
                    sx={{ borderColor: 'primary.main', color: 'primary.main' }}
                  >
                    Refresh
                  </Button>
                  <Button 
                    variant="contained" 
                    startIcon={<PersonAdd />} 
                    onClick={() => setAssignmentDialog({ open: true, child: null, selectedStaffId: '', selectedChildId: '' })}
                    sx={{ bgcolor: 'primary.main' }}
                  >
                    Assign Child to Staff
                  </Button>
                  <Button 
                    variant="contained" 
                    startIcon={<SupervisorAccount />} 
                    onClick={() => setTabValue(4)}
                    sx={{ bgcolor: 'primary.main' }}
                  >
                    View All Staff Details
                  </Button>
                </Box>
              </Box>

              {loadingAssignments ? (
                <Typography>Loading staff assignments...</Typography>
              ) : (
                <Grid container spacing={3}>
                  {/* Staff with Assigned Children */}
                  <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>Staff and Assigned Children</Typography>
                      {staffAssignments.length === 0 ? (
                        <Typography>No staff assignments found.</Typography>
                      ) : (
                        staffAssignments.map((staffAssignment) => (
                          <Accordion key={staffAssignment.staff._id} sx={{ mb: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                  {staffAssignment.staff.firstName?.[0]}{staffAssignment.staff.lastName?.[0]}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="h6">
                                    {staffAssignment.staff.firstName} {staffAssignment.staff.lastName}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {staffAssignment.staff.role} • {staffAssignment.totalChildren} children assigned
                                  </Typography>
                                </Box>
                                <Button size="small" variant="outlined" onClick={() => {
                                  // Open edit dialog for this staff's assignments
                                  setEditAssignmentDialog({ open: true, staff: staffAssignment.staff, children: staffAssignment.children });
                                }}>
                                  Edit Assignments
                                </Button>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Typography variant="subtitle1" gutterBottom>Staff Details</Typography>
                              <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2"><strong>Email:</strong> {staffAssignment.staff.email}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2"><strong>Phone:</strong> {staffAssignment.staff.phone || 'N/A'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2"><strong>Experience:</strong> {staffAssignment.staff.staff?.yearsOfExperience || 0} years</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2"><strong>Qualification:</strong> {staffAssignment.staff.staff?.qualification || 'N/A'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2"><strong>Department:</strong> {staffAssignment.staff.staff?.department || 'N/A'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2"><strong>Specialization:</strong> {staffAssignment.staff.staff?.specialization || 'N/A'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2"><strong>Hire Date:</strong> {staffAssignment.staff.staff?.hireDate ? new Date(staffAssignment.staff.staff.hireDate).toLocaleDateString() : 'N/A'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="body2"><strong>Status:</strong> {staffAssignment.staff.isActive ? 'Active' : 'Inactive'}</Typography>
                                </Grid>
                              </Grid>
                              <Typography variant="subtitle1" gutterBottom>Assigned Children</Typography>
                              {staffAssignment.children.length === 0 ? (
                                <Typography>No children assigned to this staff member.</Typography>
                              ) : (
                                <Grid container spacing={2}>
                                  {staffAssignment.children.map((child) => (
                                    <Grid item xs={12} sm={6} md={4} key={child._id}>
                                      <Card variant="outlined">
                                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                          <Typography variant="h6" gutterBottom>
                                            {child.firstName} {child.lastName}
                                          </Typography>
                                          <Typography variant="body2"><strong>Age:</strong> {child.age || 'N/A'}</Typography>
                                          <Typography variant="body2"><strong>Gender:</strong> {child.gender}</Typography>
                                          <Typography variant="body2"><strong>Program:</strong> {child.program}</Typography>
                                          <Typography variant="body2"><strong>Status:</strong> {child.isActive ? 'Active' : 'Inactive'}</Typography>
                                          <Typography variant="body2"><strong>Date of Birth:</strong> {child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : 'N/A'}</Typography>
                                          {child.allergies && child.allergies.length > 0 && (
                                            <Typography variant="body2" color="error"><strong>Allergies:</strong> {child.allergies.join(', ')}</Typography>
                                          )}
                                          {child.medicalConditions && child.medicalConditions.length > 0 && (
                                            <Typography variant="body2" color="warning.main"><strong>Medical Conditions:</strong> {child.medicalConditions.map(m => m.condition || m).join(', ')}</Typography>
                                          )}
                                          {child.emergencyContacts && child.emergencyContacts.length > 0 && (
                                            <Typography variant="body2"><strong>Emergency Contact:</strong> {child.emergencyContacts[0]?.name} ({child.emergencyContacts[0]?.phone})</Typography>
                                          )}
                                          {child.authorizedPickup && child.authorizedPickup.length > 0 && (
                                            <Typography variant="body2"><strong>Authorized Pickup:</strong> {child.authorizedPickup[0]?.name} ({child.authorizedPickup[0]?.phone})</Typography>
                                          )}
                                          {child.schedule && Object.keys(child.schedule).length > 0 && (
                                            <Typography variant="body2"><strong>Schedule:</strong> {Object.entries(child.schedule).map(([day, time]) => `${day}: ${time}`).join(', ')}</Typography>
                                          )}
                                          <Box sx={{ mt: 2 }}>
                                            <Button size="small" variant="outlined" color="error" onClick={() => handleUnassignStaff(child._id)}>
                                              Unassign
                                            </Button>
                                          </Box>
                                        </CardContent>
                                      </Card>
                                    </Grid>
                                  ))}
                                </Grid>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        ))
                      )}
                    </Paper>
                  </Grid>

                  {/* Staff Overview Cards */}
                  <Grid item xs={12}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                      <Typography variant="h6" gutterBottom>Staff Overview</Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                            <CardContent>
                              <Typography variant="h4" gutterBottom>
                                {staffAssignments.length}
                              </Typography>
                              <Typography variant="body2">
                                Total Staff Members
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                            <CardContent>
                              <Typography variant="h4" gutterBottom>
                                {staffAssignments.reduce((acc, assignment) => acc + assignment.totalChildren, 0)}
                              </Typography>
                              <Typography variant="body2">
                                Total Assigned Children
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                            <CardContent>
                              <Typography variant="h4" gutterBottom>
                                {(() => {
                                  const allAssignedChildren = staffAssignments.flatMap(a => a.children.map(c => c._id));
                                  return families.flatMap(f => f.children).filter(c => !allAssignedChildren.includes(c._id)).length;
                                })()}
                              </Typography>
                              <Typography variant="body2">
                                Unassigned Children
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                            <CardContent>
                              <Typography variant="h4" gutterBottom>
                                {Math.round(staffAssignments.reduce((acc, assignment) => acc + assignment.totalChildren, 0) / Math.max(staffAssignments.length, 1))}
                              </Typography>
                              <Typography variant="body2">
                                Avg Children per Staff
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>

                </Grid>
              )}
            </Box>
          )}
          {tabValue === 4 && (
            <Box>
              <Typography variant="h6" gutterBottom>All Users Overview</Typography>

              {/* Staff Section */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Staff Members</Typography>
                  <Button variant="outlined" onClick={() => {
                    // Refresh all users data
                    (async () => {
                      try {
                        setUsersLoading(true);
                        const [staffRes, vendorsRes, childrenRes] = await Promise.all([
                          api.get('/api/admin/staff'),
                          api.get('/api/admin/vendors'),
                          api.get('/api/children')
                        ]);
                        setAllStaff(staffRes.data || []);
                        setAllVendors(vendorsRes.data || []);
                        setAllChildren(childrenRes.data || []);
                      } catch (e) {
                        console.error('Refresh all users error:', e);
                      } finally {
                        setUsersLoading(false);
                      }
                    })();
                  }} disabled={usersLoading}>
                    Refresh
                  </Button>
                </Box>

                {usersLoading ? (
                  <Typography>Loading staff...</Typography>
                ) : (
                  <Grid container spacing={2}>
                    {allStaff.map((staff) => (
                      <Grid item xs={12} sm={6} md={4} key={staff._id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                {staff.firstName?.[0]}{staff.lastName?.[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="h6">
                                  {staff.firstName} {staff.lastName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {staff.role} • {staff.staff?.qualification}
                                </Typography>
                              </Box>
                            </Box>
                            <Typography variant="body2">
                              <strong>Email:</strong> {staff.email}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Phone:</strong> {staff.phone || 'N/A'}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Experience:</strong> {staff.staff?.yearsOfExperience || 0} years
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                    {allStaff.length === 0 && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">No staff members found</Typography>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Paper>

              {/* Vendors Section */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Vendors</Typography>
                {usersLoading ? (
                  <Typography>Loading vendors...</Typography>
                ) : (
                  <Grid container spacing={2}>
                    {allVendors.map((vendor) => (
                      <Grid item xs={12} sm={6} md={4} key={vendor._id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {vendor.vendorName}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Company:</strong> {vendor.companyName}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Email:</strong> {vendor.email}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Phone:</strong> {vendor.phone || 'N/A'}
                            </Typography>
                            <Typography variant="body2">
                              <strong>License:</strong> {vendor.businessLicenseNumber || 'N/A'}
                            </Typography>
                            {vendor.address && (
                              <Typography variant="body2">
                                <strong>Address:</strong> {[
                                  vendor.address.street,
                                  vendor.address.city,
                                  vendor.address.state,
                                  vendor.address.zipCode
                                ].filter(Boolean).join(', ')}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                    {allVendors.length === 0 && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">No vendors found</Typography>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Paper>

              {/* Children Section */}
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Children</Typography>
                {usersLoading ? (
                  <Typography>Loading children...</Typography>
                ) : (
                  <Grid container spacing={2}>
                    {allChildren.map((child) => (
                      <Grid item xs={12} sm={6} md={4} key={child._id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {child.firstName} {child.lastName}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Age:</strong> {child.age || 'N/A'}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Gender:</strong> {child.gender}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Program:</strong> {child.program}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Status:</strong> {child.isActive ? 'Active' : 'Inactive'}
                            </Typography>
                            {child.allergies && child.allergies.length > 0 && (
                              <Typography variant="body2">
                                <strong>Allergies:</strong> {child.allergies.join(', ')}
                              </Typography>
                            )}
                            {child.assignedStaff && (
                              <Typography variant="body2" color="primary">
                                <strong>Assigned Staff:</strong> {child.assignedStaff.firstName} {child.assignedStaff.lastName}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                    {allChildren.length === 0 && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">No children found</Typography>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Paper>
            </Box>
          )}
          {tabValue === 5 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">E-commerce Customers</Typography>
                <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setCreateCustomerDialog(true)}>
                  Register New Customer
                </Button>
              </Box>
              
              {/* Customer Statistics */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">{customers.length}</Typography>
                      <Typography variant="body2">Total Customers</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">{customers.filter(c => c.isActive).length}</Typography>
                      <Typography variant="body2">Active Customers</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">{customers.filter(c => c.parentId).length}</Typography>
                      <Typography variant="body2">Linked to Parents</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">{customers.filter(c => !c.parentId).length}</Typography>
                      <Typography variant="body2">E-commerce Only</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                {customers.map((customer) => (
                  <Grid item xs={12} sm={6} md={4} key={customer._id}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography variant="h6" gutterBottom>
                            {customer.firstName} {customer.lastName}
                          </Typography>
                          <Chip 
                            label={customer.isActive ? 'Active' : 'Inactive'} 
                            color={customer.isActive ? 'success' : 'error'} 
                            size="small" 
                          />
                        </Box>
                        
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Email:</strong> {customer.email}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Phone:</strong> {customer.phone || 'N/A'}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Account Type:</strong> {customer.parentId ? 'Linked to Parent' : 'E-commerce Only'}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Joined:</strong> {new Date(customer.createdAt).toLocaleDateString()}
                        </Typography>
                        
                        {customer.address && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Address:</strong> {customer.address.street}, {customer.address.city}
                          </Typography>
                        )}
                        
                        {customer.preferredProducts && customer.preferredProducts.length > 0 && (
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Preferred Products:</strong> {customer.preferredProducts.length} items
                          </Typography>
                        )}
                        
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button size="small" variant="outlined">
                            View Details
                          </Button>
                          <Button size="small" variant="outlined">
                            Edit
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {customers.length === 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">No customers registered yet</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
          {tabValue === 6 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Billing & Payment Management
              </Typography>
              
              {/* Billing Statistics */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">${billingStats.totalRevenue.toFixed(2)}</Typography>
                      <Typography variant="body2">Total Revenue</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">${billingStats.paidInvoices.toFixed(2)}</Typography>
                      <Typography variant="body2">Paid Invoices</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">${billingStats.pendingPayments.toFixed(2)}</Typography>
                      <Typography variant="body2">Pending Payments</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'error.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">${billingStats.overdueAmount.toFixed(2)}</Typography>
                      <Typography variant="body2">Overdue Amount</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Billing Actions */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button 
                    variant="contained" 
                    fullWidth 
                    startIcon={<Receipt />}
                    onClick={() => setInvoiceDialog({ open: true, parent: null, child: null })}
                  >
                    Generate Invoice
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<Payment />}
                    onClick={() => setPaymentDialog({ open: true, invoice: null })}
                  >
                    Record Payment
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<Calculate />}
                    onClick={calculateLateFees}
                  >
                    Calculate Late Fees
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    startIcon={<Assessment />}
                    onClick={generateFinancialReport}
                  >
                    Financial Reports
                  </Button>
                </Grid>
              </Grid>

              {/* Recent Invoices */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Invoices
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Invoice #</TableCell>
                          <TableCell>Parent/Child</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Due Date</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoices.length > 0 ? (
                          invoices.map((invoice) => (
                            <TableRow key={invoice._id}>
                              <TableCell>#{invoice.invoiceNumber}</TableCell>
                              <TableCell>
                                {invoice.parent?.firstName} {invoice.parent?.lastName}
                                {invoice.child && ` - ${invoice.child.firstName}`}
                              </TableCell>
                              <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                              <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Chip
                                  label={invoice.status}
                                  color={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'error' : 'warning'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Button size="small" variant="outlined">
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No invoices generated yet
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Payment History
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Payment ID</TableCell>
                          <TableCell>Parent/Child</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Payment Date</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payments.length > 0 ? (
                          payments.map((payment) => (
                            <TableRow key={payment._id}>
                              <TableCell>#{payment.paymentNumber}</TableCell>
                              <TableCell>
                                {payment.invoice?.parent?.firstName} {payment.invoice?.parent?.lastName}
                                {payment.invoice?.child && ` - ${payment.invoice.child.firstName}`}
                              </TableCell>
                              <TableCell>${payment.amount.toFixed(2)}</TableCell>
                              <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                              <TableCell>{payment.paymentMethod}</TableCell>
                              <TableCell>
                                <Chip
                                  label={payment.status}
                                  color={payment.status === 'completed' ? 'success' : 'warning'}
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No payment history available
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Tuition Management */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Tuition Management
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        startIcon={<Add />}
                        onClick={() => {/* Set tuition rates */}}
                      >
                        Set Tuition Rates
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        startIcon={<Edit />}
                        onClick={() => {/* Update rates */}}
                      >
                        Update Rates
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        startIcon={<Visibility />}
                        onClick={() => {/* View rates */}}
                      >
                        View Current Rates
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Financial Reports */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Financial Reports
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        startIcon={<Assessment />}
                        onClick={() => {/* Monthly report */}}
                      >
                        Monthly Report
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        startIcon={<Assessment />}
                        onClick={() => {/* Quarterly report */}}
                      >
                        Quarterly Report
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        startIcon={<Assessment />}
                        onClick={() => {/* Annual report */}}
                      >
                        Annual Report
                      </Button>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        startIcon={<Assessment />}
                        onClick={() => {/* Custom report */}}
                      >
                        Custom Report
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>
      </Paper>

      {/* View Details Dialog */}
      <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false, data: null, type: '' })} maxWidth="md" fullWidth>
        <DialogTitle>
          {viewDialog.type === 'vendors' ? 'Vendor' : 
           viewDialog.type === 'staff' ? 'Staff' : 'Parent'} Details
        </DialogTitle>
        <DialogContent>
          {viewDialog.data && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Name:</Typography>
                <Typography>
                  {viewDialog.type === 'vendors' 
                    ? viewDialog.data.vendorName 
                    : `${viewDialog.data.firstName} ${viewDialog.data.lastName}`}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Email:</Typography>
                <Typography>{viewDialog.data.email}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Phone:</Typography>
                <Typography>{viewDialog.data.phone}</Typography>
              </Grid>
              {viewDialog.type === 'vendors' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Company:</Typography>
                    <Typography>{viewDialog.data.companyName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">License Number:</Typography>
                    <Typography>{viewDialog.data.businessLicenseNumber}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Address:</Typography>
                    <Typography>
                      {[
                        viewDialog.data.address?.street,
                        viewDialog.data.address?.city,
                        viewDialog.data.address?.state,
                        viewDialog.data.address?.zipCode
                      ].filter(Boolean).join(', ') || '—'}
                    </Typography>
                  </Grid>
                  {viewDialog.data.licenseUrl && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Certificate:</Typography>
                      <Box sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          component="a"
                          href={viewDialog.data.licenseUrl?.startsWith('http') ? viewDialog.data.licenseUrl : `${API_BASE_URL}${viewDialog.data.licenseUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="outlined"
                        >
                          View / Download
                        </Button>
                      </Box>
                    </Grid>
                  )}
                </>
              )}
              {viewDialog.type === 'staff' && viewDialog.data.staff && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Experience:</Typography>
                    <Typography>{viewDialog.data.staff.yearsOfExperience} years</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Qualification:</Typography>
                    <Typography>{viewDialog.data.staff.qualification}</Typography>
                  </Grid>
                </>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2">Applied Date:</Typography>
                <Typography>{new Date(viewDialog.data.createdAt).toLocaleString()}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, data: null, type: '' })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={editVendorDialog.open} onClose={() => setEditVendorDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Vendor</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Vendor Name" value={vendorForm.vendorName} onChange={(e) => setVendorForm({ ...vendorForm, vendorName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Company Name" value={vendorForm.companyName} onChange={(e) => setVendorForm({ ...vendorForm, companyName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone" value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Business License Number" value={vendorForm.businessLicenseNumber} onChange={(e) => setVendorForm({ ...vendorForm, businessLicenseNumber: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Street" value={vendorForm.address.street} onChange={(e) => setVendorForm({ ...vendorForm, address: { ...vendorForm.address, street: e.target.value } })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="City" value={vendorForm.address.city} onChange={(e) => setVendorForm({ ...vendorForm, address: { ...vendorForm.address, city: e.target.value } })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="State" value={vendorForm.address.state} onChange={(e) => setVendorForm({ ...vendorForm, address: { ...vendorForm.address, state: e.target.value } })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Zip Code" value={vendorForm.address.zipCode} onChange={(e) => setVendorForm({ ...vendorForm, address: { ...vendorForm.address, zipCode: e.target.value } })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} label="Notes" value={vendorForm.notes} onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditVendorDialog({ open: false })}>Cancel</Button>
          <Button onClick={handleUpdateVendor} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, data: null, type: '', action: '' })}>
        <DialogTitle>
          {actionDialog.action === 'approved' ? 'Approve' : 'Reject'} {actionDialog.type}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to {actionDialog.action === 'approved' ? 'approve' : 'reject'} this {actionDialog.type}?
          </Typography>
          {actionDialog.action === 'rejected' && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, data: null, type: '', action: '' })}>
            Cancel
          </Button>
          <Button
            onClick={() => handleApproveReject(actionDialog.data?._id, actionDialog.type, actionDialog.action)}
            color={actionDialog.action === 'approved' ? 'success' : 'error'}
            variant="contained"
          >
            {actionDialog.action === 'approved' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Staff Assignment Dialog */}
      <Dialog open={assignmentDialog.open} onClose={() => setAssignmentDialog({ open: false, child: null, selectedStaffId: '', selectedChildId: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Staff to Child</DialogTitle>
        <DialogContent>
          <Box>
            {/* Child selector (defaults to currently viewed child if provided) */}
            {!assignmentDialog.child && (
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Select Child</InputLabel>
                <Select
                  value={assignmentDialog.selectedChildId}
                  onChange={(e) => setAssignmentDialog({ ...assignmentDialog, selectedChildId: e.target.value })}
                  label="Select Child"
                >
                  {(() => {
                    const assignedIds = new Set((staffAssignments || []).flatMap(a => (a.children || []).map(c => c._id)));
                    const children = (allChildren || []).filter(c => !assignedIds.has(c._id));
                    return children.map((child) => (
                      <MenuItem key={child._id} value={child._id}>
                        {child.firstName} {child.lastName} • {child.program}
                      </MenuItem>
                    ));
                  })()}
                </Select>
              </FormControl>
            )}

            {assignmentDialog.child && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {assignmentDialog.child.firstName} {assignmentDialog.child.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Age {assignmentDialog.child.age} • {assignmentDialog.child.gender} • {assignmentDialog.child.program}
                </Typography>
              </Box>
            )}

            {/* Staff selector */}
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Select Staff Member</InputLabel>
              <Select
                value={assignmentDialog.selectedStaffId}
                onChange={(e) => setAssignmentDialog({ ...assignmentDialog, selectedStaffId: e.target.value })}
                label="Select Staff Member"
              >
                {availableStaff.map((staff) => (
                  <MenuItem key={staff._id} value={staff._id}>
                    {staff.firstName} {staff.lastName} ({staff.assignedChildrenCount} children assigned)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignmentDialog({ open: false, child: null, selectedStaffId: '', selectedChildId: '' })}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignStaff}
            variant="contained"
            disabled={!(assignmentDialog.selectedStaffId && (assignmentDialog.child?._id || assignmentDialog.selectedChildId))}
          >
            Assign Staff
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Child Profile Dialog */}
      <Dialog open={createChildDialog} onClose={() => setCreateChildDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Child Profile</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Parent"
                value={childForm.parentId}
                onChange={(e) => setChildForm({ ...childForm, parentId: e.target.value })}
                required
                helperText={parentsList.length === 0 ? "No active parents found. Please ensure parents are registered and approved first." : `${parentsList.length} parent(s) available`}
              >
                {parentsList.length === 0 ? (
                  <MenuItem value="" disabled>
                    No active parents available - Please approve parents first
                  </MenuItem>
                ) : (
                  parentsList.map((p) => (
                    <MenuItem key={p._id} value={p._id} onClick={() => prefillFromAdmission(p._id)}>
                      {p.firstName} {p.lastName} - {p.email} {!p.isActive ? '(Inactive)' : ''}
                    </MenuItem>
                  ))
                )}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={childForm.firstName}
                onChange={(e) => setChildForm({ ...childForm, firstName: e.target.value })}
                required
                disabled={prefilledLocked}
                error={!childForm.firstName && childForm.firstName !== ''}
                helperText={!childForm.firstName && childForm.firstName !== '' ? 'First name is required' : ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={childForm.lastName}
                onChange={(e) => setChildForm({ ...childForm, lastName: e.target.value })}
                required
                disabled={prefilledLocked}
                error={!childForm.lastName && childForm.lastName !== ''}
                helperText={!childForm.lastName && childForm.lastName !== '' ? 'Last name is required' : ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date of Birth"
                InputLabelProps={{ shrink: true }}
                value={childForm.dateOfBirth}
                onChange={(e) => setChildForm({ ...childForm, dateOfBirth: e.target.value })}
                required
                disabled={prefilledLocked}
                error={!childForm.dateOfBirth && childForm.dateOfBirth !== ''}
                helperText={!childForm.dateOfBirth && childForm.dateOfBirth !== '' ? 'Date of birth is required' : ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Gender"
                value={childForm.gender}
                onChange={(e) => setChildForm({ ...childForm, gender: e.target.value })}
                required
                disabled={prefilledLocked}
                error={!childForm.gender && childForm.gender !== ''}
                helperText={!childForm.gender && childForm.gender !== '' ? 'Gender is required' : ''}
              >
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Program"
                value={childForm.program}
                onChange={(e) => setChildForm({ ...childForm, program: e.target.value })}
                required
                disabled={prefilledLocked}
                error={!childForm.program && childForm.program !== ''}
                helperText={!childForm.program && childForm.program !== '' ? 'Program is required' : ''}
              >
                <MenuItem value="infant">Infant</MenuItem>
                <MenuItem value="toddler">Toddler</MenuItem>
                <MenuItem value="preschool">Preschool</MenuItem>
                <MenuItem value="prekindergarten">Prekindergarten</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Medical Info"
                multiline
                minRows={2}
                value={childForm.medicalInfo || ''}
                onChange={(e) => setChildForm({ ...childForm, medicalInfo: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Allergies (comma separated)"
                value={childForm.allergies.join(', ')}
                onChange={(e) => setChildForm({ ...childForm, allergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Medical Conditions (comma separated)"
                value={childForm.medicalConditions.join(', ')}
                onChange={(e) => setChildForm({ ...childForm, medicalConditions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Emergency Contact (optional)</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={(childForm.emergencyContacts?.[0]?.name) || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      const arr = Array.isArray(childForm.emergencyContacts) ? [...childForm.emergencyContacts] : [];
                      arr[0] = { ...(arr[0] || { relationship: 'Emergency' }), name: v };
                      setChildForm({ ...childForm, emergencyContacts: arr });
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={(childForm.emergencyContacts?.[0]?.phone) || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      const arr = Array.isArray(childForm.emergencyContacts) ? [...childForm.emergencyContacts] : [];
                      arr[0] = { ...(arr[0] || { relationship: 'Emergency' }), phone: v };
                      setChildForm({ ...childForm, emergencyContacts: arr });
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Relationship"
                    value={(childForm.emergencyContacts?.[0]?.relationship) || 'Emergency'}
                    onChange={(e) => {
                      const v = e.target.value;
                      const arr = Array.isArray(childForm.emergencyContacts) ? [...childForm.emergencyContacts] : [];
                      arr[0] = { ...(arr[0] || {}), relationship: v };
                      setChildForm({ ...childForm, emergencyContacts: arr });
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Authorized Pickup (optional)</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={(childForm.authorizedPickup?.[0]?.name) || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      const arr = Array.isArray(childForm.authorizedPickup) ? [...childForm.authorizedPickup] : [];
                      arr[0] = { ...(arr[0] || {}), name: v };
                      setChildForm({ ...childForm, authorizedPickup: arr });
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={(childForm.authorizedPickup?.[0]?.phone) || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      const arr = Array.isArray(childForm.authorizedPickup) ? [...childForm.authorizedPickup] : [];
                      arr[0] = { ...(arr[0] || {}), phone: v };
                      setChildForm({ ...childForm, authorizedPickup: arr });
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Relationship"
                    value={(childForm.authorizedPickup?.[0]?.relationship) || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      const arr = Array.isArray(childForm.authorizedPickup) ? [...childForm.authorizedPickup] : [];
                      arr[0] = { ...(arr[0] || {}), relationship: v };
                      setChildForm({ ...childForm, authorizedPickup: arr });
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateChildDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateChild}
            variant="contained"
            disabled={!childForm.parentId || !childForm.firstName || !childForm.lastName || !childForm.dateOfBirth}
          >
            Create Profile
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={createCustomerDialog} onClose={() => setCreateCustomerDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Register New Customer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                If the customer is an existing parent, select them below. Otherwise, fill in the new customer details.
              </Typography>
              <TextField
                select
                fullWidth
                label="Link to Existing Parent (Optional)"
                value={customerForm.parentId}
                onChange={(e) => setCustomerForm({ ...customerForm, parentId: e.target.value })}
              >
                <MenuItem value="">New Customer</MenuItem>
                {parentsList.map((p) => (
                  <MenuItem key={p._id} value={p._id}>
                    {p.firstName} {p.lastName} - {p.email}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={customerForm.firstName}
                onChange={(e) => setCustomerForm({ ...customerForm, firstName: e.target.value })}
                required={!customerForm.parentId}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={customerForm.lastName}
                onChange={(e) => setCustomerForm({ ...customerForm, lastName: e.target.value })}
                required={!customerForm.parentId}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Street Address"
                value={customerForm.address.street}
                onChange={(e) => setCustomerForm({ ...customerForm, address: { ...customerForm.address, street: e.target.value } })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                value={customerForm.address.city}
                onChange={(e) => setCustomerForm({ ...customerForm, address: { ...customerForm.address, city: e.target.value } })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State"
                value={customerForm.address.state}
                onChange={(e) => setCustomerForm({ ...customerForm, address: { ...customerForm.address, state: e.target.value } })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Zip Code"
                value={customerForm.address.zipCode}
                onChange={(e) => setCustomerForm({ ...customerForm, address: { ...customerForm.address, zipCode: e.target.value } })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateCustomerDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRegisterCustomer}
            variant="contained"
            disabled={(!(customerForm.firstName) && !customerForm.parentId) || !customerForm.email}
          >
            Register Customer
          </Button>
        </DialogActions>
      </Dialog>
      {/* Edit Staff Assignments Dialog */}
      <Dialog open={editAssignmentDialog.open} onClose={() => setEditAssignmentDialog({ open: false, staff: null, children: [] })} maxWidth="md" fullWidth>
        <DialogTitle>Edit Assignments for {editAssignmentDialog.staff?.firstName} {editAssignmentDialog.staff?.lastName}</DialogTitle>
        <DialogContent>
          {editAssignmentDialog.staff && (
            <Box>
              <Typography variant="h6" gutterBottom>Staff Details</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>Email:</strong> {editAssignmentDialog.staff.email}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>Phone:</strong> {editAssignmentDialog.staff.phone || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>Experience:</strong> {editAssignmentDialog.staff.staff?.yearsOfExperience || 0} years</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2"><strong>Qualification:</strong> {editAssignmentDialog.staff.staff?.qualification || 'N/A'}</Typography>
                </Grid>
              </Grid>
              <Typography variant="h6" gutterBottom>Assigned Children</Typography>
              <Grid container spacing={2}>
                {editAssignmentDialog.children.map((child) => (
                  <Grid item xs={12} sm={6} md={4} key={child._id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {child.firstName} {child.lastName}
                        </Typography>
                        <Typography variant="body2"><strong>Age:</strong> {child.age || 'N/A'}</Typography>
                        <Typography variant="body2"><strong>Gender:</strong> {child.gender}</Typography>
                        <Typography variant="body2"><strong>Program:</strong> {child.program}</Typography>
                        <Box sx={{ mt: 2 }}>
                          <Button size="small" variant="outlined" color="error" onClick={() => handleUnassignStaff(child._id)}>
                            Unassign
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Box sx={{ mt: 3 }}>
                <Button variant="contained" onClick={() => {
                  setAssignmentDialog({ open: true, child: null, selectedStaffId: editAssignmentDialog.staff._id });
                  setEditAssignmentDialog({ open: false, staff: null, children: [] });
                }}>
                  Assign New Child to This Staff
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAssignmentDialog({ open: false, staff: null, children: [] })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Generation Dialog */}
      <Dialog open={invoiceDialog.open} onClose={() => setInvoiceDialog({ open: false, parent: null, child: null })} maxWidth="md" fullWidth>
        <DialogTitle>Generate Invoice</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Parent</InputLabel>
                <Select
                  value={invoiceForm.parentId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, parentId: e.target.value })}
                >
                  {parentsList.map((parent) => (
                    <MenuItem key={parent._id} value={parent._id}>
                      {parent.firstName} {parent.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Child</InputLabel>
                <Select
                  value={invoiceForm.childId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, childId: e.target.value })}
                >
                  {allChildren.map((child) => (
                    <MenuItem key={child._id} value={child._id}>
                      {child.firstName} {child.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={invoiceForm.amount}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={invoiceForm.description}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialog({ open: false, parent: null, child: null })}>
            Cancel
          </Button>
          <Button onClick={generateInvoice} variant="contained">
            Generate Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Recording Dialog */}
      <Dialog open={paymentDialog.open} onClose={() => setPaymentDialog({ open: false, invoice: null })} maxWidth="md" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Invoice</InputLabel>
                <Select
                  value={paymentForm.invoiceId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, invoiceId: e.target.value })}
                >
                  {invoices.filter(inv => inv.status !== 'paid').map((invoice) => (
                    <MenuItem key={invoice._id} value={invoice._id}>
                      #{invoice.invoiceNumber} - ${invoice.amount}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="check">Check</MenuItem>
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payment Date"
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog({ open: false, invoice: null })}>
            Cancel
          </Button>
          <Button onClick={recordPayment} variant="contained">
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;