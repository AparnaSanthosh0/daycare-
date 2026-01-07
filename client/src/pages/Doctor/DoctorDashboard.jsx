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
  Logout
} from '@mui/icons-material';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

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

  // Fetch assigned children
  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/doctor/children');
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
        api.get('/api/doctor/statistics'),
        api.get('/api/appointments/stats/doctor')
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
      const response = await api.get('/api/appointments/doctor', {
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
        const response = await api.get('/api/doctor/profile');
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
        <Stack direction="row" spacing={1}>
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
        <Tab label="Prescriptions" icon={<LocalHospital />} />
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
    </Box>
  );
};

export default DoctorDashboard;

