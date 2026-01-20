import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, TextField, Button, Alert } from '@mui/material';
import { Warning } from '@mui/icons-material';
import api from '../../config/api';

export default function Emergency() {
  const [msg, setMsg] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function sendAlert() {
    try {
      setError('');
      setMessage('');
      await api.post('/staff-ops/alerts', { level: 'info', message: msg || 'Test alert' });
      setMessage('Alert sent');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to send alert');
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Emergency Response</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}><TextField fullWidth label="Alert Message" value={msg} onChange={(e)=>setMsg(e.target.value)} /></Grid>
          <Grid item xs={12} md={6}><Button sx={{ height: '100%' }} fullWidth color="error" variant="contained" startIcon={<Warning />} onClick={sendAlert}>Send Alert</Button></Grid>
        </Grid>
      </Paper>
    </Box>
  );
}


