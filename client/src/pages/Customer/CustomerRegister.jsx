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
  Grid,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff, Person, Lock, Email, Phone, Home, ArrowBack } from '@mui/icons-material';
import api from '../../config/api';

const CustomerRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [field]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...customerData } = formData;
      const response = await api.post('/api/customers/register', customerData);
      const { token, customer } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ ...customer, role: 'customer' }));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      navigate('/customer');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
        >
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Customer Registration
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="firstName"
                  label="First Name"
                  name="firstName"
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="lastName"
                  label="Last Name"
                  name="lastName"
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="phone"
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
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
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  name="gender"
                  label="Gender"
                  id="gender"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </TextField>
              </Grid>
              
              {/* Address Section */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Address Information
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="address.street"
                  label="Street Address"
                  id="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Home />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  name="address.city"
                  label="City"
                  id="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  name="address.state"
                  label="State"
                  id="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  name="address.zipCode"
                  label="ZIP Code"
                  id="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
            
            <Box textAlign="center">
              <Typography variant="body2">
                Already have an account?{' '}
                <Link to="/customer-login" style={{ textDecoration: 'none' }}>
                  Sign in here
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default CustomerRegister;