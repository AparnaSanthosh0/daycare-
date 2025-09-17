import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, Person, Lock, ArrowBack } from '@mui/icons-material';
import api from '../../config/api';

const CustomerLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/customers/login', formData);
      const { token, customer } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ ...customer, role: 'customer' }));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      navigate('/customer');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
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
      <Container component="main" maxWidth="sm" sx={{ position: 'relative' }}>
        {/* Back Arrow */}
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            position: 'absolute',
            top: -60,
            left: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 1)',
            },
            zIndex: 1
          }}
        >
          <ArrowBack />
        </IconButton>

        <Paper 
          elevation={6} 
          sx={{ 
            p: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px) saturate(140%)',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}
        >
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Customer Login
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person />
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
            
            <Box textAlign="center">
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link to="/customer-register" style={{ textDecoration: 'none' }}>
                  Sign up here
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default CustomerLogin;
