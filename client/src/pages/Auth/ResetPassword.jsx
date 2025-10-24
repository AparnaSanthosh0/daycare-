import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, Box, Alert, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../config/api';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [passError, setPassError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const validatePassword = (p) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(p) ? '' : 'Password must have 8+ chars, uppercase, lowercase, number, and special char';
  };

  const handlePasswordChange = (e) => {
    const p = e.target.value;
    setPassword(p);
    setPassError(validatePassword(p));
    if (confirm && p !== confirm) setConfirmError('Passwords do not match');
    else setConfirmError('');
  };

  const handleConfirmChange = (e) => {
    const c = e.target.value;
    setConfirm(c);
    if (password && c !== password) setConfirmError('Passwords do not match');
    else setConfirmError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError(''); setMessage('');
    try {
      await api.post('/api/auth/reset-password', { email, token, password });
      setMessage('Password has been reset. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (e) {
      const errMsg = e.response?.data?.message || 'Failed to reset password';
      const errDetails = e.response?.data?.errors?.map(err => err.msg).join(', ') || '';
      setError(errDetails || errMsg);
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
          <TextField
            label="New Password"
            fullWidth
            type={showPass ? 'text' : 'password'}
            required
            value={password}
            onChange={handlePasswordChange}
            error={!!passError}
            helperText={passError}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label="toggle password visibility" onClick={() => setShowPass((v) => !v)} edge="end">
                    {showPass ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <TextField
            label="Confirm Password"
            fullWidth
            type={showConfirm ? 'text' : 'password'}
            required
            value={confirm}
            onChange={handleConfirmChange}
            error={!!confirmError}
            helperText={confirmError}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label="toggle confirm password visibility" onClick={() => setShowConfirm((v) => !v)} edge="end">
                    {showConfirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Button type="submit" variant="contained" disabled={loading || !password || password !== confirm}>Reset</Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ResetPassword;