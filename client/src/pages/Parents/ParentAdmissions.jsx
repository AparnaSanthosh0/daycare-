import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, TextField, MenuItem, Button, Divider, Chip } from '@mui/material';
import api from '../../config/api';

const ParentAdmissions = ({ onSubmitted }) => {
  const [form, setForm] = useState({
    childName: '',
    childDob: '',
    childGender: 'male',
    program: 'preschool',
    medicalInfo: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [admissions, setAdmissions] = useState([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const loadAdmissions = async () => {
    try {
      const res = await api.get('/api/parents/me/admissions');
      setAdmissions(res.data || []);
    } catch (e) {
      console.error('Load admissions error:', e);
    }
  };

  useEffect(() => { loadAdmissions(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/parents/me/admissions', form);
      await loadAdmissions();
      if (onSubmitted) onSubmitted();
      setForm({ childName: '', childDob: '', childGender: 'male', program: 'preschool', medicalInfo: '', emergencyContactName: '', emergencyContactPhone: '' });
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
    } catch (e) {
      console.error('Submit admission error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {showSuccessMessage && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'success.light', color: 'success.contrastText' }}>
          <Typography variant="h6" gutterBottom>✅ Admission Request Submitted!</Typography>
          <Typography variant="body2">
            Your child's admission request has been submitted and is waiting for admin approval. 
            You will receive an email notification once the admin reviews your request.
          </Typography>
        </Paper>
      )}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>New Child Admission</Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Child's Name" fullWidth required value={form.childName} onChange={(e) => setForm({ ...form, childName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Date of Birth" fullWidth required type="date" InputLabelProps={{ shrink: true }} value={form.childDob} onChange={(e) => setForm({ ...form, childDob: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Gender" fullWidth value={form.childGender} onChange={(e) => setForm({ ...form, childGender: e.target.value })}>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Program" fullWidth value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })}>
                <MenuItem value="toddler">Toddler (1-2 years)</MenuItem>
                <MenuItem value="preschool">Preschool (3-4 years)</MenuItem>
                <MenuItem value="prekindergarten">Pre-Kindergarten (5-7 years)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField 
                label="Medical Information (allergies, medications, conditions)" 
                fullWidth 
                multiline 
                minRows={3} 
                value={form.medicalInfo} 
                onChange={(e) => setForm({ ...form, medicalInfo: e.target.value })}
                required
                helperText="Please provide detailed medical information including allergies, medications, and any special conditions"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Emergency Contact Name (optional)" fullWidth value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Emergency Contact Phone (10 digits)" fullWidth value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit for Admin Approval'}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>My Admissions</Typography>
        {admissions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No admissions yet.</Typography>
        ) : (
          <Grid container spacing={2}>
            {admissions.map((a) => (
              <Grid key={a._id} item xs={12} md={6}>
                <Paper sx={{ p: 2 }} variant="outlined">
                  <Typography variant="subtitle1">{a.child?.name}</Typography>
                  <Typography variant="body2" color="text.secondary">DOB: {a.child?.dateOfBirth ? new Date(a.child.dateOfBirth).toLocaleDateString() : '-'}</Typography>
                  <Typography variant="body2" color="text.secondary">Gender: {a.child?.gender}</Typography>
                  <Typography variant="body2" color="text.secondary">Program: {a.child?.program || '-'}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Chip label={a.status} color={a.status === 'approved' ? 'success' : a.status === 'rejected' ? 'error' : 'warning'} size="small" />
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Box>
  );
};

export default ParentAdmissions;