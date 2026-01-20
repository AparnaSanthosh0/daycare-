import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  Chip,
  Paper,
  CircularProgress,
  Divider,
  List,
  ListItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  MenuItem,
  Snackbar
} from '@mui/material';
import {
  Verified as VerifiedIcon,
  LocalHospital as HospitalIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon
} from '@mui/icons-material';
import api from '../../config/api';

const VaccinationCard = ({ childId }) => {
  const [vaccinations, setVaccinations] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [formData, setFormData] = useState({
    vaccine: '',
    date: new Date().toISOString().split('T')[0],
    nextDoseDate: '',
    provider: '',
    location: '',
    batchNumber: '',
    notes: ''
  });

  // Common vaccines list
  const commonVaccines = [
    'BCG',
    'Hepatitis B',
    'OPV (Oral Polio)',
    'DTP (Diphtheria, Tetanus, Pertussis)',
    'MMR (Measles, Mumps, Rubella)',
    'Varicella (Chickenpox)',
    'Other'
  ];

  useEffect(() => {
    if (childId) {
      fetchVaccinations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  const fetchVaccinations = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/blockchain/vaccination/${childId}`);
      
      const allVaccines = response.data.vaccinations || [];
      
      // Filter completed vs upcoming
      const completed = allVaccines.filter(v => 
        v.status === 'completed' || !v.nextDoseDate
      );
      
      const upcoming = allVaccines
        .filter(v => v.nextDoseDate && new Date(v.nextDoseDate) > new Date())
        .sort((a, b) => new Date(a.nextDoseDate) - new Date(b.nextDoseDate));
      
      setVaccinations(completed);
      setUpcoming(upcoming);
    } catch (error) {
      console.error('Error fetching vaccinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVaccination = async () => {
    try {
      if (!formData.vaccine || !formData.date) {
        setSnackbar({ open: true, message: 'Please fill vaccine name and date', severity: 'warning' });
        return;
      }

      await api.post('/blockchain/vaccination', {
        childId,
        ...formData
      });
      
      setSnackbar({ open: true, message: '✅ Vaccination added successfully!', severity: 'success' });
      setOpenDialog(false);
      resetForm();
      fetchVaccinations();
    } catch (error) {
      console.error('Error adding vaccination:', error);
      setSnackbar({ open: true, message: 'Failed to add vaccination', severity: 'error' });
    }
  };

  const resetForm = () => {
    setFormData({
      vaccine: '',
      date: new Date().toISOString().split('T')[0],
      nextDoseDate: '',
      provider: '',
      location: '',
      batchNumber: '',
      notes: ''
    });
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getDaysUntil = (date) => {
    const today = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading vaccination records...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <HospitalIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">💉 Vaccination Record</Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Add Vaccine
          </Button>
        </Box>

        {/* Blockchain Verification Badge */}
        <Box sx={{ mb: 2 }}>
          <Chip
            icon={<VerifiedIcon />}
            label="Blockchain Verified Records"
            color="success"
            size="small"
            variant="outlined"
          />
        </Box>

        {/* Upcoming Vaccines Alert */}
        {upcoming.length > 0 && (
          <Alert 
            severity={upcoming.some(v => getDaysUntil(v.nextDoseDate) <= 7) ? 'warning' : 'info'} 
            sx={{ mb: 3 }}
          >
            <Typography variant="subtitle2" fontWeight="bold">
              📅 Upcoming Vaccinations
            </Typography>
            {upcoming.map((v, index) => {
              const daysUntil = getDaysUntil(v.nextDoseDate);
              return (
                <Box key={index} sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>{v.vaccine || v.vaccineName}</strong> - Due{' '}
                    {new Date(v.nextDoseDate).toLocaleDateString()}
                    <Chip
                      label={`${daysUntil} days`}
                      size="small"
                      color={daysUntil <= 7 ? 'warning' : 'info'}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  {v.location && (
                    <Typography variant="caption" color="text.secondary">
                      📍 {v.location}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Alert>
        )}

        {/* Vaccination List */}
        {vaccinations.length > 0 ? (
          <>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Completed Vaccinations
            </Typography>
            <List sx={{ width: '100%' }}>
              {vaccinations.map((vac, index) => (
                <ListItem
                  key={vac.id || index}
                  alignItems="flex-start"
                  sx={{
                    mb: 2,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    p: 0
                  }}
                >
                  <Paper elevation={2} sx={{ p: 2, width: '100%', position: 'relative' }}>
                    {/* Green checkmark icon */}
                    <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                      <CheckCircleIcon color="success" />
                    </Box>
                    
                    {/* Date and Block Number */}
                    <Box sx={{ pl: 5, mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(vac.date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="primary" display="block" sx={{ fontSize: '0.7rem' }}>
                        Block #{vac.blockNumber}
                      </Typography>
                    </Box>
                    
                    {/* Vaccine Details */}
                    <Box sx={{ pl: 5 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        {vac.vaccine || vac.vaccineName}
                      </Typography>
                      
                      {vac.provider && (
                        <Typography variant="body2" color="text.secondary">
                          👨‍⚕️ {vac.provider}
                        </Typography>
                      )}
                      
                      {vac.location && (
                        <Typography variant="body2" color="text.secondary">
                          📍 {vac.location}
                        </Typography>
                      )}
                      
                      {vac.batchNumber && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                          Batch: {vac.batchNumber}
                        </Typography>
                      )}
                      
                      {vac.notes && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                          📝 {vac.notes}
                        </Typography>
                      )}
                      
                      {/* Blockchain Hash */}
                      <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
                        <Typography variant="caption" color="primary">
                          🔗 Hash: {vac.hash?.slice(0, 12)}...
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </ListItem>
              ))}
            </List>
          </>
        ) : (
          <Alert severity="info">
            No vaccination records found. Please contact admin to add vaccination history.
          </Alert>
        )}

        {/* Info Footer */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            ℹ️ All vaccination records are stored on blockchain and cannot be altered. 
            You can share these records with any healthcare provider using the verified hash.
          </Typography>
        </Box>

        {/* Add Vaccination Dialog */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Vaccination Record</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
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
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date Given *"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Next Dose Date"
                  name="nextDoseDate"
                  value={formData.nextDoseDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  helperText="When is the next dose due?"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Doctor/Hospital"
                  name="provider"
                  value={formData.provider}
                  onChange={handleInputChange}
                  placeholder="e.g., Dr. Smith or City Hospital"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Kerala Medical Center"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Batch Number (optional)"
                  name="batchNumber"
                  value={formData.batchNumber}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Notes (optional)"
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
            <Button onClick={handleAddVaccination} variant="contained">
              Add to Record
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
};

export default VaccinationCard;
