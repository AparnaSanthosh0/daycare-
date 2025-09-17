import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, TextField, Button, Alert } from '@mui/material';
import { HowToReg } from '@mui/icons-material';
import api from '../../config/api';

export default function Visitors() {
  const [visitor, setVisitor] = useState({ name: '', purpose: '', phone: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function logVisitor() {
    try {
      setError('');
      setMessage('');
      await api.post('/api/staff-ops/visitors', visitor);
      setMessage('Visitor logged');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to log visitor');
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Visitor Management</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField fullWidth label="Name" value={visitor.name} onChange={(e)=>setVisitor(p=>({...p, name:e.target.value}))} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Purpose" value={visitor.purpose} onChange={(e)=>setVisitor(p=>({...p, purpose:e.target.value}))} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Phone" value={visitor.phone} onChange={(e)=>setVisitor(p=>({...p, phone:e.target.value}))} /></Grid>
          <Grid item xs={12}><Button variant="contained" startIcon={<HowToReg />} onClick={logVisitor}>Log Visitor</Button></Grid>
        </Grid>
      </Paper>
    </Box>
  );
}


