import React, { useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  Box,
  Paper,
  Button,
  Card,
  CardContent,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ExpandMore, Refresh, PersonAdd, SupervisorAccount } from '@mui/icons-material';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

export default function Staff() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const go = (path) => () => navigate(path);

  const [assignedChildren, setAssignedChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedChild, setExpandedChild] = useState(null);

  useEffect(() => {
    if (user) {
      fetchAssignedChildren();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchAssignedChildren = async () => {
    if (!user || !user._id) return;
    try {
      setLoading(true);
      const response = await api.get(`/api/children/staff/${user._id}`);
      if (response.data && response.data.children) {
        setAssignedChildren(response.data.children);
      }
    } catch (fetchError) {
      console.error('Error fetching assigned children:', fetchError);
      setError('Unable to load assigned children');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Header with Action Buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Staff Dashboard
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchAssignedChildren}
            disabled={loading}
            sx={{ borderColor: 'primary.main', color: 'primary.main' }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => {/* Navigate to assignment page or open dialog */}}
            sx={{ bgcolor: 'primary.main' }}
          >
            Assign Child to Staff
          </Button>
          <Button
            variant="contained"
            startIcon={<SupervisorAccount />}
            onClick={() => {/* Navigate to staff details or open dialog */}}
            sx={{ bgcolor: 'primary.main' }}
          >
            View All Staff Details
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Quick Links */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Quick Links</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Button variant="contained" color="success" onClick={go('/meal-planning')}>Meal Planning</Button>
              <Button variant="outlined" onClick={go('/visitors')}>Visitor Management</Button>
              <Button variant="outlined" onClick={go('/emergency')}>Emergency Response</Button>
              <Button variant="outlined" onClick={go('/transport')}>Transport & Pickup</Button>
              <Button variant="outlined" onClick={go('/communication')}>Communication</Button>
              <Button variant="outlined" onClick={go('/attendance')}>Attendance</Button>
              <Button variant="outlined" onClick={go('/activities')}>Activities</Button>
            </Box>
          </Paper>
        </Grid>

        {/* Today at a glance + My Tasks */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Today at a glance</Typography>
            <Box sx={{ display: 'flex', gap: 6 }}>
              <Box>
                <Typography variant="body2">Check-ins</Typography>
                <Typography variant="h6">—</Typography>
              </Box>
              <Box>
                <Typography variant="body2">Check-outs</Typography>
                <Typography variant="h6">—</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>My Tasks</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button variant="outlined">Send daily update to parents</Button>
              <Button variant="outlined">Review meal plan</Button>
            </Box>
          </Paper>
        </Grid>

        {/* Keep assigned children below for staff reference */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">My Assigned Children</Typography>
              <Button variant="outlined" onClick={fetchAssignedChildren} disabled={loading}>Refresh</Button>
            </Box>
            {loading ? (
              <Typography>Loading assigned children...</Typography>
            ) : (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">{user.firstName} {user.lastName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.role} • {assignedChildren.length} child{assignedChildren.length === 1 ? '' : 'ren'} assigned
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="subtitle1" gutterBottom>Assigned Children</Typography>
                  {assignedChildren.length === 0 ? (
                    <Typography>No children assigned to you.</Typography>
                  ) : (
                    <Grid container spacing={2}>
                      {assignedChildren.map((child) => (
                        <Grid item xs={12} sm={6} md={4} key={child._id}>
                          <Card variant="outlined">
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                              <Typography variant="h6" gutterBottom>{child.firstName} {child.lastName}</Typography>
                              <Typography variant="body2"><strong>Age:</strong> {child.age || 'N/A'}</Typography>
                              <Typography variant="body2"><strong>Gender:</strong> {child.gender}</Typography>
                              <Typography variant="body2"><strong>Program:</strong> {child.program}</Typography>
                              <Typography variant="body2"><strong>Status:</strong> {child.isActive ? 'Active' : 'Inactive'}</Typography>
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
                              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button size="small" variant="outlined" onClick={() => {
                                  // Toggle expanded view for this child
                                  setExpandedChild(expandedChild === child._id ? null : child._id);
                                }}>
                                  {expandedChild === child._id ? 'Hide Details' : 'View Details'}
                                </Button>
                              </Box>
                              {expandedChild === child._id && (
                                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                  <Typography variant="subtitle2" gutterBottom>Additional Information</Typography>
                                  <Typography variant="body2"><strong>Date of Birth:</strong> {child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : 'N/A'}</Typography>
                                  <Typography variant="body2"><strong>Parents:</strong> {child.parents?.length ? child.parents.join(', ') : 'N/A'}</Typography>
                                  <Typography variant="body2"><strong>Tuition Rate:</strong> ${child.tuitionRate || 'N/A'}</Typography>
                                  {child.schedule && Object.keys(child.schedule).length > 0 && (
                                    <Typography variant="body2"><strong>Schedule:</strong> {Object.entries(child.schedule).map(([day, time]) => `${day}: ${time}`).join(', ')}</Typography>
                                  )}
                                </Box>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </AccordionDetails>
              </Accordion>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
