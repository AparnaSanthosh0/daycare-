import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Tabs,
  Tab,
  Tooltip,
  Grid,
  MenuItem,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import api from '../../config/api';

const VaccinationManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [vaccinations, setVaccinations] = useState([]);
  const [overdueVaccines, setOverdueVaccines] = useState([]);
  const [upcomingVaccines, setUpcomingVaccines] = useState([]);
  const [children, setChildren] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [blockchainVerified, setBlockchainVerified] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [formData, setFormData] = useState({
    childId: '',
    vaccine: '',
    date: new Date().toISOString().split('T')[0],
    batchNumber: '',
    provider: '',
    location: '',
    nextDoseDate: '',
    administeredBy: '',
    notes: ''
  });

  // Common vaccines list
  const commonVaccines = [
    'BCG',
    'Hepatitis B',
    'OPV (Oral Polio)',
    'IPV (Injectable Polio)',
    'DTP (Diphtheria, Tetanus, Pertussis)',
    'Hib',
    'Rotavirus',
    'PCV (Pneumococcal)',
    'MMR (Measles, Mumps, Rubella)',
    'Varicella (Chickenpox)',
    'Hepatitis A',
    'Typhoid',
    'Influenza',
    'Other'
  ];

  useEffect(() => {
    fetchVaccinations();
    fetchChildren();
    fetchOverdueVaccines();
    fetchUpcomingVaccines();
    verifyBlockchain();
  }, []);

  const fetchVaccinations = async () => {
    try {
      const response = await api.get('/blockchain/vaccination');
      setVaccinations(response.data.vaccinations || []);
    } catch (error) {
      console.error('Error fetching vaccinations:', error);
      setSnackbar({ open: true, message: 'Failed to fetch vaccinations', severity: 'error' });
    }
  };

  const fetchChildren = async () => {
    try {
      const response = await api.get('/admin/children');
      setChildren(response.data || []);
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  const fetchOverdueVaccines = async () => {
    try {
      const response = await api.get('/blockchain/vaccination/overdue/all');
      setOverdueVaccines(response.data.overdueVaccinations || []);
    } catch (error) {
      console.error('Error fetching overdue vaccines:', error);
    }
  };

  const fetchUpcomingVaccines = async () => {
    try {
      const response = await api.get('/blockchain/vaccination/upcoming/all');
      setUpcomingVaccines(response.data.upcomingVaccinations || []);
    } catch (error) {
      console.error('Error fetching upcoming vaccines:', error);
    }
  };

  const verifyBlockchain = async () => {
    try {
      const response = await api.get('/blockchain/verify');
      setBlockchainVerified(response.data);
    } catch (error) {
      console.error('Error verifying blockchain:', error);
    }
  };

  const handleAddVaccination = async () => {
    try {
      if (!formData.childId || !formData.vaccine) {
        setSnackbar({ open: true, message: 'Please fill required fields', severity: 'warning' });
        return;
      }

      await api.post('/blockchain/vaccination', formData);
      setSnackbar({ open: true, message: '✅ Vaccination added to blockchain!', severity: 'success' });
      setOpenDialog(false);
      resetForm();
      fetchVaccinations();
      fetchOverdueVaccines();
      fetchUpcomingVaccines();
      verifyBlockchain();
    } catch (error) {
      console.error('Error adding vaccination:', error);
      setSnackbar({ open: true, message: error.response?.data?.error || 'Failed to add vaccination', severity: 'error' });
    }
  };

  const resetForm = () => {
    setFormData({
      childId: '',
      vaccine: '',
      date: new Date().toISOString().split('T')[0],
      batchNumber: '',
      provider: '',
      location: '',
      nextDoseDate: '',
      administeredBy: '',
      notes: ''
    });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">💉 Vaccination Management</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {blockchainVerified && (
            <Tooltip title={blockchainVerified.message}>
              <Chip
                icon={blockchainVerified.valid ? <VerifiedIcon /> : <WarningIcon />}
                label={blockchainVerified.valid ? 'Blockchain Verified' : 'Blockchain Error'}
                color={blockchainVerified.valid ? 'success' : 'error'}
                variant="outlined"
              />
            </Tooltip>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Add Vaccination
          </Button>
        </Box>
      </Box>

      {/* Overdue Alerts */}
      {overdueVaccines.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            ⚠️ {overdueVaccines.length} Overdue Vaccinations
          </Typography>
          <Typography variant="body2">
            {overdueVaccines.slice(0, 3).map(v => v.childName).join(', ')}
            {overdueVaccines.length > 3 && ` and ${overdueVaccines.length - 3} more`}
          </Typography>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label={`All Records (${vaccinations.length})`} />
        <Tab 
          label={`Overdue (${overdueVaccines.length})`} 
          icon={overdueVaccines.length > 0 ? <WarningIcon color="error" /> : null}
          iconPosition="end"
        />
        <Tab 
          label={`Upcoming (${upcomingVaccines.length})`}
          icon={upcomingVaccines.length > 0 ? <ScheduleIcon color="primary" /> : null}
          iconPosition="end"
        />
      </Tabs>

      {/* Tab 0: All Vaccinations */}
      {tabValue === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Block #</TableCell>
                <TableCell>Child</TableCell>
                <TableCell>Vaccine</TableCell>
                <TableCell>Date Given</TableCell>
                <TableCell>Next Dose</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Batch No.</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vaccinations.map((vac) => (
                <TableRow key={vac.id}>
                  <TableCell>
                    <Chip label={`#${vac.blockNumber}`} size="small" color="primary" />
                  </TableCell>
                  <TableCell>{vac.data?.childName}</TableCell>
                  <TableCell>{vac.data?.vaccine || vac.data?.vaccineName}</TableCell>
                  <TableCell>{new Date(vac.data?.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {vac.data?.nextDoseDate ? (
                      <Chip
                        label={new Date(vac.data.nextDoseDate).toLocaleDateString()}
                        size="small"
                        color={new Date(vac.data.nextDoseDate) < new Date() ? 'error' : 'success'}
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell>{vac.data?.provider || '-'}</TableCell>
                  <TableCell>{vac.data?.batchNumber || '-'}</TableCell>
                  <TableCell>
                    {vac.verified ? (
                      <Chip icon={<CheckCircleIcon />} label="Verified" color="success" size="small" />
                    ) : (
                      <Chip icon={<WarningIcon />} label="Deleted" color="error" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 1: Overdue Vaccinations */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Child</TableCell>
                <TableCell>Vaccine</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Days Overdue</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overdueVaccines.map((vac) => (
                <TableRow key={vac.id}>
                  <TableCell>{vac.childName}</TableCell>
                  <TableCell>{vac.vaccine}</TableCell>
                  <TableCell>{new Date(vac.nextDoseDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip label={`${vac.daysOverdue} days`} color="error" />
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined">Send Reminder</Button>
                  </TableCell>
                </TableRow>
              ))}
              {overdueVaccines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Alert severity="success">All vaccinations up to date! ✅</Alert>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 2: Upcoming Vaccinations */}
      {tabValue === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Child</TableCell>
                <TableCell>Vaccine</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Days Until</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {upcomingVaccines.map((vac) => (
                <TableRow key={vac.id}>
                  <TableCell>{vac.childName}</TableCell>
                  <TableCell>{vac.vaccine}</TableCell>
                  <TableCell>{new Date(vac.nextDoseDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip 
                      label={`${vac.daysUntil} days`} 
                      color={vac.daysUntil <= 7 ? 'warning' : 'info'} 
                    />
                  </TableCell>
                </TableRow>
              ))}
              {upcomingVaccines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Alert severity="info">No vaccinations scheduled in next 30 days</Alert>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Vaccination Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Vaccination Record</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Child *"
                name="childId"
                value={formData.childId}
                onChange={handleInputChange}
              >
                {children.map((child) => (
                  <MenuItem key={child._id} value={child._id}>
                    {child.name} (Age: {child.age})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Vaccine *"
                name="vaccine"
                value={formData.vaccine}
                onChange={handleInputChange}
              >
                {commonVaccines.map((vaccine) => (
                  <MenuItem key={vaccine} value={vaccine}>
                    {vaccine}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Date Administered"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Next Dose Date"
                name="nextDoseDate"
                value={formData.nextDoseDate}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Batch Number"
                name="batchNumber"
                value={formData.batchNumber}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Provider/Doctor"
                name="provider"
                value={formData.provider}
                onChange={handleInputChange}
                placeholder="Dr. Smith"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Kerala Medical Center"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Administered By"
                name="administeredBy"
                value={formData.administeredBy}
                onChange={handleInputChange}
                placeholder="Nurse Name"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional information..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddVaccination} variant="contained" startIcon={<AddIcon />}>
            Add to Blockchain
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VaccinationManagement;
