import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Info,
  DirectionsBus,
  Person,
  Phone,
  LocationOn,
  AccessTime,
  Refresh
} from '@mui/icons-material';
import api from '../../config/api';

const TransportManagement = () => {
  const [tab, setTab] = useState(0);
  const [requests, setRequests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectionDialog, setRejectionDialog] = useState(false);
  const [drivers, setDrivers] = useState([]);
  
  const [approvalForm, setApprovalForm] = useState({
    routeName: '',
    driverId: '',
    driverName: '',
    driverPhone: '',
    vehicleNumber: '',
    monthlyFee: 50,
    startDate: new Date().toISOString().split('T')[0]
  });
  
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchRequests();
    fetchAssignments();
    fetchDrivers();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/transport/requests/all');
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await api.get('/transport/assignments/all');
      setAssignments(response.data.assignments || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      // Fetch all users from admin endpoint
      const response = await api.get('/admin/users');
      console.log('Full API Response:', response.data);
      
      const allUsers = response.data.users || response.data || [];
      
      // Filter for drivers only - check staff.staffType field
      const driversList = allUsers.filter(user => 
        user.role === 'staff' && user.staff?.staffType === 'driver'
      );
      
      console.log('Filtered drivers:', driversList);
      setDrivers(driversList);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setDrivers([]);
    }
  };

  // Auto-fill driver details when route is selected/typed
  const handleRouteChange = (routeName) => {
    setApprovalForm({ ...approvalForm, routeName });

    // Find existing assignment with this route
    const existingAssignment = assignments.find(
      a => a.routeName?.toLowerCase() === routeName.toLowerCase() && a.status === 'active'
    );

    if (existingAssignment) {
      // Auto-populate with existing route's driver details
      setApprovalForm({
        ...approvalForm,
        routeName,
        driverId: existingAssignment.driverId,
        driverName: existingAssignment.driverName,
        driverPhone: existingAssignment.driverPhone,
        vehicleNumber: existingAssignment.vehicleNumber
      });
    }
  };

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setApprovalForm({
      routeName: '',
      driverId: '',
      driverName: '',
      driverPhone: '',
      vehicleNumber: '',
      monthlyFee: 50,
      startDate: new Date().toISOString().split('T')[0]
    });
    setApprovalDialog(true);
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectionDialog(true);
  };

  const submitApproval = async () => {
    if (!approvalForm.routeName || !approvalForm.driverName || !approvalForm.driverPhone || !approvalForm.vehicleNumber) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await api.put(`/api/transport/request/${selectedRequest._id}/approve`, {
        ...approvalForm,
        driverId: approvalForm.driverId || selectedRequest.parentId // Fallback if no specific driver ID
      });
      
      alert('Transport request approved successfully!');
      setApprovalDialog(false);
      fetchRequests();
      fetchAssignments();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      await api.put(`/api/transport/request/${selectedRequest._id}/reject`, {
        rejectionReason
      });
      
      alert('Transport request rejected');
      setRejectionDialog(false);
      fetchRequests();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'on-hold': return 'warning';
      default: return 'default';
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const reviewedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          🚗 Transport Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => { fetchRequests(); fetchAssignments(); }}
        >
          Refresh
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Pending Requests (${pendingRequests.length})`} />
        <Tab label="Reviewed Requests" />
        <Tab label={`Active Assignments (${assignments.length})`} />
      </Tabs>

      {/* Pending Requests Tab */}
      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Child</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Parent</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Pickup Address</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Time</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Contact</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Requested</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" py={3}>
                      No pending requests
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pendingRequests.map((request) => (
                  <TableRow key={request._id} hover>
                    <TableCell>{request.childName}</TableCell>
                    <TableCell>{request.parentName}</TableCell>
                    <TableCell>
                      <Tooltip title={request.pickupAddress}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {request.pickupAddress}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block">
                        {request.pickupTime} - {request.dropoffTime}
                      </Typography>
                    </TableCell>
                    <TableCell>{request.contactNumber}</TableCell>
                    <TableCell>
                      {new Date(request.requestDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprove(request)}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleReject(request)}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Details">
                          <IconButton size="small">
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Reviewed Requests Tab */}
      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.200' }}>
                <TableCell fontWeight="bold">Child</TableCell>
                <TableCell fontWeight="bold">Parent</TableCell>
                <TableCell fontWeight="bold">Status</TableCell>
                <TableCell fontWeight="bold">Route/Reason</TableCell>
                <TableCell fontWeight="bold">Reviewed Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reviewedRequests.map((request) => (
                <TableRow key={request._id}>
                  <TableCell>{request.childName}</TableCell>
                  <TableCell>{request.parentName}</TableCell>
                  <TableCell>
                    <Chip
                      label={request.status.toUpperCase()}
                      color={getStatusColor(request.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {request.status === 'approved' && request.assignedRoute}
                    {request.status === 'rejected' && request.rejectionReason}
                  </TableCell>
                  <TableCell>
                    {request.reviewDate ? new Date(request.reviewDate).toLocaleDateString() : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Active Assignments Tab */}
      {tab === 2 && (
        <Grid container spacing={2}>
          {assignments.map((assignment) => (
            <Grid item xs={12} md={6} lg={4} key={assignment._id}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  {assignment.childName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <DirectionsBus fontSize="small" color="action" />
                  <Typography variant="body2">Route: {assignment.routeName}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Person fontSize="small" color="action" />
                  <Typography variant="body2">{assignment.driverName}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Phone fontSize="small" color="action" />
                  <Typography variant="body2">{assignment.driverPhone}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography variant="caption" noWrap>
                    {assignment.pickupAddress}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccessTime fontSize="small" color="action" />
                  <Typography variant="body2">
                    {assignment.pickupTime} - {assignment.dropoffTime}
                  </Typography>
                </Box>
                <Chip
                  label={`$${assignment.monthlyFee}/month`}
                  color="success"
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Transport Request</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Child:</strong> {selectedRequest.childName}<br />
                  <strong>Pickup:</strong> {selectedRequest.pickupAddress}
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Autocomplete
                    freeSolo
                    options={[...new Set(assignments.map(a => a.routeName).filter(Boolean))]}
                    value={approvalForm.routeName}
                    onInputChange={(event, newValue) => handleRouteChange(newValue || '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Route Name *"
                        placeholder="Type or select route (e.g., Kottayam, Downtown)"
                        helperText="Select existing route to auto-fill driver details"
                      />
                    )}
                  />
                </Grid>
                
                {approvalForm.routeName && approvalForm.driverName && (
                  <Grid item xs={12}>
                    <Alert severity="success" icon={<DirectionsBus />}>
                      <Typography variant="body2">
                        <strong>Existing Route Found!</strong> Driver details auto-filled from "{approvalForm.routeName}" route
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="driver-select-label">Select Driver *</InputLabel>
                    <Select
                      labelId="driver-select-label"
                      value={approvalForm.driverId}
                      onChange={(e) => {
                        const driver = drivers.find(d => d._id === e.target.value);
                        setApprovalForm({
                          ...approvalForm,
                          driverId: e.target.value,
                          driverName: driver ? `${driver.firstName} ${driver.lastName}` : '',
                          driverPhone: driver?.phone || '',
                          vehicleNumber: driver?.staff?.vehicleType || driver?.staff?.licenseNumber || ''
                        });
                      }}
                      label="Select Driver *"
                    >
                      <MenuItem value="">
                        <em>Select a driver</em>
                      </MenuItem>
                      {drivers && drivers.length > 0 ? (
                        drivers.map((driver) => (
                          <MenuItem key={driver._id} value={driver._id}>
                            {driver.firstName} {driver.lastName} - {driver.phone || 'No phone'}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>
                          <em>No drivers available</em>
                        </MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Driver Name *"
                    value={approvalForm.driverName}
                    InputProps={{ readOnly: true }}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Driver Phone *"
                    value={approvalForm.driverPhone}
                    InputProps={{ readOnly: true }}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Vehicle Number *"
                    value={approvalForm.vehicleNumber}
                    onChange={(e) => setApprovalForm({ ...approvalForm, vehicleNumber: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Monthly Fee"
                    value={approvalForm.monthlyFee}
                    onChange={(e) => setApprovalForm({ ...approvalForm, monthlyFee: Number(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Start Date"
                    value={approvalForm.startDate}
                    onChange={(e) => setApprovalForm({ ...approvalForm, startDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
          <Button onClick={submitApproval} variant="contained" color="success">
            Approve & Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialog} onClose={() => setRejectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Transport Request</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Child:</strong> {selectedRequest.childName}<br />
                  <strong>Parent:</strong> {selectedRequest.parentName}
                </Typography>
              </Alert>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Rejection Reason *"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectionDialog(false)}>Cancel</Button>
          <Button onClick={submitRejection} variant="contained" color="error">
            Reject Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransportManagement;
