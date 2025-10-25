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
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  ExpandMore, 
  Receipt, 
  Payment, 
  Close
} from '@mui/icons-material';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import RecommendationQuickAccess from '../../components/RecommendationQuickAccess';
import FeedbackClassification from '../../components/FeedbackClassification';

export default function Staff() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const go = (path) => () => navigate(path);

  const [assignedChildren, setAssignedChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedChild, setExpandedChild] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({
    checkIns: 0,
    checkOuts: 0,
    present: 0,
    absent: 0
  });
  const [billingData, setBillingData] = useState([]);
  const [billingLoading, setBillingLoading] = useState(false);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [, setDialogData] = useState({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Form states
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAssignedChildren();
      fetchTodayAttendanceStats();
      fetchBillingData();
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

  const fetchTodayAttendanceStats = async () => {
    if (!user || !user._id) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/api/attendance/report?entityType=child&from=${today}&to=${today}`);
      
      if (response.data && response.data.records) {
        const records = response.data.records;
        const stats = {
          checkIns: records.filter(r => r.checkInAt).length,
          checkOuts: records.filter(r => r.checkOutAt).length,
          present: records.filter(r => r.status === 'present').length,
          absent: records.filter(r => r.status === 'absent').length
        };
        setAttendanceStats(stats);
      }
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
    }
  };

  const fetchBillingData = async () => {
    if (!user || !user._id) return;
    try {
      setBillingLoading(true);
      const response = await api.get('/api/staff/billing');
      setBillingData(response.data.billingData || []);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      setError('Failed to load billing information');
    } finally {
      setBillingLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Dialog handlers
  const openDialog = (type, data = {}) => {
    setDialogType(type);
    setDialogData(data);
    setFormData(data);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogType('');
    setDialogData({});
    setFormData({});
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  // Childcare & Supervision functions
  const conductSafetyCheck = () => {
    openDialog('safetyCheck', {
      childId: '',
      checkType: 'general',
      notes: '',
      timestamp: new Date().toISOString()
    });
  };

  const logHygieneActivity = () => {
    openDialog('hygieneLog', {
      childId: '',
      activity: 'handwashing',
      notes: '',
      timestamp: new Date().toISOString()
    });
  };

  const reportHealthIssue = () => {
    openDialog('healthAlert', {
      childId: '',
      issueType: 'illness',
      severity: 'low',
      description: '',
      actionTaken: '',
      timestamp: new Date().toISOString()
    });
  };

  // Activity Management functions
  const startActivity = () => {
    openDialog('activity', {
      title: '',
      type: 'learning',
      description: '',
      participants: [],
      duration: 30,
      timestamp: new Date().toISOString()
    });
  };

  const trackProgress = () => {
    openDialog('progress', {
      childId: '',
      skill: '',
      level: 'beginner',
      notes: '',
      timestamp: new Date().toISOString()
    });
  };

  const planEvent = () => {
    openDialog('event', {
      title: '',
      type: 'special',
      date: new Date().toISOString().split('T')[0],
      description: '',
      participants: [],
      timestamp: new Date().toISOString()
    });
  };

  const recordParticipation = () => {
    openDialog('participation', {
      childId: '',
      activityId: '',
      participation: 'active',
      notes: '',
      timestamp: new Date().toISOString()
    });
  };

  // Meal & Health Monitoring functions
  const viewMealPlan = () => {
    navigate('/meal-planning');
  };

  const checkAllergies = () => {
    openDialog('allergyCheck', {
      childId: '',
      allergens: [],
      mealType: 'lunch',
      notes: '',
      timestamp: new Date().toISOString()
    });
  };

  const logHealthIssue = () => {
    openDialog('healthRecord', {
      childId: '',
      issue: '',
      treatment: '',
      medication: '',
      notes: '',
      timestamp: new Date().toISOString()
    });
  };

  // Form submission handler
  const handleFormSubmit = async () => {
    setFormLoading(true);
    try {
      const endpoint = `/api/staff/${dialogType}`;
      await api.post(endpoint, {
        ...formData,
        staffId: user._id,
        timestamp: new Date().toISOString()
      });
      
      showSnackbar(`${dialogType} recorded successfully!`);
      closeDialog();
      
      // Refresh relevant data
      if (dialogType.includes('safety') || dialogType.includes('hygiene') || dialogType.includes('health')) {
        // Refresh childcare data
      } else if (dialogType.includes('activity') || dialogType.includes('progress') || dialogType.includes('event')) {
        // Refresh activity data
      } else if (dialogType.includes('meal') || dialogType.includes('allergy')) {
        // Refresh meal data
      }
      
    } catch (error) {
      console.error(`Error submitting ${dialogType}:`, error);
      setError(`Failed to record ${dialogType}`);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Staff Dashboard
        </Typography>
        <Button
          variant="outlined"
          onClick={() => {
            fetchAssignedChildren();
            fetchTodayAttendanceStats();
            fetchBillingData();
          }}
          disabled={loading}
          sx={{ borderColor: 'primary.main', color: 'primary.main' }}
        >
          Refresh All
        </Button>
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Today at a glance</Typography>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => {
                  fetchTodayAttendanceStats();
                  fetchAssignedChildren();
                }}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 6 }}>
              <Box>
                <Typography variant="body2">Check-ins</Typography>
                <Typography variant="h6" color="primary.main">{attendanceStats.checkIns}</Typography>
              </Box>
              <Box>
                <Typography variant="body2">Check-outs</Typography>
                <Typography variant="h6" color="success.main">{attendanceStats.checkOuts}</Typography>
              </Box>
              <Box>
                <Typography variant="body2">Present</Typography>
                <Typography variant="h6" color="success.main">{attendanceStats.present}</Typography>
              </Box>
              <Box>
                <Typography variant="body2">Absent</Typography>
                <Typography variant="h6" color="error.main">{attendanceStats.absent}</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Quick Actions</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button variant="contained" onClick={go('/attendance')} sx={{ mb: 1 }}>
                Mark Attendance
              </Button>
              <Button variant="outlined" onClick={go('/activities')}>
                View Activities
              </Button>
              <Button variant="outlined" onClick={go('/meal-planning')}>
                Review Meal Plan
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Childcare & Supervision Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>👶 Childcare & Supervision</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Monitor and care for children throughout the day. Maintain proper hygiene, safety, and comfort.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary.main" gutterBottom>Safety Check</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Ensure all children are safe and accounted for</Typography>
                    <Button variant="outlined" size="small" fullWidth onClick={conductSafetyCheck}>
                      Conduct Safety Check
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="success.main" gutterBottom>Hygiene Monitor</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Track hand washing, bathroom breaks, and cleanliness</Typography>
                    <Button variant="outlined" size="small" fullWidth onClick={logHygieneActivity}>
                      Log Hygiene Activity
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="warning.main" gutterBottom>Health Alerts</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Report unusual behavior, illness, or injuries</Typography>
                    <Button variant="outlined" size="small" fullWidth color="warning" onClick={reportHealthIssue}>
                      Report Health Issue
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Activity Management Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>🎨 Activity Management</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Conduct daily learning activities and track progress in skill development.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="primary.main" gutterBottom>Learning Activities</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Plan and conduct educational sessions</Typography>
                    <Button variant="contained" size="small" fullWidth onClick={startActivity}>
                      Start Activity
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="success.main" gutterBottom>Progress Tracking</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Record learning milestones and achievements</Typography>
                    <Button variant="outlined" size="small" fullWidth onClick={trackProgress}>
                      Track Progress
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="info.main" gutterBottom>Special Events</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Organize games and special activities</Typography>
                    <Button variant="outlined" size="small" fullWidth onClick={planEvent}>
                      Plan Event
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="secondary.main" gutterBottom>Participation</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Track attendance in activities</Typography>
                    <Button variant="outlined" size="small" fullWidth onClick={recordParticipation}>
                      Record Participation
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Meal & Health Monitoring Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>🍎 Meal & Health Monitoring</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ensure proper nutrition, track food intake, and monitor health conditions.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="success.main" gutterBottom>Meal Distribution</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Ensure children receive correct meals according to plan</Typography>
                    <Button variant="outlined" size="small" fullWidth onClick={viewMealPlan}>
                      View Meal Plan
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="warning.main" gutterBottom>Allergy Tracking</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Monitor food allergies and dietary restrictions</Typography>
                    <Button variant="outlined" size="small" fullWidth color="warning" onClick={checkAllergies}>
                      Check Allergies
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="error.main" gutterBottom>Health Records</Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>Record minor health issues and first aid</Typography>
                    <Button variant="outlined" size="small" fullWidth color="error" onClick={logHealthIssue}>
                      Log Health Issue
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
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

        {/* Billing & Payments Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
                Billing & Payments
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={fetchBillingData}
                disabled={billingLoading}
                startIcon={billingLoading ? <CircularProgress size={16} /> : <Payment />}
              >
                Refresh Billing
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              View fees assigned by admin to parents of your assigned children
            </Typography>

            {billingLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : billingData.length === 0 ? (
              <Alert severity="info">
                No billing information available for your assigned children.
              </Alert>
            ) : (
              <Grid container spacing={3}>
                {billingData.map((item, index) => (
                  <Grid item xs={12} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {item.child.name}
                        </Typography>
                        
                        {/* Parents Info */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>Parents:</Typography>
                          {item.parents.map((parent, pIndex) => (
                            <Box key={pIndex} sx={{ ml: 2, mb: 1 }}>
                              <Typography variant="body2">
                                <strong>{parent.name}</strong> - {parent.email} | {parent.phone}
                              </Typography>
                            </Box>
                          ))}
                        </Box>

                        {/* Invoices */}
                        {item.invoices.length > 0 ? (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>Invoices:</Typography>
                            <TableContainer>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Amount</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Due Date</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell>Description</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {item.invoices.map((invoice, invIndex) => (
                                    <TableRow key={invIndex}>
                                      <TableCell>
                                        <Typography variant="body2" fontWeight="bold">
                                          {formatCurrency(invoice.amount)}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          label={invoice.status}
                                          color={getStatusColor(invoice.status)}
                                          size="small"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {formatDate(invoice.dueDate)}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {formatDate(invoice.createdAt)}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {invoice.description}
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        ) : (
                          <Alert severity="info" sx={{ mt: 2 }}>
                            No invoices found for this child's parents.
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Universal Dialog for all forms */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {dialogType === 'safetyCheck' && 'Conduct Safety Check'}
              {dialogType === 'hygieneLog' && 'Log Hygiene Activity'}
              {dialogType === 'healthAlert' && 'Report Health Issue'}
              {dialogType === 'activity' && 'Start Activity'}
              {dialogType === 'progress' && 'Track Progress'}
              {dialogType === 'event' && 'Plan Event'}
              {dialogType === 'participation' && 'Record Participation'}
              {dialogType === 'allergyCheck' && 'Check Allergies'}
              {dialogType === 'healthRecord' && 'Log Health Issue'}
            </Typography>
            <IconButton onClick={closeDialog}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Child Selection */}
            {(dialogType.includes('Check') || dialogType.includes('Log') || dialogType.includes('Alert') || dialogType.includes('Record') || dialogType.includes('Progress') || dialogType.includes('Participation')) && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Child</InputLabel>
                <Select
                  value={formData.childId || ''}
                  onChange={(e) => setFormData({...formData, childId: e.target.value})}
                >
                  <MenuItem value="">
                    <em>Select a child</em>
                  </MenuItem>
                  {assignedChildren.map((child) => (
                    <MenuItem key={child._id} value={child._id}>
                      {child.firstName} {child.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Dynamic form fields based on dialog type */}
            {dialogType === 'safetyCheck' && (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Check Type</InputLabel>
                  <Select
                    value={formData.checkType || ''}
                    onChange={(e) => setFormData({...formData, checkType: e.target.value})}
                  >
                    <MenuItem value="general">General Safety Check</MenuItem>
                    <MenuItem value="playground">Playground Safety</MenuItem>
                    <MenuItem value="classroom">Classroom Safety</MenuItem>
                    <MenuItem value="meal">Meal Time Safety</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  sx={{ mb: 2 }}
                />
              </>
            )}

            {dialogType === 'hygieneLog' && (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Activity Type</InputLabel>
                  <Select
                    value={formData.activity || ''}
                    onChange={(e) => setFormData({...formData, activity: e.target.value})}
                  >
                    <MenuItem value="handwashing">Hand Washing</MenuItem>
                    <MenuItem value="bathroom">Bathroom Break</MenuItem>
                    <MenuItem value="toothbrushing">Tooth Brushing</MenuItem>
                    <MenuItem value="facewashing">Face Washing</MenuItem>
                    <MenuItem value="general">General Hygiene</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  sx={{ mb: 2 }}
                />
              </>
            )}

            {dialogType === 'healthAlert' && (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Issue Type</InputLabel>
                  <Select
                    value={formData.issueType || ''}
                    onChange={(e) => setFormData({...formData, issueType: e.target.value})}
                  >
                    <MenuItem value="illness">Illness</MenuItem>
                    <MenuItem value="injury">Injury</MenuItem>
                    <MenuItem value="behavior">Behavioral Issue</MenuItem>
                    <MenuItem value="allergy">Allergic Reaction</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={formData.severity || ''}
                    onChange={(e) => setFormData({...formData, severity: e.target.value})}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Action Taken"
                  value={formData.actionTaken || ''}
                  onChange={(e) => setFormData({...formData, actionTaken: e.target.value})}
                  sx={{ mb: 2 }}
                />
              </>
            )}

            {dialogType === 'activity' && (
              <>
                <TextField
                  fullWidth
                  label="Activity Title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  sx={{ mb: 2 }}
                />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Activity Type</InputLabel>
                  <Select
                    value={formData.type || ''}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <MenuItem value="learning">Learning Activity</MenuItem>
                    <MenuItem value="play">Play Activity</MenuItem>
                    <MenuItem value="art">Art & Craft</MenuItem>
                    <MenuItem value="music">Music & Dance</MenuItem>
                    <MenuItem value="outdoor">Outdoor Activity</MenuItem>
                    <MenuItem value="story">Story Time</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Duration (minutes)"
                  value={formData.duration || ''}
                  onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                  sx={{ mb: 2 }}
                />
              </>
            )}

            {dialogType === 'progress' && (
              <>
                <TextField
                  fullWidth
                  label="Skill/Area"
                  value={formData.skill || ''}
                  onChange={(e) => setFormData({...formData, skill: e.target.value})}
                  sx={{ mb: 2 }}
                />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Level</InputLabel>
                  <Select
                    value={formData.level || ''}
                    onChange={(e) => setFormData({...formData, level: e.target.value})}
                  >
                    <MenuItem value="beginner">Beginner</MenuItem>
                    <MenuItem value="developing">Developing</MenuItem>
                    <MenuItem value="proficient">Proficient</MenuItem>
                    <MenuItem value="advanced">Advanced</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  sx={{ mb: 2 }}
                />
              </>
            )}

            {dialogType === 'event' && (
              <>
                <TextField
                  fullWidth
                  label="Event Title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  sx={{ mb: 2 }}
                />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={formData.type || ''}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <MenuItem value="special">Special Event</MenuItem>
                    <MenuItem value="birthday">Birthday Party</MenuItem>
                    <MenuItem value="holiday">Holiday Celebration</MenuItem>
                    <MenuItem value="educational">Educational Event</MenuItem>
                    <MenuItem value="sports">Sports Day</MenuItem>
                    <MenuItem value="cultural">Cultural Event</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  type="date"
                  label="Event Date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  sx={{ mb: 2 }}
                />
              </>
            )}

            {dialogType === 'allergyCheck' && (
              <>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Meal Type</InputLabel>
                  <Select
                    value={formData.mealType || ''}
                    onChange={(e) => setFormData({...formData, mealType: e.target.value})}
                  >
                    <MenuItem value="breakfast">Breakfast</MenuItem>
                    <MenuItem value="morningSnack">Morning Snack</MenuItem>
                    <MenuItem value="lunch">Lunch</MenuItem>
                    <MenuItem value="afternoonSnack">Afternoon Snack</MenuItem>
                    <MenuItem value="dinner">Dinner</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Allergy Notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  sx={{ mb: 2 }}
                />
              </>
            )}

            {dialogType === 'healthRecord' && (
              <>
                <TextField
                  fullWidth
                  label="Health Issue"
                  value={formData.issue || ''}
                  onChange={(e) => setFormData({...formData, issue: e.target.value})}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Treatment Given"
                  value={formData.treatment || ''}
                  onChange={(e) => setFormData({...formData, treatment: e.target.value})}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Medication (if any)"
                  value={formData.medication || ''}
                  onChange={(e) => setFormData({...formData, medication: e.target.value})}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  sx={{ mb: 2 }}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button 
            onClick={handleFormSubmit} 
            variant="contained" 
            disabled={formLoading}
            startIcon={formLoading ? <CircularProgress size={20} /> : null}
          >
            {formLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />

      {/* AI-Powered Child Grouping Recommendations */}
      <Box sx={{ mt: 4 }}>
        <RecommendationQuickAccess />
      </Box>

      {/* Feedback Classification */}
      <Box sx={{ mt: 4 }}>
        <FeedbackClassification />
      </Box>
    </Box>
  );
}
