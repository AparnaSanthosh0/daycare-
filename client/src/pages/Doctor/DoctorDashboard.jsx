import React, { useState, useEffect, useCallback } from 'react';
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
  Refresh,
  MedicalServices,
  CalendarToday,
  Medication,
  WarningAmber,
  EventAvailable,
  LocalHospital
} from '@mui/icons-material';
import api from '../../config/api';

const DoctorDashboard = () => {
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
      const response = await api.get('/api/doctor/statistics');
      setStatistics(response.data || {
        totalChildren: 0,
        childrenWithAllergies: 0,
        childrenWithMedicalConditions: 0,
        recentCheckups: 0
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  }, []);

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
            color="error"
            startIcon={<WarningAmber />}
            onClick={() => setError('Emergency reporting endpoint not connected yet')}
          >
            Report Emergency
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              fetchChildren();
              fetchStatistics();
            }}
          >
            Refresh
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
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Medical Records</Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage medical records for assigned children. Click on a child to view their complete medical history.
          </Typography>
        </Paper>
      )}

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

