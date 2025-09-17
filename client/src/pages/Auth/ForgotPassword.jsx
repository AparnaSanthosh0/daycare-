import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, Alert } from '@mui/material';
import api from '../../config/api';
import firebase from '../../config/firebase';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setMessage(''); setDevResetUrl('');
    try {
      // Prefer Firebase reset for Firebase auth users
      await firebase.auth().sendPasswordResetEmail(email, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true
      });
      setMessage('If this email exists, a reset link has been sent.');
      // Fallback: keep backend path for non-Firebase accounts (optional)
      try {
        const { data } = await api.post('/api/auth/forgot-password', { email });
        if (data?.devResetUrl) setDevResetUrl(data.devResetUrl);
      } catch (_) { /* ignore backend fallback errors */ }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to send reset link';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>Forgot Password</Typography>
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {devResetUrl && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Reset link (development):{' '}
            <Button size="small" variant="outlined" onClick={() => { window.location.href = devResetUrl; }}>
              Open reset page
            </Button>
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField label="Email" fullWidth type="email" required value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} />
          <Button type="submit" variant="contained" disabled={loading || !email}>Send Reset Link</Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPassword;