import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Stack
} from '@mui/material';
import {
  People,
  Add,
  Edit,
  Visibility,
  MedicalServices,
  CalendarToday,
  Medication,
  WarningAmber,
  EventAvailable,
  LocalHospital,
  ShoppingCart,
  Logout,
  KeyboardVoice
} from '@mui/icons-material';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import VoiceAssistant from '../../VoiceAssistant';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [children, setChildren] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [statistics, setStatistics] = useState({
    totalChildren: 0,
    childrenWithAllergies: 0,
    childrenWithMedicalConditions: 0,
    recentCheckups: 0
  });
  const [activeTab, setActiveTab] = useState(0);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childDialog, setChildDialog] = useState({ open: false, child: null });
  const [medicalRecordDialog, setMedicalRecordDialog] = useState({ open: false, child: null });
  const [medicalForm, setMedicalForm] = useState({
    allergies: [],
    medicalConditions: [],
    notes: ''
  });
  const [recordForm, setRecordForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'checkup',
    description: '',
    prescription: '',
    followUpDate: ''
  });
  const [appointments, setAppointments] = useState([]);
  const [appointmentFilter, setAppointmentFilter] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [consultationDialog, setConsultationDialog] = useState({ open: false, appointment: null });
  const [consultationForm, setConsultationForm] = useState({
    diagnosis: '',
    prescription: '',
    healthAdvice: '',
    notes: ''
  });
  const [vaOpen, setVaOpen] = useState(false);
  const [aiHealthSummary, setAiHealthSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [selectedChildForSummary, setSelectedChildForSummary] = useState(null);
  const [healthAlerts, setHealthAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alertExplanation, setAlertExplanation] = useState(null);
  const [symptomAnalysis, setSymptomAnalysis] = useState(null);
  const [symptomForm, setSymptomForm] = useState({ symptoms: '', duration: '', severity: 'low' });
  const [growthPrediction, setGrowthPrediction] = useState(null);
  const [growthForm, setGrowthForm] = useState({ height: '', weight: '', headCircumference: '' });
  const [medicationCheck, setMedicationCheck] = useState(null);
  const [medicationForm, setMedicationForm] = useState({ medications: '' });
  const [riskScore, setRiskScore] = useState(null);
  const [riskScoreLoading, setRiskScoreLoading] = useState(false);
  const [medicalReport, setMedicalReport] = useState(null);
  const [reportForm, setReportForm] = useState({ reportType: 'summary', dateRange: { start: '', end: '' } });
  const [healthPatterns, setHealthPatterns] = useState(null);
  const [patternsLoading, setPatternsLoading] = useState(false);

  // Fetch assigned children
  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await api.get('/doctor/children');
      setChildren(response.data || []);
    } catch (error) {
      console.error('Error fetching children:', error);
      setError('Failed to load assigned children');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const [doctorStats, appointmentStats] = await Promise.all([
        api.get('/doctor/statistics'),
        api.get('/appointments/stats/doctor')
      ]);
      
      setStatistics({
        totalChildren: doctorStats.data?.totalChildren || 0,
        childrenWithAllergies: doctorStats.data?.childrenWithAllergies || 0,
        childrenWithMedicalConditions: doctorStats.data?.childrenWithMedicalConditions || 0,
        recentCheckups: appointmentStats.data?.today || 0
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  }, []);

  // Fetch appointments
  const fetchAppointments = async (status = 'all') => {
    try {
      const response = await api.get('/appointments/doctor', {
        params: { status }
      });
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Failed to load appointments');
    }
  };

  // Fetch doctor profile (for header name/specialization)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/doctor/profile');
        setDoctorProfile(response.data || null);
      } catch (err) {
        console.error('Error fetching doctor profile:', err);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    fetchChildren();
    fetchStatistics();
  }, [fetchStatistics]);

  // View child details
  const handleViewChild = async (childId) => {
    try {
      const response = await api.get(`/api/doctor/children/${childId}`);
      setSelectedChild(response.data);
      setMedicalForm({
        allergies: response.data.allergies || [],
        medicalConditions: response.data.medicalConditions || [],
        notes: response.data.notes || ''
      });
      setChildDialog({ open: true, child: response.data });
    } catch (error) {
      setError('Failed to load child details');
    }
  };

  // Update medical information
  const handleUpdateMedical = async () => {
    try {
      await api.put(`/api/doctor/children/${selectedChild._id}/medical`, medicalForm);
      setSuccess('Medical information updated successfully');
      setChildDialog({ open: false, child: null });
      fetchChildren();
      fetchStatistics();
    } catch (error) {
      setError('Failed to update medical information');
    }
  };

  // Add medical record
  const handleAddMedicalRecord = async () => {
    try {
      await api.post(`/api/doctor/children/${recordForm.childId || selectedChild?._id}/medical-records`, recordForm);
      setSuccess('Medical record added successfully');
      setMedicalRecordDialog({ open: false, child: null });
      setRecordForm({
        date: new Date().toISOString().split('T')[0],
        type: 'checkup',
        description: '',
        prescription: '',
        followUpDate: ''
      });
      if (selectedChild) {
        handleViewChild(selectedChild._id);
      }
    } catch (error) {
      setError('Failed to add medical record');
    }
  };

  // Add allergy
  const handleAddAllergy = () => {
    const allergy = prompt('Enter allergy:');
    if (allergy && allergy.trim()) {
      setMedicalForm({
        ...medicalForm,
        allergies: [...medicalForm.allergies, allergy.trim()]
      });
    }
  };

  // Remove allergy
  const handleRemoveAllergy = (index) => {
    setMedicalForm({
      ...medicalForm,
      allergies: medicalForm.allergies.filter((_, i) => i !== index)
    });
  };

  // Add medical condition
  const handleAddMedicalCondition = () => {
    const condition = prompt('Enter medical condition:');
    if (condition && condition.trim()) {
      setMedicalForm({
        ...medicalForm,
        medicalConditions: [
          ...medicalForm.medicalConditions,
          { condition: condition.trim(), medication: '', instructions: '' }
        ]
      });
    }
  };

  // Remove medical condition
  const handleRemoveMedicalCondition = (index) => {
    setMedicalForm({
      ...medicalForm,
      medicalConditions: medicalForm.medicalConditions.filter((_, i) => i !== index)
    });
  };

  // Appointment Functions
  const handleUpdateAppointmentStatus = async (appointmentId, status, additionalData = {}) => {
    try {
      await api.patch(`/api/appointments/${appointmentId}/status`, {
        status,
        ...additionalData
      });
      setSuccess(`Appointment ${status} successfully`);
      fetchAppointments(appointmentFilter);
      fetchStatistics();
    } catch (error) {
      setError(`Failed to update appointment: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleOpenConsultation = (appointment) => {
    setSelectedAppointment(appointment);
    setConsultationForm({
      diagnosis: appointment.diagnosis || '',
      prescription: appointment.prescription || '',
      healthAdvice: appointment.healthAdvice || '',
      notes: appointment.notes || ''
    });
    setConsultationDialog({ open: true, appointment });
  };

  const handleSaveConsultation = async () => {
    try {
      if (!selectedAppointment) return;
      
      await api.patch(`/api/appointments/${selectedAppointment._id}/consultation`, consultationForm);
      setSuccess('Consultation details saved successfully');
      setConsultationDialog({ open: false, appointment: null });
      fetchAppointments(appointmentFilter);
      fetchStatistics();
    } catch (error) {
      setError(`Failed to save consultation: ${error.response?.data?.message || error.message}`);
    }
  };

  useEffect(() => {
    if (activeTab === 2) {
      fetchAppointments(appointmentFilter);
    }
  }, [activeTab, appointmentFilter]);

  const handleVaOpen = () => setVaOpen(true);
  const handleVaClose = () => setVaOpen(false);

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

      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>
            Doctor Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {doctorProfile
              ? `Dr. ${doctorProfile.firstName} ${doctorProfile.lastName} • ${doctorProfile.doctor?.specialization || 'Pediatric Specialist'}`
              : 'Pediatric Specialist'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton
            color="inherit"
            sx={{ position: 'relative', color: 'text.secondary', p: 1 }}
            onClick={handleVaOpen}
            aria-label="Open voice assistant"
          >
            <KeyboardVoice sx={{ color: '#14B8A6' }} />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<ShoppingCart />}
            onClick={() => navigate('/shop')}
            sx={{
              bgcolor: '#14B8A6',
              '&:hover': { bgcolor: '#0d9488' },
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Shop
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<WarningAmber />}
            onClick={() => setError('Emergency reporting endpoint not connected yet')}
          >
            Report Emergency
          </Button>
          <Button
            variant="outlined"
            startIcon={<Logout />}
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Logout
          </Button>
        </Stack>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <People color="primary" />
                <Typography color="text.secondary">Total Patients</Typography>
              </Stack>
              <Typography variant="h4" sx={{ mt: 1 }}>{statistics.totalChildren}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <EventAvailable color="success" />
                <Typography color="text.secondary">Today's Appointments</Typography>
              </Stack>
              <Typography variant="h4" sx={{ mt: 1 }}>{statistics.recentCheckups || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Medication color="warning" />
                <Typography color="text.secondary">Active Prescriptions</Typography>
              </Stack>
              <Typography variant="h4" sx={{ mt: 1 }}>{statistics.childrenWithMedicalConditions}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <WarningAmber color="error" />
                <Typography color="text.secondary">Incidents This Month</Typography>
              </Stack>
              <Typography variant="h4" sx={{ mt: 1 }}>{statistics.childrenWithAllergies}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" icon={<People />} />
        <Tab label="Medical Records" icon={<MedicalServices />} />
        <Tab label="Appointments" icon={<CalendarToday />} />
        <Tab label="AI Health Insights" icon={<LocalHospital />} />
        <Tab label="Prescriptions" icon={<Medication />} />
        <Tab label="Emergencies" icon={<WarningAmber />} />
      </Tabs>

      {/* Assigned Children Tab */}
      {activeTab === 0 && (
        <>
          {/* Today schedule mock (placeholder) */}
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Today's Schedule
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </Typography>
            {[...(children.slice(0, 3)).map((child, idx) => ({
              time: `${9 + idx}:00 AM`,
              name: `${child.firstName} ${child.lastName}`,
              note: child.program || 'Routine Check-up',
              status: idx === 0 ? 'Completed' : idx === 1 ? 'In Progress' : 'Scheduled'
            }))].map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: idx === 2 ? 'none' : '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">{item.time}</Typography>
                  <Typography variant="body1" fontWeight={600}>{item.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.note}</Typography>
                </Box>
                <Chip
                  label={item.status}
                  color={item.status === 'Completed' ? 'success' : item.status === 'In Progress' ? 'primary' : 'default'}
                  variant="outlined"
                  size="small"
                  sx={{ minWidth: 96, justifyContent: 'center' }}
                />
              </Box>
            ))}
          </Paper>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Child</TableCell>
                  <TableCell>Age</TableCell>
                  <TableCell>Program</TableCell>
                  <TableCell>Allergies</TableCell>
                  <TableCell>Medical Conditions</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {children.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary">No children assigned</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  children.map((child) => (
                    <TableRow key={child._id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar src={child.profileImage ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${child.profileImage}` : null}>
                            {child.firstName?.[0] || 'C'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {child.firstName} {child.lastName}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {child.dateOfBirth
                          ? `${Math.floor((new Date() - new Date(child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))} years`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip label={child.program || 'N/A'} size="small" />
                      </TableCell>
                      <TableCell>
                        {child.allergies && child.allergies.length > 0 ? (
                          <Chip label={`${child.allergies.length} allergies`} color="warning" size="small" />
                        ) : (
                          <Typography variant="body2" color="text.secondary">None</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {child.medicalConditions && child.medicalConditions.length > 0 ? (
                          <Chip label={`${child.medicalConditions.length} conditions`} color="error" size="small" />
                        ) : (
                          <Typography variant="body2" color="text.secondary">None</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => handleViewChild(child._id)}>
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Add Medical Record">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setRecordForm({ ...recordForm, childId: child._id });
                                setMedicalRecordDialog({ open: true, child });
                              }}
                            >
                              <Add />
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
        </>
      )}

      {/* Medical Records Tab */}
      {activeTab === 1 && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Medical Records</Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={() => setMedicalRecordDialog({ open: true, child: null })}
              >
                Add New Record
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Child Name</TableCell>
                    <TableCell>Age</TableCell>
                    <TableCell>Allergies</TableCell>
                    <TableCell>Last Visit</TableCell>
                    <TableCell>Health Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {children.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">No medical records found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    children.slice(0, 4).map((child) => (
                      <TableRow key={child._id}>
                        <TableCell>{child.firstName} {child.lastName}</TableCell>
                        <TableCell>
                          {child.dateOfBirth
                            ? `${Math.floor((new Date() - new Date(child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))} years`
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {child.allergies && child.allergies.length > 0 ? (
                            <Chip label={child.allergies[0]} color="error" size="small" variant="outlined" />
                          ) : (
                            <Chip label="None" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          {child.lastVisit 
                            ? new Date(child.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Dec 1, 2025'}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={child.healthStatus || 'Good'} 
                            color={child.healthStatus === 'Monitor' ? 'warning' : 'success'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="text"
                            color="primary"
                            onClick={() => handleViewChild(child._id)}
                          >
                            View Full Record
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Create Medical Record Form */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Create Medical Record</Typography>
            
            {/* List of Children */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Registered Children</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Child Name</TableCell>
                      <TableCell>Age</TableCell>
                      <TableCell>Allergies</TableCell>
                      <TableCell>Program</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {children.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography color="text.secondary">No children registered</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      children.map((child) => (
                        <TableRow key={child._id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar 
                                src={child.profileImage ? `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${child.profileImage}` : null}
                                sx={{ width: 32, height: 32 }}
                              >
                                {child.firstName?.[0] || 'C'}
                              </Avatar>
                              <Typography variant="body2">
                                {child.firstName} {child.lastName}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {child.dateOfBirth
                              ? `${Math.floor((new Date() - new Date(child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))} years`
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {child.allergies && child.allergies.length > 0 ? (
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {child.allergies.slice(0, 2).map((allergy, idx) => (
                                  <Chip key={idx} label={allergy} color="error" size="small" variant="outlined" />
                                ))}
                                {child.allergies.length > 2 && (
                                  <Chip label={`+${child.allergies.length - 2}`} size="small" variant="outlined" />
                                )}
                              </Box>
                            ) : (
                              <Chip label="None" size="small" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip label={child.program || 'N/A'} size="small" />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setRecordForm({ 
                                  ...recordForm, 
                                  childId: child._id,
                                  childName: `${child.firstName} ${child.lastName}`
                                });
                              }}
                            >
                              Select
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Divider sx={{ my: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Select Child"
                  value={recordForm.childName || 'No child selected'}
                  disabled
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Visit Type</InputLabel>
                  <Select
                    value={recordForm.type || 'checkup'}
                    onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })}
                    label="Visit Type"
                  >
                    <MenuItem value="checkup">Routine Check-up</MenuItem>
                    <MenuItem value="vaccination">Vaccination</MenuItem>
                    <MenuItem value="illness">Illness</MenuItem>
                    <MenuItem value="emergency">Emergency</MenuItem>
                    <MenuItem value="followup">Follow-up</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Diagnosis / Observations"
                  placeholder="Enter medical observations..."
                  value={recordForm.description || ''}
                  onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Treatment / Recommendations"
                  placeholder="Enter treatment details..."
                  value={recordForm.prescription || ''}
                  onChange={(e) => setRecordForm({ ...recordForm, prescription: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={<Add />}
                  onClick={handleAddMedicalRecord}
                >
                  Save Record
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}

      {/* Appointments Tab */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Appointments</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={appointmentFilter}
                onChange={(e) => {
                  setAppointmentFilter(e.target.value);
                  fetchAppointments(e.target.value);
                }}
                label="Filter"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Child</TableCell>
                  <TableCell>Parent</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">No appointments found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((appointment) => (
                    <TableRow key={appointment._id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {appointment.appointmentTime}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {appointment.child?.firstName?.[0]}
                          </Avatar>
                          <Typography variant="body2">
                            {appointment.child?.firstName} {appointment.child?.lastName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {appointment.parent?.firstName} {appointment.parent?.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{appointment.reason}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={appointment.appointmentType === 'online' ? 'Online' : 'On-site'}
                          size="small"
                          color={appointment.appointmentType === 'online' ? 'info' : 'default'}
                        />
                        {appointment.isEmergency && (
                          <Chip label="Emergency" size="small" color="error" sx={{ ml: 0.5 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          size="small"
                          color={
                            appointment.status === 'confirmed' ? 'success' :
                            appointment.status === 'completed' ? 'info' :
                            appointment.status === 'cancelled' ? 'error' :
                            'warning'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {appointment.status === 'pending' && (
                            <>
                              <Tooltip title="Confirm">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handleUpdateAppointmentStatus(appointment._id, 'confirmed')}
                                >
                                  <EventAvailable fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cancel">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    const reason = prompt('Reason for cancellation:');
                                    if (reason) {
                                      handleUpdateAppointmentStatus(appointment._id, 'cancelled', { cancelReason: reason });
                                    }
                                  }}
                                >
                                  <WarningAmber fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {(appointment.status === 'confirmed' || appointment.status === 'completed') && (
                            <Tooltip title="Add Consultation">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenConsultation(appointment)}
                              >
                                <Add fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => setSelectedAppointment(appointment)}
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* AI Health Insights Tab */}
      {activeTab === 3 && (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">AI Health Summary Generator</Typography>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Select Child</InputLabel>
                <Select
                  value={selectedChildForSummary || ''}
                  onChange={(e) => setSelectedChildForSummary(e.target.value)}
                  label="Select Child"
                >
                  {children.map((child) => (
                    <MenuItem key={child._id} value={child._id}>
                      {child.firstName} {child.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {selectedChildForSummary && (
              <Box sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={async () => {
                    try {
                      setAiSummaryLoading(true);
                      const response = await api.post(`/doctor/ai/health-summary/${selectedChildForSummary}`, {});
                      setAiHealthSummary(response.data);
                      setSuccess('Health summary generated successfully');
                    } catch (error) {
                      setError('Failed to generate health summary: ' + (error.response?.data?.message || error.message));
                      console.error('Health summary error:', error);
                    } finally {
                      setAiSummaryLoading(false);
                    }
                  }}
                  disabled={aiSummaryLoading}
                >
                  {aiSummaryLoading ? 'Generating...' : 'Generate AI Health Summary'}
                </Button>
              </Box>
            )}

            {aiHealthSummary && (
              <Box>
                <Card sx={{ mb: 2, bgcolor: '#f5f5f5' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Health Summary for {aiHealthSummary.childInfo.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Age: {aiHealthSummary.childInfo.age} • Gender: {aiHealthSummary.childInfo.gender}
                    </Typography>
                    <Chip 
                      label={`Overall Health: ${aiHealthSummary.overallHealth}`}
                      color={aiHealthSummary.overallHealth === 'Good' ? 'success' : aiHealthSummary.overallHealth === 'Fair' ? 'warning' : 'error'}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>

                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Health Summary
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {aiHealthSummary.healthSummary}
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Recent Visit Notes
                    </Typography>
                    {aiHealthSummary.visitNotes.map((note, idx) => (
                      <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {note.date} • {note.status}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                          Reason: {note.reason}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          <strong>Diagnosis:</strong> {note.diagnosis}
                        </Typography>
                        {note.prescription !== 'No prescription' && (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            <strong>Prescription:</strong> {note.prescription}
                          </Typography>
                        )}
                        {note.advice !== 'No specific advice recorded' && (
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            <strong>Advice:</strong> {note.advice}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </CardContent>
                </Card>

                {aiHealthSummary.keyFindings && aiHealthSummary.keyFindings.length > 0 && (
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Key Findings
                      </Typography>
                      {aiHealthSummary.keyFindings.map((finding, idx) => (
                        <Alert 
                          key={idx} 
                          severity={finding.severity === 'high' ? 'error' : 'warning'} 
                          sx={{ mt: 1 }}
                        >
                          <Typography variant="body2">
                            <strong>{finding.type.replace('_', ' ').toUpperCase()}:</strong> {finding.description}
                          </Typography>
                        </Alert>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {aiHealthSummary.recommendations && aiHealthSummary.recommendations.length > 0 && (
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        AI Recommendations
                      </Typography>
                      {aiHealthSummary.recommendations.map((rec, idx) => (
                        <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f0f7ff', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Chip 
                              label={rec.priority.toUpperCase()} 
                              color={rec.priority === 'high' ? 'error' : 'warning'} 
                              size="small" 
                            />
                            <Chip label={rec.category.replace('_', ' ')} size="small" variant="outlined" />
                          </Box>
                          <Typography variant="body2" fontWeight={600} gutterBottom>
                            {rec.recommendation}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            <strong>Explanation:</strong> {rec.explanation}
                          </Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </Box>
            )}
          </Paper>

          {/* Predictive Health Alerts */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Predictive Health Alerts</Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={async () => {
                  try {
                    setAlertsLoading(true);
                    const response = await api.get('/doctor/ai/health-alerts', {});
                    setHealthAlerts(response.data.alerts || []);
                  } catch (error) {
                    setError('Failed to fetch health alerts: ' + (error.response?.data?.message || error.message));
                    console.error('Health alerts error:', error);
                  } finally {
                    setAlertsLoading(false);
                  }
                }}
                disabled={alertsLoading}
              >
                {alertsLoading ? 'Analyzing...' : 'Refresh Alerts'}
              </Button>
            </Box>

            {healthAlerts.length === 0 ? (
              <Alert severity="info">
                No health alerts detected. Click "Refresh Alerts" to analyze all assigned children.
              </Alert>
            ) : (
              <Box>
                {healthAlerts.map((childAlert) => (
                  <Card key={childAlert.childId} sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {childAlert.childName}
                      </Typography>
                      {childAlert.alerts.map((alert, idx) => (
                        <Alert 
                          key={idx}
                          severity={alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'info'}
                          sx={{ mt: 1 }}
                          action={
                            <Button
                              size="small"
                              onClick={async () => {
                                try {
                                  const response = await api.post('/doctor/ai/explain', {
                                    alertType: alert.type,
                                    childId: childAlert.childId,
                                    data: alert
                                  });
                                  setAlertExplanation(response.data);
                                  setSelectedAlert(alert);
                                } catch (error) {
                                  setError('Failed to generate explanation');
                                }
                              }}
                            >
                              Explain
                            </Button>
                          }
                        >
                          <Typography variant="subtitle2" fontWeight={600}>
                            {alert.title}
                          </Typography>
                          <Typography variant="body2">
                            {alert.description}
                          </Typography>
                          {alert.recommendedAction && (
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                              <strong>Recommended:</strong> {alert.recommendedAction}
                            </Typography>
                          )}
                        </Alert>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>

          {/* Explainable AI Dialog */}
          <Dialog
            open={!!alertExplanation}
            onClose={() => {
              setAlertExplanation(null);
              setSelectedAlert(null);
            }}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              Explainable AI: Why was this alert generated?
            </DialogTitle>
            <DialogContent>
              {alertExplanation && (
                <Box sx={{ pt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {selectedAlert?.title}
                  </Typography>
                  
                  <Card sx={{ mb: 2, bgcolor: '#f5f5f5' }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Why was this alert generated?
                      </Typography>
                      <Typography variant="body2">
                        {alertExplanation.explanation.why}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Factors Considered
                      </Typography>
                      <List>
                        {alertExplanation.explanation.factors.map((factor, idx) => (
                          <ListItem key={idx}>
                            <ListItemText primary={factor} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>

                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        AI Reasoning
                      </Typography>
                      <Typography variant="body2">
                        {alertExplanation.explanation.reasoning}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Confidence Level:
                    </Typography>
                    <Chip 
                      label={alertExplanation.confidence.toUpperCase()} 
                      color={alertExplanation.confidence === 'high' ? 'success' : 'warning'} 
                      size="small" 
                    />
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setAlertExplanation(null);
                setSelectedAlert(null);
              }}>
                Close
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* Consultation Dialog */}
      <Dialog
        open={consultationDialog.open}
        onClose={() => setConsultationDialog({ open: false, appointment: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Add Consultation - {selectedAppointment?.child?.firstName} {selectedAppointment?.child?.lastName}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Diagnosis"
                value={consultationForm.diagnosis}
                onChange={(e) => setConsultationForm({ ...consultationForm, diagnosis: e.target.value })}
                placeholder="Enter diagnosis..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Prescription"
                value={consultationForm.prescription}
                onChange={(e) => setConsultationForm({ ...consultationForm, prescription: e.target.value })}
                placeholder="Enter prescription details..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Health Advice"
                value={consultationForm.healthAdvice}
                onChange={(e) => setConsultationForm({ ...consultationForm, healthAdvice: e.target.value })}
                placeholder="Enter health advice..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Additional Notes"
                value={consultationForm.notes}
                onChange={(e) => setConsultationForm({ ...consultationForm, notes: e.target.value })}
                placeholder="Enter additional notes..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConsultationDialog({ open: false, appointment: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveConsultation}
            disabled={!consultationForm.diagnosis}
          >
            Save Consultation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Child Details Dialog */}
      <Dialog
        open={childDialog.open}
        onClose={() => setChildDialog({ open: false, child: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Medical Information - {selectedChild?.firstName} {selectedChild?.lastName}
        </DialogTitle>
        <DialogContent>
          {selectedChild && (
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Date of Birth</Typography>
                  <Typography variant="body1">
                    {selectedChild.dateOfBirth
                      ? new Date(selectedChild.dateOfBirth).toLocaleDateString()
                      : 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Program</Typography>
                  <Typography variant="body1">{selectedChild.program || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">Allergies</Typography>
                    <Button size="small" startIcon={<Add />} onClick={handleAddAllergy}>
                      Add
                    </Button>
                  </Box>
                  {medicalForm.allergies.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {medicalForm.allergies.map((allergy, index) => (
                        <Chip
                          key={index}
                          label={allergy}
                          onDelete={() => handleRemoveAllergy(index)}
                          color="warning"
                          size="small"
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No allergies recorded</Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">Medical Conditions</Typography>
                    <Button size="small" startIcon={<Add />} onClick={handleAddMedicalCondition}>
                      Add
                    </Button>
                  </Box>
                  {medicalForm.medicalConditions.length > 0 ? (
                    <List>
                      {medicalForm.medicalConditions.map((condition, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={condition.condition || condition}
                            secondary={
                              typeof condition === 'object'
                                ? `${condition.medication ? `Medication: ${condition.medication}` : ''} ${condition.instructions ? ` | Instructions: ${condition.instructions}` : ''}`
                                : ''
                            }
                          />
                          <IconButton size="small" onClick={() => handleRemoveMedicalCondition(index)}>
                            <Edit />
                          </IconButton>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No medical conditions recorded</Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="Medical Notes"
                    value={medicalForm.notes}
                    onChange={(e) => setMedicalForm({ ...medicalForm, notes: e.target.value })}
                    placeholder="Enter medical notes, observations, or records..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChildDialog({ open: false, child: null })}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateMedical}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Medical Record Dialog */}
      <Dialog
        open={medicalRecordDialog.open}
        onClose={() => {
          setMedicalRecordDialog({ open: false, child: null });
          setRecordForm({
            date: new Date().toISOString().split('T')[0],
            type: 'checkup',
            description: '',
            prescription: '',
            followUpDate: ''
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Add Medical Record - {medicalRecordDialog.child?.firstName} {medicalRecordDialog.child?.lastName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              type="date"
              label="Date"
              value={recordForm.date}
              onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
              required
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Record Type</InputLabel>
              <Select
                value={recordForm.type}
                onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })}
                label="Record Type"
              >
                <MenuItem value="checkup">Checkup</MenuItem>
                <MenuItem value="vaccination">Vaccination</MenuItem>
                <MenuItem value="illness">Illness</MenuItem>
                <MenuItem value="injury">Injury</MenuItem>
                <MenuItem value="medication">Medication</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={recordForm.description}
              onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
              placeholder="Describe the medical record..."
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Prescription (if any)"
              value={recordForm.prescription}
              onChange={(e) => setRecordForm({ ...recordForm, prescription: e.target.value })}
              placeholder="Enter prescription details..."
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="date"
              label="Follow-up Date (optional)"
              value={recordForm.followUpDate}
              onChange={(e) => setRecordForm({ ...recordForm, followUpDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setMedicalRecordDialog({ open: false, child: null });
            setRecordForm({
              date: new Date().toISOString().split('T')[0],
              type: 'checkup',
              description: '',
              prescription: '',
              followUpDate: ''
            });
          }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddMedicalRecord} disabled={!recordForm.description}>
            Add Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Tools Tab */}
      {activeTab === 4 && (
        <Box>
          <Grid container spacing={3}>
            {/* AI Symptom Analyzer */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  🤖 AI Symptom Analyzer & Diagnosis Assistant
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Child</InputLabel>
                  <Select
                    value={selectedChildForSummary || ''}
                    onChange={(e) => setSelectedChildForSummary(e.target.value)}
                    label="Select Child"
                  >
                    {children.map((child) => (
                      <MenuItem key={child._id} value={child._id}>
                        {child.firstName} {child.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Symptoms"
                  value={symptomForm.symptoms}
                  onChange={(e) => setSymptomForm({ ...symptomForm, symptoms: e.target.value })}
                  placeholder="Describe symptoms (e.g., fever, cough, rash)..."
                  sx={{ mb: 2 }}
                />
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Duration (days)"
                      value={symptomForm.duration}
                      onChange={(e) => setSymptomForm({ ...symptomForm, duration: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Severity</InputLabel>
                      <Select
                        value={symptomForm.severity}
                        onChange={(e) => setSymptomForm({ ...symptomForm, severity: e.target.value })}
                        label="Severity"
                      >
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={async () => {
                    if (!selectedChildForSummary || !symptomForm.symptoms) {
                      setError('Please select a child and enter symptoms');
                      return;
                    }
                    try {
                      const child = children.find(c => c._id === selectedChildForSummary);
                      const age = Math.floor((new Date() - new Date(child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
                      const response = await api.post('/doctor/ai/symptom-analyzer', {
                        childId: selectedChildForSummary,
                        symptoms: symptomForm.symptoms,
                        age,
                        duration: parseInt(symptomForm.duration) || 1,
                        severity: symptomForm.severity
                      });
                      setSymptomAnalysis(response.data);
                    } catch (error) {
                      setError('Failed to analyze symptoms');
                    }
                  }}
                >
                  Analyze Symptoms
                </Button>
                {symptomAnalysis && (
                  <Box sx={{ mt: 3 }}>
                    <Alert severity={symptomAnalysis.urgency === 'high' ? 'error' : symptomAnalysis.urgency === 'medium' ? 'warning' : 'info'} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">Urgency: {symptomAnalysis.urgency.toUpperCase()}</Typography>
                      <Typography variant="caption">AI Confidence: {symptomAnalysis.aiConfidence}</Typography>
                    </Alert>
                    <Typography variant="subtitle2" gutterBottom>Possible Conditions:</Typography>
                    {symptomAnalysis.possibleConditions.map((cond, idx) => (
                      <Chip key={idx} label={`${cond.condition} (${(cond.probability * 100).toFixed(0)}%)`} sx={{ m: 0.5 }} />
                    ))}
                    {symptomAnalysis.recommendedTests.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Recommended Tests:</Typography>
                        {symptomAnalysis.recommendedTests.map((test, idx) => (
                          <Chip key={idx} label={test} color="primary" sx={{ m: 0.5 }} />
                        ))}
                      </Box>
                    )}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Recommendations:</Typography>
                      {symptomAnalysis.recommendations.map((rec, idx) => (
                        <Typography key={idx} variant="body2" sx={{ mt: 0.5 }}>• {rec}</Typography>
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* ML Growth Chart Predictions */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📊 ML Growth Chart Predictions
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Child</InputLabel>
                  <Select
                    value={selectedChildForSummary || ''}
                    onChange={(e) => setSelectedChildForSummary(e.target.value)}
                    label="Select Child"
                  >
                    {children.map((child) => (
                      <MenuItem key={child._id} value={child._id}>
                        {child.firstName} {child.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Height (cm)"
                      value={growthForm.height}
                      onChange={(e) => setGrowthForm({ ...growthForm, height: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Weight (kg)"
                      value={growthForm.weight}
                      onChange={(e) => setGrowthForm({ ...growthForm, weight: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Head (cm)"
                      value={growthForm.headCircumference}
                      onChange={(e) => setGrowthForm({ ...growthForm, headCircumference: e.target.value })}
                    />
                  </Grid>
                </Grid>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={async () => {
                    if (!selectedChildForSummary || !growthForm.height || !growthForm.weight) {
                      setError('Please select a child and enter measurements');
                      return;
                    }
                    try {
                      const response = await api.post(`/doctor/ai/growth-prediction/${selectedChildForSummary}`, {
                        height: parseFloat(growthForm.height),
                        weight: parseFloat(growthForm.weight),
                        headCircumference: parseFloat(growthForm.headCircumference) || null
                      });
                      setGrowthPrediction(response.data);
                    } catch (error) {
                      setError('Failed to predict growth');
                    }
                  }}
                >
                  Predict Growth
                </Button>
                {growthPrediction && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>Current Percentiles:</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip label={`Height: ${growthPrediction.percentiles.height.toFixed(0)}th percentile`} />
                      <Chip label={`Weight: ${growthPrediction.percentiles.weight.toFixed(0)}th percentile`} />
                    </Box>
                    <Typography variant="subtitle2" gutterBottom>6-Month Predictions:</Typography>
                    {growthPrediction.predictions.map((pred, idx) => (
                      <Box key={idx} sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, mb: 1 }}>
                        <Typography variant="caption">
                          Age {pred.age} years: Height {pred.predictedHeight}cm, Weight {pred.predictedWeight}kg
                        </Typography>
                      </Box>
                    ))}
                    {growthPrediction.alerts.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        {growthPrediction.alerts.map((alert, idx) => (
                          <Alert key={idx} severity="warning" sx={{ mt: 1 }}>
                            {alert.message}
                          </Alert>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Medication Interaction Checker */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  💊 Medication Interaction Checker
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Child</InputLabel>
                  <Select
                    value={selectedChildForSummary || ''}
                    onChange={(e) => setSelectedChildForSummary(e.target.value)}
                    label="Select Child"
                  >
                    {children.map((child) => (
                      <MenuItem key={child._id} value={child._id}>
                        {child.firstName} {child.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="New Medications"
                  value={medicationForm.medications}
                  onChange={(e) => setMedicationForm({ ...medicationForm, medications: e.target.value })}
                  placeholder="Enter medications separated by commas (e.g., Ibuprofen, Amoxicillin)..."
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  fullWidth
                  onClick={async () => {
                    if (!selectedChildForSummary || !medicationForm.medications) {
                      setError('Please select a child and enter medications');
                      return;
                    }
                    try {
                      const meds = medicationForm.medications.split(',').map(m => m.trim()).filter(m => m);
                      const response = await api.post('/doctor/ai/medication-checker', {
                        childId: selectedChildForSummary,
                        newMedications: meds
                      });
                      setMedicationCheck(response.data);
                    } catch (error) {
                      setError('Failed to check medications');
                    }
                  }}
                >
                  Check Interactions
                </Button>
                {medicationCheck && (
                  <Box sx={{ mt: 3 }}>
                    <Alert severity={medicationCheck.safeToPrescribe ? 'success' : 'error'} sx={{ mb: 2 }}>
                      {medicationCheck.safeToPrescribe ? '✅ Safe to prescribe' : '⚠️ Interactions detected'}
                    </Alert>
                    {medicationCheck.interactions.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Drug Interactions:</Typography>
                        {medicationCheck.interactions.map((interaction, idx) => (
                          <Alert key={idx} severity="error" sx={{ mt: 1 }}>
                            {interaction.message}
                          </Alert>
                        ))}
                      </Box>
                    )}
                    {medicationCheck.allergyChecks.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Allergy Warnings:</Typography>
                        {medicationCheck.allergyChecks.map((check, idx) => (
                          <Alert key={idx} severity="error" sx={{ mt: 1 }}>
                            {check.message}
                          </Alert>
                        ))}
                      </Box>
                    )}
                    {medicationCheck.recommendations.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>Recommendations:</Typography>
                        {medicationCheck.recommendations.map((rec, idx) => (
                          <Typography key={idx} variant="body2" sx={{ mt: 0.5 }}>• {rec}</Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Health Risk Scoring */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  ⚠️ Health Risk Scoring
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Child</InputLabel>
                  <Select
                    value={selectedChildForSummary || ''}
                    onChange={(e) => setSelectedChildForSummary(e.target.value)}
                    label="Select Child"
                  >
                    {children.map((child) => (
                      <MenuItem key={child._id} value={child._id}>
                        {child.firstName} {child.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={async () => {
                    if (!selectedChildForSummary) {
                      setError('Please select a child');
                      return;
                    }
                    try {
                      setRiskScoreLoading(true);
                      const response = await api.get(`/doctor/ai/risk-score/${selectedChildForSummary}`);
                      setRiskScore(response.data);
                    } catch (error) {
                      setError('Failed to calculate risk score');
                    } finally {
                      setRiskScoreLoading(false);
                    }
                  }}
                  disabled={riskScoreLoading}
                >
                  {riskScoreLoading ? 'Calculating...' : 'Calculate Risk Score'}
                </Button>
                {riskScore && (
                  <Box sx={{ mt: 3 }}>
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Typography variant="h3" color={riskScore.riskLevel === 'high' ? 'error' : riskScore.riskLevel === 'medium' ? 'warning' : 'success'}>
                        {riskScore.overallRiskScore}
                      </Typography>
                      <Chip 
                        label={riskScore.riskLevel.toUpperCase()} 
                        color={riskScore.riskLevel === 'high' ? 'error' : riskScore.riskLevel === 'medium' ? 'warning' : 'success'}
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    <Typography variant="subtitle2" gutterBottom>Risk Factors:</Typography>
                    {riskScore.factors.map((factor, idx) => (
                      <Box key={idx} sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, mb: 1 }}>
                        <Typography variant="body2">
                          <strong>{factor.factor}:</strong> {factor.details} (Score: {factor.score})
                        </Typography>
                      </Box>
                    ))}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Recommendations:</Typography>
                      {riskScore.recommendations.map((rec, idx) => (
                        <Typography key={idx} variant="body2" sx={{ mt: 0.5 }}>• {rec}</Typography>
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Automated Report Generation */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📄 Automated Report Generation
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Child</InputLabel>
                  <Select
                    value={selectedChildForSummary || ''}
                    onChange={(e) => setSelectedChildForSummary(e.target.value)}
                    label="Select Child"
                  >
                    {children.map((child) => (
                      <MenuItem key={child._id} value={child._id}>
                        {child.firstName} {child.lastName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Report Type</InputLabel>
                  <Select
                    value={reportForm.reportType}
                    onChange={(e) => setReportForm({ ...reportForm, reportType: e.target.value })}
                    label="Report Type"
                  >
                    <MenuItem value="summary">Summary Report</MenuItem>
                    <MenuItem value="detailed">Detailed Report</MenuItem>
                    <MenuItem value="growth">Growth Report</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={async () => {
                    if (!selectedChildForSummary) {
                      setError('Please select a child');
                      return;
                    }
                    try {
                      const response = await api.post(`/doctor/ai/generate-report/${selectedChildForSummary}`, {
                        reportType: reportForm.reportType,
                        dateRange: reportForm.dateRange
                      });
                      setMedicalReport(response.data);
                    } catch (error) {
                      setError('Failed to generate report');
                    }
                  }}
                >
                  Generate Report
                </Button>
                {medicalReport && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>Report Summary:</Typography>
                    <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap', p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      {medicalReport.summary}
                    </Typography>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => {
                        const blob = new Blob([medicalReport.report || medicalReport.content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `medical-report-${Date.now()}.txt`;
                        a.click();
                      }}
                    >
                      Download Report
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Pattern Recognition Dashboard */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    🔍 Pattern Recognition Dashboard
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={async () => {
                      try {
                        setPatternsLoading(true);
                        const response = await api.get('/doctor/ai/patterns');
                        setHealthPatterns(response.data);
                      } catch (error) {
                        setError('Failed to analyze patterns');
                      } finally {
                        setPatternsLoading(false);
                      }
                    }}
                    disabled={patternsLoading}
                  >
                    {patternsLoading ? 'Analyzing...' : 'Analyze Patterns'}
                  </Button>
                </Box>
                {healthPatterns && (
                  <Grid container spacing={2}>
                    {healthPatterns.seasonalPatterns.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>Seasonal Patterns</Typography>
                            {healthPatterns.seasonalPatterns.map((pattern, idx) => (
                              <Box key={idx} sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, mb: 1 }}>
                                <Typography variant="body2">
                                  <strong>{pattern.month}:</strong> {pattern.visits} visits
                                </Typography>
                                <Typography variant="caption">{pattern.insight}</Typography>
                              </Box>
                            ))}
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                    {healthPatterns.symptomClusters.length > 0 && (
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>Symptom Clusters</Typography>
                            {healthPatterns.symptomClusters.map((cluster, idx) => (
                              <Box key={idx} sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1, mb: 1 }}>
                                <Typography variant="body2">
                                  <strong>{cluster.symptom}:</strong> {cluster.frequency} occurrences
                                </Typography>
                                <Typography variant="caption">{cluster.insight}</Typography>
                              </Box>
                            ))}
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                    {healthPatterns.insights.length > 0 && (
                      <Grid item xs={12}>
                        <Alert severity="info">
                          {healthPatterns.insights.map((insight, idx) => (
                            <Typography key={idx} variant="body2">{insight}</Typography>
                          ))}
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Voice Assistant Dialog */}
      <Dialog open={vaOpen} onClose={handleVaClose} maxWidth="xs" fullWidth>
        <DialogTitle>Voice Assistant</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, bgcolor: '#f6f8fa' }}>
            <VoiceAssistant />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DoctorDashboard;

