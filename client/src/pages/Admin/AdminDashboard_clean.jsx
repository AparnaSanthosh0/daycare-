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
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CardHeader,
  Autocomplete,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  People,
  School,
  TrendingUp,
  Assignment,
  Visibility,
  CheckCircle,
  Cancel,
  Edit,
  Add,
  PersonAdd,
  SupervisorAccount
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import MealPlanApprovals from '../MealPlan/MealPlanApprovals';
import PurchasePrediction from '../../components/AI/PurchasePrediction';
import DemandPrediction from '../../components/AI/DemandPrediction';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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
  const [createChildDialog, setCreateChildDialog] = useState(false);
  
  // Form states
  const [reason, setReason] = useState('');
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

  useEffect(() => {
    fetchDashboardData();
    fetchStaffAssignments();
    fetchChildrenAndStaff();
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
        <Typography variant="h5" gutterBottom>Pending Approvals</Typography>
        
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
          <Tab label="Meal Plan Pending" />
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

              {/* Current Staff Assignments */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Current Staff Assignments
              </Typography>
              
              {staffAssignments.length > 0 ? (
                <Grid container spacing={3}>
                  {staffAssignments.map((assignment) => (
                    <Grid item xs={12} md={6} key={assignment.staff._id}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {assignment.staff.firstName} {assignment.staff.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {assignment.staff.email}
                          </Typography>
                          <Typography variant="body2" gutterBottom>
                            Assigned Children: {assignment.totalChildren}
                          </Typography>
                          
                          {assignment.children.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>Children:</Typography>
                              {assignment.children.map((child) => (
                                <Chip
                                  key={child._id}
                                  label={`${child.firstName} ${child.lastName}`}
                                  size="small"
                                  sx={{ mr: 1, mb: 1 }}
                                />
                              ))}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="text.secondary">No staff assignments found.</Typography>
              )}
            </Box>
          )}
          
          {/* Meal Plan Pending Tab */}
          {tabValue === 5 && (
            <MealPlanApprovals />
          )}
          
          {/* All Users Tab */}
          {tabValue === 6 && (
            <Box>
              <Typography variant="h6" gutterBottom>All Users Overview</Typography>
              <Typography color="text.secondary">
                All users overview content will be displayed here.
              </Typography>
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
    </Box>
  );
};

export default AdminDashboard;
