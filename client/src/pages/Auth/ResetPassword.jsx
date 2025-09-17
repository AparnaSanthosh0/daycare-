import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, Alert } from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../config/api';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError(''); setMessage('');
    try {
      await api.post('/api/auth/reset-password', { email, token, password });
      setMessage('Password has been reset. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>Reset Password</Typography>
        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField label="Email" fullWidth type="email" value={email} disabled sx={{ mb: 2 }} />
          <TextField label="New Password" fullWidth type="password" required value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 2 }} />
          <TextField label="Confirm Password" fullWidth type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} sx={{ mb: 2 }} />
          <Button type="submit" variant="contained" disabled={loading || !password || password !== confirm}>Reset</Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ResetPassword;