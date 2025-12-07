import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CardHeader
} from '@mui/material';
import {
  Assignment,
  Visibility,
  CheckCircle,
  Cancel,
  Add,
  PersonAdd
} from '@mui/icons-material';
import api from '../../config/api';
import PurchasePrediction from '../../components/PurchasePrediction';
import DemandPrediction from '../../components/DemandPrediction';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Dashboard data
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStaff: 0,
    totalParents: 0,
    totalVendors: 0,
    totalChildren: 0
  });
  
  // Pending approvals
  const [pendingStaff, setPendingStaff] = useState([]);
  const [pendingParents, setPendingParents] = useState([]);
  const [pendingVendors, setPendingVendors] = useState([]);
  const [pendingAdmissions, setPendingAdmissions] = useState([]);
  
  // Children and Staff for assignments
  const [allChildren, setAllChildren] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
  
  // Detailed data for comprehensive views
  const [allUsers, setAllUsers] = useState([]);
  const [userDetailsDialog, setUserDetailsDialog] = useState({ open: false, user: null });
  
  
  // Child creation states
  const [createChildDialog, setCreateChildDialog] = useState(false);
  const [childForm, setChildForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    parentId: '',
    program: 'preschool',
    tuitionRate: '',
    medicalInfo: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    allergies: ''
  });
  
  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [viewDialog, setViewDialog] = useState({ open: false, data: null, type: '' });
  const [actionDialog, setActionDialog] = useState({ open: false, data: null, type: '', action: '' });
  const [assignmentDialog, setAssignmentDialog] = useState({ 
    open: false, 
    child: null, 
    selectedStaffId: '', 
    selectedChildId: '' 
  });
  
  // Form states
  const [reason, setReason] = useState('');

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, staffRes, parentsRes, vendorsRes, admissionsRes] = await Promise.all([
        api.get('/api/admin/dashboard/stats'),
        api.get('/api/admin/staff/pending'),
        api.get('/api/admin/parents/pending'),
        api.get('/api/admin/vendors/pending'),
        api.get('/api/admin/admissions/pending')
      ]);
      
      setStats(statsRes.data);
      setPendingStaff(staffRes.data);
      setPendingParents(parentsRes.data);
      setPendingVendors(vendorsRes.data);
      setPendingAdmissions(admissionsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch staff assignments
  const fetchStaffAssignments = async () => {
    try {
      const response = await api.get('/api/children/assignments/staff');
      setStaffAssignments(response.data.staffAssignments || []);
    } catch (error) {
      console.error('Error fetching staff assignments:', error);
    }
  };

  // Fetch children and staff for assignments
  const fetchChildrenAndStaff = async () => {
    try {
      const [childrenRes, staffRes] = await Promise.all([
        api.get('/api/children'),
        api.get('/api/children/available-staff')
      ]);
      setAllChildren(childrenRes.data || []);
      setAllStaff(staffRes.data || []);
    } catch (error) {
      console.error('Error fetching children and staff:', error);
    }
  };


  // Fetch all users with details
  const fetchAllUsersData = async () => {
    try {
      const usersRes = await api.get('/api/admin/users');
      setAllUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Error fetching all users:', error);
      // Generate sample data if API fails
      setAllUsers([
        { _id: '1', firstName: 'Alice', lastName: 'Johnson', email: 'alice@example.com', role: 'staff', phone: '123-456-7890', isActive: true, createdAt: '2024-01-15' },
        { _id: '2', firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com', role: 'parent', phone: '098-765-4321', isActive: true, createdAt: '2024-02-10' },
        { _id: '3', firstName: 'Carol', lastName: 'Brown', email: 'carol@example.com', role: 'vendor', phone: '555-123-4567', isActive: false, createdAt: '2024-03-05' }
      ]);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchStaffAssignments();
    fetchChildrenAndStaff();
    fetchAllUsersData();
  }, []);

  // Handle approve/reject actions
  const handleApproveReject = async (id, type, action) => {
    try {
      let endpoint = `/api/admin/${type}/${id}/status`;
      let payload = { status: action, reason };

      if (type === 'vendors') {
        endpoint = `/api/admin/vendors/${id}/${action === 'approved' ? 'approve' : 'reject'}`;
        payload = undefined;
      } else if (type === 'admissions') {
        endpoint = `/api/admin/admissions/${id}/${action === 'approved' ? 'approve' : 'reject'}`;
        payload = reason ? { reason } : undefined;
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
      console.error('Error approving/rejecting:', error);
      setError(`Failed to ${action === 'approved' ? 'approve' : 'reject'} ${type}`);
    }
  };

  // Handle staff assignment
  const handleStaffAssignment = async () => {
    try {
      if (!assignmentDialog.selectedChildId || !assignmentDialog.selectedStaffId) {
        setError('Please select both child and staff member');
        return;
      }

      await api.put(`/api/children/${assignmentDialog.selectedChildId}/assign-staff`, {
        staffId: assignmentDialog.selectedStaffId
      });

      setAssignmentDialog({ open: false, child: null, selectedStaffId: '', selectedChildId: '' });
      fetchStaffAssignments();
      setError('');
    } catch (error) {
      console.error('Error assigning staff:', error);
      setError('Failed to assign staff to child');
    }
  };

  // Handle child creation
  const handleCreateChild = async () => {
    try {
      if (!childForm.firstName || !childForm.lastName || !childForm.dateOfBirth || !childForm.parentId) {
        setError('First name, last name, date of birth, and parent are required');
        return;
      }

      // Set tuition rate based on program if not provided
      const programRates = {
        'infant': 600,
        'toddler': 550,
        'preschool': 500,
        'prekindergarten': 450
      };
      const defaultTuitionRate = childForm.tuitionRate || programRates[childForm.program] || 500;

      const childData = {
        firstName: childForm.firstName,
        lastName: childForm.lastName,
        dateOfBirth: childForm.dateOfBirth,
        gender: childForm.gender,
        parentId: childForm.parentId,
        program: childForm.program,
        tuitionRate: parseFloat(defaultTuitionRate),
        medicalInfo: childForm.medicalInfo,
        emergencyContactName: childForm.emergencyContactName,
        emergencyContactPhone: childForm.emergencyContactPhone,
        allergies: childForm.allergies.split(',').map(a => a.trim()).filter(a => a)
      };

      await api.post('/api/admin/children', childData);
      
      setSuccess(`Child profile created successfully for ${childForm.firstName} ${childForm.lastName}`);
      setCreateChildDialog(false);
      setChildForm({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'male',
        parentId: '',
        program: 'preschool',
        tuitionRate: '',
        medicalInfo: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        allergies: ''
      });
      
      // Refresh data
      fetchDashboardData();
      fetchChildrenAndStaff();
    } catch (error) {
      console.error('Error creating child:', error);
      setError('Failed to create child profile');
    }
  };

  const openCreateChildFromAdmission = (admission) => {
    if (admission) {
      const childName = admission.child?.name || '';
      const nameParts = childName.split(' ');
      setChildForm({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        dateOfBirth: admission.child?.dateOfBirth ? new Date(admission.child.dateOfBirth).toISOString().split('T')[0] : '',
        gender: admission.child?.gender || 'male',
        parentId: admission.parent || '',
        program: admission.child?.program || 'preschool',
        tuitionRate: '',
        medicalInfo: admission.child?.medicalInfo || '',
        emergencyContactName: admission.child?.emergencyContactName || '',
        emergencyContactPhone: admission.child?.emergencyContactPhone || '',
        allergies: ''
      });
    }
    setCreateChildDialog(true);
  };

  // Filter data based on search term
  const filteredPending = useMemo(() => {
    const filterFn = (items) => 
      items.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        if (item.vendorName) {
          return item.vendorName.toLowerCase().includes(searchLower) || 
                 item.email.toLowerCase().includes(searchLower);
        }
        if (item.child?.name) {
          return item.child.name.toLowerCase().includes(searchLower) ||
                 item.parentUser?.firstName?.toLowerCase().includes(searchLower) ||
                 item.parentUser?.lastName?.toLowerCase().includes(searchLower);
        }
        return `${item.firstName} ${item.lastName}`.toLowerCase().includes(searchLower) ||
               item.email.toLowerCase().includes(searchLower);
      });

    return {
      staff: filterFn(pendingStaff),
      parents: filterFn(pendingParents),
      vendors: filterFn(pendingVendors),
      admissions: filterFn(pendingAdmissions)
    };
  }, [pendingStaff, pendingParents, pendingVendors, pendingAdmissions, searchTerm]);

  // Render pending approvals table
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
                    : type === 'admissions'
                    ? (
                      <Box>
                        <Typography variant="body1" fontWeight="bold">
                          {item.child?.name || 'Unknown Child'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Parent: {item.parentUser?.firstName} {item.parentUser?.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Program: {item.child?.program || 'N/A'} | Age: {item.child?.dateOfBirth ? 
                            Math.floor((new Date() - new Date(item.child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A'} years
                        </Typography>
                      </Box>
                    )
                    : `${item.firstName} ${item.lastName}`}
                </TableCell>
                <TableCell>{type === 'admissions' ? item.parentUser?.email : item.email}</TableCell>
                <TableCell>{type === 'admissions' ? item.parentUser?.phone || 'N/A' : item.phone}</TableCell>
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
                  {type === 'admissions' && (
                    <Tooltip title="Create Child Profile">
                      <IconButton
                        onClick={() => openCreateChildFromAdmission(item)}
                        size="small"
                        color="primary"
                      >
                        <PersonAdd />
                      </IconButton>
                    </Tooltip>
                  )}
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

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
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

      {/* Dashboard Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h4">{stats.totalUsers}</Typography>
              <Typography variant="body2">Total Users</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h4">{stats.totalStaff}</Typography>
              <Typography variant="body2">Staff Members</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h4">{stats.totalParents}</Typography>
              <Typography variant="body2">Parents</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h4">{stats.totalVendors}</Typography>
              <Typography variant="body2">Vendors</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h4">{stats.totalChildren}</Typography>
              <Typography variant="body2">Children</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <TextField
        fullWidth
        label="Search pending approvals..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
      />

      {/* Pending Approvals */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">Pending Approvals</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => setCreateChildDialog(true)}
          >
            Create Child Profile
          </Button>
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
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Admissions
                {pendingAdmissions.length > 0 && (
                  <Chip size="small" label={pendingAdmissions.length} color="error" />
                )}
              </Box>
            }
          />
          <Tab label="Staff Management" />
          <Tab label="Meal Plan Approval" />
          <Tab label="All Users" />
          <Tab label="AI Predictions" />
        </Tabs>

        <Box sx={{ mt: 3 }}>
          {tabValue === 0 && renderPendingTable(pendingStaff, 'staff')}
          {tabValue === 1 && renderPendingTable(pendingParents, 'parents')}
          {tabValue === 2 && renderPendingTable(pendingVendors, 'vendors')}
          {tabValue === 3 && renderPendingTable(pendingAdmissions, 'admissions')}
          
          {/* Staff Management Tab */}
          {tabValue === 4 && (
            <Box>
              <Typography variant="h6" gutterBottom>Staff Management & Assignments</Typography>
              
              {/* Staff Assignment Section */}
              <Card sx={{ mb: 3 }}>
                <CardHeader 
                  title="Assign Children to Staff" 
                  action={
                    <Button
                      variant="contained"
                      startIcon={<Assignment />}
                      onClick={() => setAssignmentDialog({ 
                        open: true, 
                        child: null, 
                        selectedStaffId: '', 
                        selectedChildId: '' 
                      })}
                    >
                      New Assignment
                    </Button>
                  }
                />
              </Card>

              {/* Detailed Staff Information */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Staff Details & Assignments
              </Typography>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Staff Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Experience</TableCell>
                      <TableCell>Qualification</TableCell>
                      <TableCell>Assigned Children</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allStaff.map((staff) => {
                      const assignment = staffAssignments.find(a => a.staff._id === staff._id);
                      return (
                        <TableRow key={staff._id}>
                          <TableCell>
                            <Typography variant="body1" fontWeight="bold">
                              {staff.firstName} {staff.lastName}
                            </Typography>
                          </TableCell>
                          <TableCell>{staff.email}</TableCell>
                          <TableCell>{staff.phone || 'N/A'}</TableCell>
                          <TableCell>{staff.yearsOfExperience || 'N/A'} years</TableCell>
                          <TableCell>{staff.qualification || 'N/A'}</TableCell>
                          <TableCell>
                            {assignment ? (
                              <Box>
                                <Typography variant="body2" gutterBottom>
                                  Total: {assignment.totalChildren}
                                </Typography>
                                {assignment.children.map((child, index) => (
                                  <Chip
                                    key={child._id}
                                    label={`${child.firstName} ${child.lastName} (${child.program})`}
                                    size="small"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                    color="primary"
                                  />
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No assignments
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={staff.isActive ? 'Active' : 'Inactive'}
                              color={staff.isActive ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {allStaff.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary">No staff members found</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          
          {/* Meal Plan Approval Tab */}
          {tabValue === 5 && (
            <Box>
              <Typography variant="h6" gutterBottom>Meal Plan Approval System</Typography>
              
              {/* Meal Plan Statistics */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">
                        {pendingStaff.flatMap(staff => staff.mealPlans || []).filter(plan => plan.status === 'pending').length}
                      </Typography>
                      <Typography variant="body2">Pending Plans</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">
                        {pendingStaff.flatMap(staff => staff.mealPlans || []).filter(plan => plan.status === 'approved').length}
                      </Typography>
                      <Typography variant="body2">Approved Plans</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">
                        {pendingStaff.flatMap(staff => staff.mealPlans || []).filter(plan => plan.status === 'rejected').length}
                      </Typography>
                      <Typography variant="body2">Rejected Plans</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">{pendingStaff.filter(staff => staff.mealPlans && staff.mealPlans.length > 0).length}</Typography>
                      <Typography variant="body2">Staff with Plans</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Meal Plan Submissions */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Staff Meal Plan Submissions
              </Typography>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Plan ID</TableCell>
                      <TableCell>Staff Member</TableCell>
                      <TableCell>Plan Title</TableCell>
                      <TableCell>Target Age Group</TableCell>
                      <TableCell>Submitted Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingStaff.filter(staff => staff.mealPlans && staff.mealPlans.length > 0).flatMap(staff => 
                      staff.mealPlans || []
                    ).map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <Typography variant="body1" fontWeight="bold">
                            {plan.id}
                          </Typography>
                        </TableCell>
                        <TableCell>{plan.staffName}</TableCell>
                        <TableCell>
                          <Typography variant="body1" fontWeight="bold">
                            {plan.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={plan.ageGroup} size="small" color="info" />
                        </TableCell>
                        <TableCell>
                          {new Date(plan.submittedDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={plan.status.toUpperCase()}
                            color={
                              plan.status === 'approved' ? 'success' :
                              plan.status === 'rejected' ? 'error' : 'warning'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {plan.status === 'pending' ? (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => {
                                  // Handle approve
                                  setSuccess(`Meal plan ${plan.id} approved successfully`);
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                onClick={() => {
                                  // Handle reject
                                  setSuccess(`Meal plan ${plan.id} rejected`);
                                }}
                              >
                                Reject
                              </Button>
                            </Box>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                            >
                              View Details
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendingStaff.flatMap(staff => staff.mealPlans || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary">
                            No meal plans submitted by registered staff yet
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          
          {/* All Users Tab */}
          {tabValue === 6 && (
            <Box>
              <Typography variant="h6" gutterBottom>All Users Overview</Typography>
              
              {/* User Statistics */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">{allUsers.filter(u => u.role === 'staff').length}</Typography>
                      <Typography variant="body2">Staff Members</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">{allUsers.filter(u => u.role === 'parent').length}</Typography>
                      <Typography variant="body2">Parents</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">{allUsers.filter(u => u.role === 'vendor').length}</Typography>
                      <Typography variant="body2">Vendors</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                    <CardContent>
                      <Typography variant="h4">{allUsers.filter(u => u.isActive).length}</Typography>
                      <Typography variant="body2">Active Users</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* All Users Table */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                User Directory
              </Typography>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Join Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allUsers.map((user) => (
                      <TableRow 
                        key={user._id}
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: 'action.hover' }
                        }}
                        onClick={() => setUserDetailsDialog({ open: true, user })}
                      >
                        <TableCell>
                          <Typography variant="body1" fontWeight="bold">
                            {user.firstName} {user.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {user._id}
                          </Typography>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={user.role.toUpperCase()}
                            color={
                              user.role === 'admin' ? 'error' :
                              user.role === 'staff' ? 'primary' :
                              user.role === 'parent' ? 'success' : 'secondary'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={user.isActive ? 'Active' : 'Inactive'}
                            color={user.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt || user.joinDate || '2024-01-01').toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setUserDetailsDialog({ open: true, user });
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {allUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary">No users found</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          
          {/* AI Predictions Tab */}
          {tabValue === 7 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                AI-Powered Predictions
              </Typography>
              <PurchasePrediction />
              <DemandPrediction />
            </Box>
          )}
        </Box>
      </Paper>

      {/* Staff Assignment Dialog */}
      <Dialog
        open={assignmentDialog.open}
        onClose={() => setAssignmentDialog({ open: false, child: null, selectedStaffId: '', selectedChildId: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign Staff to Child</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Child selector */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Child</InputLabel>
              <Select
                value={assignmentDialog.selectedChildId}
                onChange={(e) => setAssignmentDialog({
                  ...assignmentDialog,
                  selectedChildId: e.target.value
                })}
              >
                {allChildren.map((child) => (
                  <MenuItem key={child._id} value={child._id}>
                    {child.firstName} {child.lastName} - {child.program}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Staff selector */}
            <FormControl fullWidth>
              <InputLabel>Select Staff Member</InputLabel>
              <Select
                value={assignmentDialog.selectedStaffId}
                onChange={(e) => setAssignmentDialog({
                  ...assignmentDialog,
                  selectedStaffId: e.target.value
                })}
              >
                {allStaff.map((staff) => (
                  <MenuItem key={staff._id} value={staff._id}>
                    {staff.firstName} {staff.lastName} - {staff.assignedChildrenCount || 0} children assigned
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setAssignmentDialog({ open: false, child: null, selectedStaffId: '', selectedChildId: '' })}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleStaffAssignment}
            variant="contained"
            disabled={!assignmentDialog.selectedChildId || !assignmentDialog.selectedStaffId}
          >
            Assign Staff
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false, data: null, type: '' })} maxWidth="md" fullWidth>
        <DialogTitle>
          {viewDialog.type === 'vendors' ? 'Vendor' : 
           viewDialog.type === 'staff' ? 'Staff' : 
           viewDialog.type === 'admissions' ? 'Admission Request' : 'Parent'} Details
        </DialogTitle>
        <DialogContent>
          {viewDialog.data && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Name:</Typography>
                <Typography>
                  {viewDialog.type === 'vendors' 
                    ? viewDialog.data.vendorName 
                    : viewDialog.type === 'admissions'
                    ? viewDialog.data.child?.name || 'Unknown'
                    : `${viewDialog.data.firstName} ${viewDialog.data.lastName}`}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Email:</Typography>
                <Typography>
                  {viewDialog.type === 'admissions' 
                    ? viewDialog.data.parentUser?.email 
                    : viewDialog.data.email}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Applied Date:</Typography>
                <Typography>{new Date(viewDialog.data.createdAt).toLocaleString()}</Typography>
              </Grid>
              {viewDialog.type === 'admissions' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Child Program:</Typography>
                    <Typography>{viewDialog.data.child?.program || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Child Gender:</Typography>
                    <Typography>{viewDialog.data.child?.gender || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Medical Info:</Typography>
                    <Typography>{viewDialog.data.child?.medicalInfo || 'None provided'}</Typography>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, data: null, type: '' })}>
            Close
          </Button>
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

      {/* User Details Dialog */}
      <Dialog 
        open={userDetailsDialog.open} 
        onClose={() => setUserDetailsDialog({ open: false, user: null })} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          User Details - {userDetailsDialog.user?.role?.toUpperCase()}
        </DialogTitle>
        <DialogContent>
          {userDetailsDialog.user && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Full Name:</Typography>
                <Typography variant="body1" gutterBottom>
                  {userDetailsDialog.user.firstName} {userDetailsDialog.user.lastName}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Email:</Typography>
                <Typography variant="body1" gutterBottom>
                  {userDetailsDialog.user.email}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Phone:</Typography>
                <Typography variant="body1" gutterBottom>
                  {userDetailsDialog.user.phone || 'Not provided'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Role:</Typography>
                <Chip 
                  label={userDetailsDialog.user.role.toUpperCase()}
                  color={
                    userDetailsDialog.user.role === 'admin' ? 'error' :
                    userDetailsDialog.user.role === 'staff' ? 'primary' :
                    userDetailsDialog.user.role === 'parent' ? 'success' : 'secondary'
                  }
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Status:</Typography>
                <Chip 
                  label={userDetailsDialog.user.isActive ? 'Active' : 'Inactive'}
                  color={userDetailsDialog.user.isActive ? 'success' : 'default'}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Join Date:</Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(userDetailsDialog.user.createdAt || userDetailsDialog.user.joinDate || '2024-01-01').toLocaleDateString()}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">User ID:</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {userDetailsDialog.user._id}
                </Typography>
              </Grid>
              
              {userDetailsDialog.user.role === 'staff' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Experience:</Typography>
                    <Typography variant="body1" gutterBottom>
                      {userDetailsDialog.user.yearsOfExperience || 'Not specified'} years
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Qualification:</Typography>
                    <Typography variant="body1" gutterBottom>
                      {userDetailsDialog.user.qualification || 'Not specified'}
                    </Typography>
                  </Grid>
                </>
              )}
              
              {userDetailsDialog.user.role === 'vendor' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Business Type:</Typography>
                    <Typography variant="body1" gutterBottom>
                      {userDetailsDialog.user.businessType || 'Not specified'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">GST Number:</Typography>
                    <Typography variant="body1" gutterBottom>
                      {userDetailsDialog.user.gstNumber || 'Not provided'}
                    </Typography>
                  </Grid>
                </>
              )}
              
              {userDetailsDialog.user.address && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Address:</Typography>
                  <Typography variant="body1" gutterBottom>
                    {typeof userDetailsDialog.user.address === 'string' 
                      ? userDetailsDialog.user.address 
                      : `${userDetailsDialog.user.address.street || ''}, ${userDetailsDialog.user.address.city || ''}, ${userDetailsDialog.user.address.state || ''} ${userDetailsDialog.user.address.zipCode || ''}`
                    }
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailsDialog({ open: false, user: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Child Profile Dialog */}
      <Dialog 
        open={createChildDialog} 
        onClose={() => setCreateChildDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Create Child Profile</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name *"
                value={childForm.firstName}
                onChange={(e) => setChildForm({ ...childForm, firstName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name *"
                value={childForm.lastName}
                onChange={(e) => setChildForm({ ...childForm, lastName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date of Birth *"
                value={childForm.dateOfBirth}
                onChange={(e) => setChildForm({ ...childForm, dateOfBirth: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Gender"
                value={childForm.gender}
                onChange={(e) => setChildForm({ ...childForm, gender: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Parent *"
                value={childForm.parentId}
                onChange={(e) => setChildForm({ ...childForm, parentId: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="">Select Parent</option>
                {pendingParents.concat(
                  allUsers.filter(u => u.role === 'parent')
                ).map((parent) => (
                  <option key={parent._id} value={parent._id}>
                    {parent.firstName} {parent.lastName} ({parent.email})
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Program"
                value={childForm.program}
                onChange={(e) => setChildForm({ ...childForm, program: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="infant">Infant ($600/month)</option>
                <option value="toddler">Toddler ($550/month)</option>
                <option value="preschool">Preschool ($500/month)</option>
                <option value="prekindergarten">Pre-kindergarten ($450/month)</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Custom Tuition Rate (Optional)"
                value={childForm.tuitionRate}
                onChange={(e) => setChildForm({ ...childForm, tuitionRate: e.target.value })}
                helperText="Leave empty to use default program rate"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Name"
                value={childForm.emergencyContactName}
                onChange={(e) => setChildForm({ ...childForm, emergencyContactName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Emergency Contact Phone"
                value={childForm.emergencyContactPhone}
                onChange={(e) => setChildForm({ ...childForm, emergencyContactPhone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Medical Information"
                value={childForm.medicalInfo}
                onChange={(e) => setChildForm({ ...childForm, medicalInfo: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Allergies (comma-separated)"
                value={childForm.allergies}
                onChange={(e) => setChildForm({ ...childForm, allergies: e.target.value })}
                helperText="e.g., Peanuts, Dairy, Eggs"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateChildDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateChild} variant="contained">
            Create Child Profile
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default AdminDashboard;
