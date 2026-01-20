import React, { useState } from 'react';
import { Box, Paper, Typography, Grid, TextField, Button, Alert } from '@mui/material';
import { MarkEmailUnread } from '@mui/icons-material';
import api from '../../config/api';

export default function Communication() {
  const [msg, setMsg] = useState({ to: 'parent', subject: '', body: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function sendMessage() {
    try {
      setError('');
      setMessage('');
      await api.post('/staff-ops/messages', msg);
      setMessage('Message sent');
      setMsg({ to: 'parent', subject: '', body: '' });
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to send message');
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Communication Portal</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}><TextField fullWidth label="To (parent/admin)" value={msg.to} onChange={(e)=>setMsg(p=>({...p, to:e.target.value}))} /></Grid>
          <Grid item xs={12} md={4}><TextField fullWidth label="Subject" value={msg.subject} onChange={(e)=>setMsg(p=>({...p, subject:e.target.value}))} /></Grid>
          <Grid item xs={12} md={5}><TextField fullWidth label="Message" value={msg.body} onChange={(e)=>setMsg(p=>({...p, body:e.target.value}))} /></Grid>
          <Grid item xs={12}><Button variant="contained" startIcon={<MarkEmailUnread />} onClick={sendMessage}>Send Message</Button></Grid>
        </Grid>
      </Paper>
    </Box>
  );
}


