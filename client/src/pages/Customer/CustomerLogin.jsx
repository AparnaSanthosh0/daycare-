import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  Grid,
  Link
} from '@mui/material';
import { Person, Lock, ArrowBack, Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

// Load Google script and notify when ready
function useGooglePlatformScript() {
  useEffect(() => {
    const id = 'google-platform-script';
    const existing = document.getElementById(id);
    if (existing) {
      // If script tag exists attach load handler if google isn't ready yet
      if (window.google) {
        window.dispatchEvent(new Event('google-loaded'));
      } else {
        existing.addEventListener('load', () => {
          window.dispatchEvent(new Event('google-loaded'));
        });
      }
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.dispatchEvent(new Event('google-loaded'));
    };
    document.body.appendChild(script);
  }, []);
}

const CustomerLogin = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const location = useLocation();
  const redirectTo = (location.state && location.state.redirectTo) || '/shop';
  useGooglePlatformScript();
  const googleDivRef = React.useRef(null);

  // Login form state
  const [form, setForm] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Initialize Google button after script loads
  useEffect(() => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    function init() {
      if (!window.google || !googleDivRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const res = await api.post('/customers/google-login', { idToken: response.credential });
            // If backend indicates new Google user, redirect to registration
            if (res.data?.requiresOtp) {
              const { email: em, firstName: fn, lastName: ln } = res.data;
              navigate('/customer-register', { 
                state: { 
                  email: em, 
                  firstName: fn, 
                  lastName: ln,
                  redirectTo 
                } 
              });
              return;
            }
            const { token } = res.data || {};
            if (!token) throw new Error('Missing token');
            localStorage.setItem('token', token);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            await refreshUser();
            navigate(redirectTo);
          } catch (err) {
            setError(err.response?.data?.message || 'Google sign-in failed');
          }
        },
      });
      window.google.accounts.id.renderButton(googleDivRef.current, { theme: 'outline', size: 'large', shape: 'pill', width: 320 });
    }

    // Try init immediately; also wait for explicit load event to guarantee readiness
    init();
    const onLoaded = () => init();
    window.addEventListener('google-loaded', onLoaded);
    return () => {
      window.removeEventListener('google-loaded', onLoaded);
    };
  }, [navigate, refreshUser, redirectTo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!form.email || !form.password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/customers/login', form);
      const { token } = res.data || {};
      if (!token) throw new Error('Missing token');
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      await refreshUser();
      navigate(redirectTo);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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

        <Paper elevation={6} sx={{ p: 0, overflow: 'hidden', borderRadius: 4 }}>
          <Grid container>
            <Grid item xs={12} md={5} sx={{ bgcolor: '#2e7d32', color: 'white', p: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: { md: 420 } }}>
              <Typography variant="h4" fontWeight={800} gutterBottom>
                Welcome Back!
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.95 }}>
                Sign in to access your personalized shopping experience, wishlist, and order history.
              </Typography>
            </Grid>
            <Grid item xs={12} md={7} sx={{ p: 4, backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  required
                  label="Email Address"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  InputProps={{ 
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ) 
                  }}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  required
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
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
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{ mb: 3 }}
                />
                
                <Button 
                  type="submit" 
                  fullWidth 
                  variant="contained" 
                  color="success" 
                  disabled={loading}
                  sx={{ mb: 2 }}
                >
                  {loading ? 'Signing In...' : 'SIGN IN'}
                </Button>
                
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <div ref={googleDivRef} />
                </Box>
                
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Don't have an account?{' '}
                    <Link 
                      component="button" 
                      variant="body2" 
                      onClick={() => navigate('/customer-register')}
                      sx={{ textDecoration: 'none', fontWeight: 600 }}
                    >
                      Create one here
                    </Link>
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

export default CustomerLogin;