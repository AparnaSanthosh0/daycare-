import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Grid,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Person, ArrowBack, PhoneIphone } from '@mui/icons-material';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

const CustomerRegister = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState('enter'); // 'enter' | 'verify'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!resendIn) return;
    const id = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const requestOtp = async (e) => {
    e?.preventDefault();
    setError('');
    setPreviewUrl('');
    if (!fullName.trim()) return setError('Please enter your full name');
    if (!email) return setError('Please enter your email');
    if (!phone) return setError('Please enter your mobile number');
    setLoading(true);
    try {
      const res = await api.post('/api/customers/otp/send', { email, phone });
      setPreviewUrl(res.data?.previewUrl || '');
      setStep('verify');
      setResendIn(30);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
      setPreviewUrl('');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e?.preventDefault();
    setError('');
    if (!otp) return setError('Enter the OTP sent to your email/mobile');
    setLoading(true);
    try {
      const [firstName, ...rest] = fullName.trim().split(/\s+/);
      const lastName = rest.join(' ');
      const res = await api.post('/api/customers/otp/verify', { email, code: otp, phone, firstName, lastName });
      const { token } = res.data || {};
      if (!token) throw new Error('Missing token');
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      await refreshUser();
      navigate('/shop');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.2), rgba(255,255,255,0.2)), url("/Landing_image.jpg?v=1")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4
      }}
    >
      <Container component="main" maxWidth="md" sx={{ position: 'relative' }}>
        {/* Back Arrow */}
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            position: 'absolute',
            top: -60,
            left: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
            zIndex: 1
          }}
        >
          <ArrowBack />
        </IconButton>
        <Paper elevation={6} sx={{ p: 0, overflow: 'hidden', borderRadius: 4 }}>
          <Grid container>
            <Grid item xs={12} md={5} sx={{ bgcolor: '#2e7d32', color: 'white', p: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: { md: 420 } }}>
              <Typography variant="h4" fontWeight={800} gutterBottom>
                Join TinyTots!
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.95 }}>
                Create your account to start shopping and get personalized recommendations.
              </Typography>
            </Grid>
            <Grid item xs={12} md={7} sx={{ p: 4, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {step === 'enter' && (
                <Box component="form" onSubmit={requestOtp}>
                  <TextField
                    fullWidth
                    required
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); if (error) setError(''); }}
                  />
                  <TextField
                    fullWidth
                    required
                    label="Email Id"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                    InputProps={{ startAdornment: (<InputAdornment position="start"><Person /></InputAdornment>) }}
                  />
                  <TextField
                    fullWidth
                    sx={{ mt: 2 }}
                    required
                    label="Your Mobile No."
                    value={phone}
                    onChange={(e) => { const v = e.target.value.replace(/[^\d+]/g, ''); setPhone(v); if (error) setError(''); }}
                    InputProps={{ startAdornment: (<InputAdornment position="start"><PhoneIphone /></InputAdornment>) }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    OTP will be sent on this mobile no for verification
                  </Typography>
                  <Button type="submit" fullWidth variant="contained" color="success" sx={{ mt: 2 }} disabled={loading}>
                    {loading ? 'Sending OTP…' : 'GET OTP'}
                  </Button>
                  <Button fullWidth variant="text" sx={{ mt: 1 }} onClick={() => navigate('/customer-login')}>
                    Existing user? Log in
                  </Button>
                </Box>
              )}
              {step === 'verify' && (
                <Box component="form" onSubmit={verifyOtp}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    OTP sent to {email || phone}. Enter the 6-digit code below.
                  </Typography>
                  <TextField
                    fullWidth
                    autoFocus
                    label="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 }}
                  />
                  <Button type="submit" fullWidth variant="contained" color="success" sx={{ mt: 3 }} disabled={loading}>
                    {loading ? 'Verifying…' : 'Create Account'}
                  </Button>
                  <Button fullWidth variant="text" sx={{ mt: 1 }} disabled={resendIn > 0 || loading} onClick={requestOtp}>
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
                  </Button>
                  <Button fullWidth variant="text" sx={{ mt: 1 }} onClick={() => { setStep('enter'); setOtp(''); }}>
                    Use different details
                  </Button>
                  {!!previewUrl && (
                    <Button fullWidth variant="text" sx={{ mt: 1 }} onClick={() => window.open(previewUrl, '_blank')}>Open email preview</Button>
                  )}
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};
export default CustomerRegister;