import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, TextField, Button, Alert } from '@mui/material';
import { DirectionsBus, Engineering } from '@mui/icons-material';
import api from '../../config/api';

export default function Transport() {
  const [transport, setTransport] = useState({ route: '', time: '' });
  const [pickup, setPickup] = useState({ childId: '', person: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function safe(action) {
    try {
      setError('');
      setMessage('');
      await action();
      setMessage('Saved successfully');
    } catch (e) {
      setError(e?.response?.data?.message || 'Action failed');
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Transportation & Pickup Management</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}><TextField fullWidth label="Route" value={transport.route} onChange={(e)=>setTransport(p=>({...p, route:e.target.value}))} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth label="Time" value={transport.time} onChange={(e)=>setTransport(p=>({...p, time:e.target.value}))} /></Grid>
          <Grid item xs={12} md={6}><Button sx={{ height: '100%' }} startIcon={<DirectionsBus />} variant="contained" onClick={()=>safe(()=>api.post('/staff-ops/transport', transport))}>Save Transport</Button></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth label="Child ID" value={pickup.childId} onChange={(e)=>setPickup(p=>({...p, childId:e.target.value}))} /></Grid>
          <Grid item xs={12} md={6}><TextField fullWidth label="Authorized Person" value={pickup.person} onChange={(e)=>setPickup(p=>({...p, person:e.target.value}))} /></Grid>
          <Grid item xs={12} md={3}><Button fullWidth variant="outlined" startIcon={<Engineering />} onClick={()=>safe(()=>api.post('/staff-ops/pickups', { childId: pickup.childId, person: pickup.person }))}>Add Pickup</Button></Grid>
        </Grid>
      </Paper>
    </Box>
  );
}


