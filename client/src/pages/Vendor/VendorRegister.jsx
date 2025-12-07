import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  IconButton,
  Alert,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../../config/api';
import { prefillWithGoogle } from '../../utils/googlePrefill';

const VendorRegister = () => {
  const [form, setForm] = useState({
    vendorName: '',
    companyName: '',
    email: '',
    phone: '',
    businessLicenseNumber: '',
    notes: '',
    address: { street: '', city: '', state: '' },
    password: '',
    confirmPassword: '',
  });
  const [licenseFile, setLicenseFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [status, setStatus] = useState('');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/api/vendor');
        if (data.vendor) {
          setStatus(data.vendor.status);
        }
      } catch (e) {
        // If database not connected or server not available, show a non-blocking notice
        const msg = e?.response?.data?.message || '';
        if (msg.includes('Database not connected')) {
          setNotice('System maintenance: database currently unavailable. You can fill the form but submission will be disabled until it is back online.');
        }
      }
    };
    load();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const key = name.split('.')[1];
      setForm((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Password validation
    if (!form.password) {
      setError('Password is required.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(form.password)) {
      setError('Password must be 8+ chars, include upper & lower case, number, and special character.');
      return;
    }
    
    if (!licenseFile) {
      setError('License document is required (PDF/JPG/PNG).');
      return;
    }
    if (notice) return; // DB down
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('vendorName', form.vendorName);
      fd.append('companyName', form.companyName);
      fd.append('email', form.email);
      fd.append('phone', form.phone);
      fd.append('businessLicenseNumber', form.businessLicenseNumber);
      fd.append('notes', form.notes);
      fd.append('address[street]', form.address.street);
      fd.append('address[city]', form.address.city);
      fd.append('address[state]', form.address.state);
      fd.append('password', form.password);
      fd.append('license', licenseFile);

      const { data } = await api.post('/api/vendor', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(data.message || 'Registration submitted');
      setStatus('pending');
    } catch (err) {
      // Prefer server-provided message. If server returned plain text/HTML, use it; else fallback to common JSON fields.
      let msg;
      const data = err?.response?.data;
      if (typeof data === 'string') {
        msg = data;
      } else {
        msg = data?.message || data?.errors?.[0]?.msg || err.message || 'Submission failed';
      }
      // Multi-vendor support - no need to check for closed registration
      setError(msg);
      console.error('Vendor submit failed:', err?.response?.status, data);
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = () => {
    if (status === 'pending') return <Alert severity="info">Registration in process. Awaiting admin approval.</Alert>;
    if (status === 'rejected') return <Alert severity="error">Registration rejected. Please contact admin.</Alert>;
    return null;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Back to landing - arrow icon */}
      <IconButton onClick={() => window.history.back()} sx={{ position: 'fixed', top: 16, left: 16, zIndex: 10, color: 'white', backgroundColor: 'rgba(0,0,0,0.35)' }} aria-label="Back">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </IconButton>

      {/* Static background image - vendor page children photo */}
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: "linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.15)), url('/vendor-bg.jpg')",
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', filter: 'brightness(0.95)'
      }} />

      <Paper elevation={6} sx={{ p: 4, maxWidth: 760, width: '100%', borderRadius: 3, position: 'relative', zIndex: 1, backdropFilter: 'blur(6px)', backgroundColor: 'rgba(245,240,255,0.5)', border: '1px solid rgba(255,255,255,0.6)' }}>
        <Typography variant="h5" fontWeight={700} align="center" sx={{ mb: 2 }}>
          Vendor Registration
        </Typography>

        {renderStatus()}
        {notice && <Alert severity="warning" sx={{ mt: 2 }}>{notice}</Alert>}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

        <Box component="form" onSubmit={onSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                onClick={async () => {
                  const res = await prefillWithGoogle();
                  if (res.success) {
                    setForm((prev) => ({
                      ...prev,
                      email: res.profile.email || prev.email,
                    }));
                  }
                }}
              >
                Use Google to prefill email
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Vendor Name" name="vendorName" value={form.vendorName} onChange={onChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Company Name" name="companyName" value={form.companyName} onChange={onChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField type="email" label="Business Email" name="email" value={form.email} onChange={onChange} fullWidth required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Business Phone (10 digits)" name="phone" value={form.phone} onChange={(e)=>{ if (/^\d{0,10}$/.test(e.target.value)) onChange(e); }} inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '\\d{10}' }} helperText="Enter exactly 10 digits" fullWidth required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Business License Number" name="businessLicenseNumber" value={form.businessLicenseNumber} onChange={onChange} fullWidth required />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>Account Security</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                type={showPassword ? 'text' : 'password'}
                label="Password"
                name="password"
                value={form.password}
                onChange={onChange}
                fullWidth
                required
                helperText="8+ chars, upper & lower case, number, special character"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
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
                type={showConfirmPassword ? 'text' : 'password'}
                label="Confirm Password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={onChange}
                fullWidth
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">Company Address</Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Street" name="address.street" value={form.address.street} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="City" name="address.city" value={form.address.city} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="State" name="address.state" value={form.address.state} onChange={onChange} fullWidth />
            </Grid>


            <Grid item xs={12}>
              <Button variant="contained" component="label">
                Upload License (PDF/JPG/PNG)
                <input type="file" hidden onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} />
              </Button>
              {licenseFile && (
                <Typography variant="caption" sx={{ ml: 1 }}>{licenseFile.name}</Typography>
              )}
            </Grid>

            <Grid item xs={12}>
              <TextField label="Notes" name="notes" value={form.notes} onChange={onChange} fullWidth multiline minRows={2} />
            </Grid>

            <Grid item xs={12}>
              <Button type="submit" variant="contained" fullWidth disabled={loading || !!notice}>
                {loading ? 'Submitting...' : (notice ? 'Unavailable' : 'Submit Registration')}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default VendorRegister;