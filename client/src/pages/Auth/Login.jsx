import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  MenuItem,
  Divider
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import { useAuth } from '../../contexts/AuthContext';
import firebase from '../../config/firebase';

// Centralized color choices for quick tweaking
const palette = {
  // Pastel/bright blue family
  blueStart: '#38BDF8',   // sky-400
  blueMid:   '#3B82F6',   // blue-500
  blueEnd:   '#6366F1',   // indigo-500
  glow: 'rgba(59, 130, 246, 0.16)',
  overlayLight: 'rgba(30, 64, 175, 0.10)',  // blue overlay on background
  overlayDark:  'rgba(2, 132, 199, 0.14)',  // cyan/blue overlay alt
};

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogleIdToken } = useAuth();
  const isAdminLogin = location.pathname === '/admin-login';
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'parent'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Background images loop for non-admin login
  const loopImages = [
    `${process.env.PUBLIC_URL}/login/loginn.jpg`, // first image
    `${process.env.PUBLIC_URL}/login/ooo.jpg`    // second image
  ];
  // Per-image background positions (X Y). Adjust second image a bit left and up.
  const loopPositions = [
    '50% 36%', // first - moved left slightly
    '44% 28%'  // second - moved left slightly
  ];
  const [bgIndex, setBgIndex] = useState(0);
  useEffect(() => {
    if (!isAdminLogin) {
      const id = setInterval(() => setBgIndex((i) => (i + 1) % loopImages.length), 5000);
      return () => clearInterval(id);
    }
  }, [isAdminLogin, loopImages.length]);
  const bgImage = isAdminLogin
    ? `${process.env.PUBLIC_URL}/login/login2.jpg`
    : loopImages[bgIndex];
  const bgPosition = isAdminLogin
    ? '-52% 45%'
    : loopPositions[bgIndex];

  // Complete Google sign-in when returning from redirect
  useEffect(() => {
    (async () => {
      try {
        const auth = firebase.auth();
        const result = await auth.getRedirectResult();
        if (result && result.user) {
          setGoogleLoading(true);
          const idToken = await result.user.getIdToken();
          const loginResult = await loginWithGoogleIdToken(idToken);
          if (loginResult.success) {
            navigate('/dashboard');
          } else {
            setError(loginResult.message || 'Google sign-in failed');
          }
        }
      } catch (e) {
        console.error(e);
        setError('Google sign-in failed');
      } finally {
        setGoogleLoading(false);
      }
    })();
  }, [loginWithGoogleIdToken, navigate]);

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

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      const role = result.role || result.user?.role || JSON.parse(localStorage.getItem('token_payload') || '{}').role || formData.role;
      console.log('Login successful, role:', role, 'navigating to appropriate route');
      
      switch (role) {
        case 'admin':
          console.log('Navigating to /admin');
          navigate('/admin');
          break;
        case 'staff':
          console.log('Navigating to /staff');
          navigate('/staff');
          break;
        case 'parent':
          console.log('Navigating to /dashboard');
          navigate('/dashboard');
          break;
        case 'vendor':
          console.log('Navigating to /vendor');
          navigate('/vendor');
          break;
        default:
          console.log('Navigating to /dashboard (default)');
          navigate('/dashboard');
      }
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <Container component="main" maxWidth={false} disableGutters>
      <Box
        sx={{
          minHeight: '100vh',
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {/* Back to landing */}
        <IconButton onClick={() => navigate('/')} sx={{ position: 'fixed', top: 16, left: 16, zIndex: 10, color: 'white', backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </IconButton>

        {/* Background with blue overlay */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            backgroundImage:
              `linear-gradient(${palette.overlayLight}, ${palette.overlayLight}), url(${bgImage})`,
            // Fit/cover the background and move left as requested
            // Slight zoom-out from full cover by using contain fallback with scaled size
            backgroundSize: '110% auto',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: bgPosition,
            backgroundColor: '#000',
            opacity: 1,
            transition: 'background-image 0s, opacity 600ms ease-in-out'
          }}
        />

        <Grid container sx={{ minHeight: '100vh' }}>
          {/* Left branding */}
          <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' }, pl: { xs: 0, md: 10 }, py: { xs: 6, md: 0 }, position: 'relative', zIndex: 2 }}>
            <Box sx={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                component="img"
                src={`${process.env.PUBLIC_URL}/tinytots-icon.svg`}
                alt="TinyTots"
                sx={{ height: { xs: 72, md: 96 }, width: 'auto' }}
              />
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: 0.5, background: `linear-gradient(90deg, ${palette.blueStart} 0%, ${palette.blueMid} 50%, ${palette.blueEnd} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TinyTots</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Management System</Typography>
                <Box sx={{ height: 2, background: 'linear-gradient(90deg, rgba(255,255,255,0.65), rgba(255,255,255,0))', mt: 1, mb: 1, width: 360, maxWidth: '80%' }} />
                <Typography variant="subtitle1" sx={{ color: 'rgba(255,255,255,0.9)' }}>Smart Solutions for DayCare</Typography>
              </Box>
            </Box>
          </Grid>

          {/* Right login card - smaller and more transparent glass */}
          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' }, alignItems: 'center', p: 3, pr: { md: 2 } }}>
            <Paper elevation={0} variant="outlined" sx={{ p: 5, width: 440, maxWidth: '88%', borderRadius: 4,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0.44) 100%)',
              border: '1px solid rgba(255,255,255,0.36)',
              backdropFilter: 'blur(12px) saturate(130%)',
              boxShadow: '0 16px 48px rgba(37, 99, 235, 0.12)', position: 'relative', zIndex: 5
            }}>
              {/* Decorative blue glow */}
              <Box sx={{ position: 'absolute', inset: -2, borderRadius: 5, pointerEvents: 'none', background: `radial-gradient(800px 250px at 50% -40%, ${palette.glow}, rgba(255,255,255,0))` }} />

              <Typography component="h1" variant="h3" align="center" fontWeight={900} sx={{ mb: 4,
                background: `linear-gradient(90deg, ${palette.blueStart} 0%, ${palette.blueMid} 50%, ${palette.blueEnd} 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: 0.5 }}>
                {isAdminLogin ? 'Welcome Admin' : 'Welcome Back'}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} autoComplete="off" onKeyDown={(e) => { if (e.key === 'Enter') e.stopPropagation(); }}>
                {/* Role selection - hidden on secret admin login route */}
                {!isAdminLogin && (
                  <TextField
                    margin="normal"
                    select
                    fullWidth
                    id="role"
                    name="role"
                    label="Role"
                    value={formData.role}
                    onChange={handleChange}
                    variant="standard"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <BadgeOutlinedIcon sx={{ color: palette.blueMid }} />
                        </InputAdornment>
                      ),
                      sx: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 2 }
                    }}
                  >
                    <MenuItem value="parent">Parent</MenuItem>
                    <MenuItem value="staff">Staff</MenuItem>
                    <MenuItem value="vendor">Vendor</MenuItem>
                  </TextField>
                )}

                {/* Username */}
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Username"
                  name="email"
                  autoComplete="new-username"
                  autoFocus
                  value={formData.email}
                  onChange={handleChange}
                  variant="standard"
                  inputProps={{ autoComplete: 'username', 'data-lpignore': 'true' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineRoundedIcon color="action" />
                      </InputAdornment>
                    )
                  }}
                />

                {/* Password */}
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
                  variant="standard"
                  inputProps={{ autoComplete: 'current-password', 'data-lpignore': 'true' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton aria-label="toggle password visibility" onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />

                {/* Forgot password link aligned right */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Typography variant="body2" sx={{ cursor: 'pointer', fontWeight: 600, color: palette.blueMid }} onClick={() => navigate('/forgot-password')}>
                    Forgot Password ?
                  </Typography>
                </Box>

                {/* Primary action - blue gradient button */}
                <Button
                  type="submit"
                  fullWidth
                  sx={{
                    mt: 3,
                    py: 1.25,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    borderRadius: 2,
                    color: 'white',
                    backgroundImage: `linear-gradient(90deg, ${palette.blueMid} 0%, ${palette.blueEnd} 100%)`,
                    boxShadow: '0 12px 28px rgba(59, 130, 246, 0.40)',
                    '&:hover': {
                      backgroundImage: `linear-gradient(90deg, ${palette.blueEnd} 0%, ${palette.blueMid} 100%)`,
                      boxShadow: '0 16px 34px rgba(59, 130, 246, 0.50)'
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'LOGIN'}
                </Button>

                {/* Divider and Google Sign-In - hidden on admin login */}
                {!isAdminLogin && (
                  <>
                    <Box sx={{ my: 2 }}>
                      <Divider>
                        <Typography variant="overline" sx={{ color: 'text.secondary' }}>OR</Typography>
                      </Divider>
                    </Box>

                    {/* Google Sign-In */}
                    <Button
                      fullWidth
                      variant="outlined"
                      sx={{ mb: 1, py: 1.1, fontWeight: 700, borderRadius: 2, borderColor: 'rgba(59, 130, 246, 0.45)', color: palette.blueMid, '&:hover': { borderColor: 'rgba(59, 130, 246, 0.85)', backgroundColor: 'rgba(59, 130, 246, 0.06)' } }}
                      disabled={googleLoading}
                      onClick={async () => {
                        if (googleLoading) return;
                        setGoogleLoading(true);
                        setError('');
                        try {
                          const auth = firebase.auth();
                          const provider = new firebase.auth.GoogleAuthProvider();
                          let popupResult;
                          try {
                            popupResult = await auth.signInWithPopup(provider);
                          } catch (popupErr) {
                            if (popupErr && popupErr.code === 'auth/popup-blocked') {
                              await auth.signInWithRedirect(provider);
                              return;
                            }
                            throw popupErr;
                          }
                          const idToken = await popupResult.user.getIdToken();
                          const loginResult = await loginWithGoogleIdToken(idToken);
                          if (!loginResult.success) throw new Error(loginResult.message || 'Google sign-in failed');
                          const role = loginResult.role || loginResult.user?.role || 'parent';
                          switch (role) {
                            case 'admin':
                              navigate('/admin');
                              break;
                            case 'staff':
                              navigate('/staff');
                              break;
                            case 'vendor':
                              navigate('/vendor');
                              break;
                            default:
                              navigate('/dashboard');
                          }
                        } catch (err) {
                          console.error(err);
                          setError('Google sign-in failed');
                        } finally {
                          setGoogleLoading(false);
                        }
                      }}
                    >
                      {googleLoading ? 'Signing in with Google...' : 'Sign in with Google'}
                    </Button>
                  </>
                )}

                {/* Signup link centered */}
                <Typography variant="body2" align="center" color="text.secondary">
                  Don't have an account? <Link to="/register" state={{ preselectRole: 'parent' }} style={{ color: palette.blueMid }}>Get started</Link>
                </Typography>

                {/* Footer */}
                <Typography variant="caption" display="block" align="center" sx={{ mt: 3, opacity: 0.7 }}>
                  2024 © TinyTots
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Login;