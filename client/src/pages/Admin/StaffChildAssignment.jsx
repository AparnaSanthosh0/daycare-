import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PersonAdd,
  PersonRemove,
  Refresh,
  Assignment,
  Group,
  ChildCare
} from '@mui/icons-material';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

const StaffChildAssignment = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data states
  const [staff, setStaff] = useState([]);
  const [children, setChildren] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Dialog states
  const [assignDialog, setAssignDialog] = useState({
    open: false,
    child: null,
    selectedStaffId: ''
  });
  const [unassignDialog, setUnassignDialog] = useState({
    open: false,
    assignment: null
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [staffRes, childrenRes, assignmentsRes] = await Promise.all([
        api.get('/admin/staff'),
        api.get('/children'),
        api.get('/children/assignments/staff')
      ]);

      setStaff(staffRes.data || []);
      setChildren(childrenRes.data || []);
      setAssignments(assignmentsRes.data?.staffAssignments || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    try {
      if (!assignDialog.child || !assignDialog.selectedStaffId) return;

      await api.put(`/api/children/${assignDialog.child._id}/assign-staff`, {
        staffId: assignDialog.selectedStaffId
      });

      setSuccess(`Successfully assigned ${assignDialog.child.firstName} ${assignDialog.child.lastName} to staff member`);
      setAssignDialog({ open: false, child: null, selectedStaffId: '' });
      fetchData();
    } catch (err) {
      console.error('Error assigning staff:', err);
      setError('Failed to assign staff');
    }
  };

  const handleUnassign = async () => {
    try {
      if (!unassignDialog.assignment) return;

      await api.delete(`/api/children/${unassignDialog.assignment.child._id}/unassign-staff/${unassignDialog.assignment.staff._id}`);

      setSuccess(`Successfully unassigned ${unassignDialog.assignment.child.firstName} ${unassignDialog.assignment.child.lastName} from staff member`);
      setUnassignDialog({ open: false, assignment: null });
      fetchData();
    } catch (err) {
      console.error('Error unassigning staff:', err);
      setError('Failed to unassign staff');
    }
  };

  const getChildAssignments = (childId) => {
    return assignments.filter(a => a.child._id === childId);
  };

  const getStaffAssignments = (staffId) => {
    return assignments.filter(a => a.staff._id === staffId);
  };

  const getUnassignedChildren = () => {
    return children.filter(child => 
      !assignments.some(a => a.child._id === child._id)
    );
  };

  const getAvailableStaff = () => {
    return staff.filter(s => s.isActive);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Staff-Child Assignment Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Staff Overview */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <Group sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Staff Members ({staff.length})</Typography>
            </Box>
            
            <Box sx={{ maxHeight: '500px', overflowY: 'auto' }}>
              {staff.map((staffMember) => {
                const staffAssignments = getStaffAssignments(staffMember._id);
                return (
                  <Card key={staffMember._id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {staffMember.firstName?.[0]}{staffMember.lastName?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1">
                              {staffMember.firstName} {staffMember.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {staffMember.email}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Assigned to {staffAssignments.length} children
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={staffAssignments.length}
                          color={staffAssignments.length > 0 ? 'primary' : 'default'}
                          size="small"
                        />
                      </Box>
                      
                      {staffAssignments.length > 0 && (
                        <Box mt={2}>
                          <Typography variant="caption" color="text.secondary">
                            Assigned Children:
                          </Typography>
                          <Box display="flex" flexWrap="wrap" gap={0.5} mt={1}>
                            {staffAssignments.map((assignment) => (
                              <Chip
                                key={assignment.child._id}
                                label={`${assignment.child.firstName} ${assignment.child.lastName}`}
                                size="small"
                                color="secondary"
                                onDelete={() => setUnassignDialog({ 
                                  open: true, 
                                  assignment 
                                })}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Children Overview */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <ChildCare sx={{ mr: 1, color: 'secondary.main' }} />
              <Typography variant="h6">Children ({children.length})</Typography>
            </Box>
            
            <Box sx={{ maxHeight: '500px', overflowY: 'auto' }}>
              {children.map((child) => {
                const childAssignments = getChildAssignments(child._id);
                return (
                  <Card key={child._id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ mr: 2, bgcolor: 'secondary.main' }}>
                            {child.firstName?.[0]}{child.lastName?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1">
                              {child.firstName} {child.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Age: {new Date().getFullYear() - new Date(child.dateOfBirth).getFullYear()} years
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {childAssignments.length > 0 ? 'Assigned' : 'Unassigned'}
                            </Typography>
                          </Box>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          {childAssignments.length > 0 && (
                            <Chip
                              label={`${childAssignments.length} staff`}
                              color="primary"
                              size="small"
                            />
                          )}
                          <Tooltip title="Assign Staff">
                            <IconButton
                              size="small"
                              onClick={() => setAssignDialog({ 
                                open: true, 
                                child,
                                selectedStaffId: ''
                              })}
                            >
                              <PersonAdd />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      
                      {childAssignments.length > 0 && (
                        <Box mt={2}>
                          <Typography variant="caption" color="text.secondary">
                            Assigned Staff:
                          </Typography>
                          <Box display="flex" flexWrap="wrap" gap={0.5} mt={1}>
                            {childAssignments.map((assignment) => (
                              <Chip
                                key={assignment.staff._id}
                                label={`${assignment.staff.firstName} ${assignment.staff.lastName}`}
                                size="small"
                                color="primary"
                                onDelete={() => setUnassignDialog({ 
                                  open: true, 
                                  assignment 
                                })}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Unassigned Children */}
        {getUnassignedChildren().length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <Assignment sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">
                  Unassigned Children ({getUnassignedChildren().length})
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                {getUnassignedChildren().map((child) => (
                  <Grid item xs={12} sm={6} md={4} key={child._id}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Box display="flex" alignItems="center">
                            <Avatar sx={{ mr: 2, bgcolor: 'warning.main' }}>
                              {child.firstName?.[0]}{child.lastName?.[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">
                                {child.firstName} {child.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Age: {new Date().getFullYear() - new Date(child.dateOfBirth).getFullYear()}
                              </Typography>
                            </Box>
                          </Box>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PersonAdd />}
                            onClick={() => setAssignDialog({ 
                              open: true, 
                              child,
                              selectedStaffId: ''
                            })}
                          >
                            Assign
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Assign Dialog */}
      <Dialog open={assignDialog.open} onClose={() => setAssignDialog({ open: false, child: null, selectedStaffId: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Staff to Child</DialogTitle>
        <DialogContent>
          {assignDialog.child && (
            <Box mb={2}>
              <Typography variant="subtitle1">
                Assigning: {assignDialog.child.firstName} {assignDialog.child.lastName}
              </Typography>
            </Box>
          )}
          
          <FormControl fullWidth>
            <InputLabel>Select Staff Member</InputLabel>
            <Select
              value={assignDialog.selectedStaffId}
              onChange={(e) => setAssignDialog({ ...assignDialog, selectedStaffId: e.target.value })}
              label="Select Staff Member"
            >
              {getAvailableStaff().map((staffMember) => (
                <MenuItem key={staffMember._id} value={staffMember._id}>
                  {staffMember.firstName} {staffMember.lastName} 
                  ({getStaffAssignments(staffMember._id).length} assigned)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog({ open: false, child: null, selectedStaffId: '' })}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            variant="contained"
            disabled={!assignDialog.selectedStaffId}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unassign Dialog */}
      <Dialog open={unassignDialog.open} onClose={() => setUnassignDialog({ open: false, assignment: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Unassign Staff from Child</DialogTitle>
        <DialogContent>
          {unassignDialog.assignment && (
            <Box>
              <Typography variant="body1">
                Are you sure you want to unassign{' '}
                <strong>{unassignDialog.assignment.staff.firstName} {unassignDialog.assignment.staff.lastName}</strong>{' '}
                from{' '}
                <strong>{unassignDialog.assignment.child.firstName} {unassignDialog.assignment.child.lastName}</strong>?
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnassignDialog({ open: false, assignment: null })}>
            Cancel
          </Button>
          <Button onClick={handleUnassign} variant="contained" color="error">
            Unassign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StaffChildAssignment;
