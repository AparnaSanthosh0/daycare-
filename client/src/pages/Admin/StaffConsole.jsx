import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ExpandMore,
  PersonAdd,
  Refresh,
  SupervisorAccount
} from '@mui/icons-material';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

const StaffConsole = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const assignmentsRes = await api.get('/children/assignments/staff');
      setAssignments(assignmentsRes.data?.staffAssignments || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
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
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Staff Management & Assignments
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchData}
            disabled={loading}
            sx={{ borderColor: 'primary.main', color: 'primary.main' }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            sx={{ bgcolor: 'primary.main' }}
          >
            + Assign Child to Staff
          </Button>
          <Button
            variant="contained"
            startIcon={<SupervisorAccount />}
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
        {/* Staff and Assigned Children Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Staff and Assigned Children
            </Typography>
            
            {assignments.filter(assignment => assignment && assignment.staff).map((assignment) => (
              <Accordion key={assignment.staff._id} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      {assignment.staff?.firstName?.[0] || 'S'}{assignment.staff?.lastName?.[0] || 'T'}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">
                        {assignment.staff?.firstName || 'Unknown'} {assignment.staff?.lastName || 'Staff'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {assignment.staff?.role} • {assignment.children?.length || 0} children assigned
                      </Typography>
                    </Box>
                    <Button size="small" variant="outlined">
                      Edit Assignments
                    </Button>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="subtitle1" gutterBottom>Staff Details</Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2"><strong>Email:</strong> {assignment.staff?.email || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2"><strong>Phone:</strong> {assignment.staff?.phone || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2"><strong>Experience:</strong> {assignment.staff?.staff?.yearsOfExperience || 0} years</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2"><strong>Qualification:</strong> {assignment.staff?.staff?.qualification || 'N/A'}</Typography>
                    </Grid>
                  </Grid>
                  
                  <Typography variant="subtitle1" gutterBottom>Assigned Children</Typography>
                  {assignment.children && assignment.children.length > 0 ? (
                    <Grid container spacing={2}>
                      {assignment.children.filter(child => child && child._id).map((child) => (
                        <Grid item xs={12} sm={6} md={4} key={child._id}>
                          <Card variant="outlined">
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                              <Typography variant="h6" gutterBottom>
                                {child?.firstName || 'Unknown'} {child?.lastName || 'Child'}
                              </Typography>
                              <Typography variant="body2"><strong>Age:</strong> {child?.age || 'N/A'}</Typography>
                              <Typography variant="body2"><strong>Gender:</strong> {child?.gender || 'N/A'}</Typography>
                              <Typography variant="body2"><strong>Program:</strong> {child?.program || 'N/A'}</Typography>
                              <Typography variant="body2"><strong>Status:</strong> {child?.isActive ? 'Active' : 'Inactive'}</Typography>
                              <Box sx={{ mt: 2 }}>
                                <Button size="small" variant="outlined" color="error">
                                  Unassign
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography>No children assigned to this staff member.</Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
            
            {assignments.length === 0 && (
              <Typography>No staff assignments found.</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StaffConsole;
