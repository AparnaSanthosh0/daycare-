import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Alert,
  Avatar,
  Divider,
  IconButton,
  Chip,
  InputAdornment
} from '@mui/material';
import {
  Person,
  LocationOn,
  Edit,
  Save,
  Cancel,
  Business,
  School,
  ChildCare,
  AdminPanelSettings,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

const DashboardProfile = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    }
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        email: user.email || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || ''
        },
        emergencyContact: {
          name: user.emergencyContact?.name || '',
          phone: user.emergencyContact?.phone || '',
          relationship: user.emergencyContact?.relationship || ''
        }
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const key = name.split('.')[1];
      setForm(prev => ({ ...prev, address: { ...prev.address, [key]: value } }));
    } else if (name.startsWith('emergencyContact.')) {
      const key = name.split('.')[1];
      setForm(prev => ({ ...prev, emergencyContact: { ...prev.emergencyContact, [key]: value } }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    if (error) setError('');
    if (message) setMessage('');
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    // Reset form to original values
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        email: user.email || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || ''
        },
        emergencyContact: {
          name: user.emergencyContact?.name || '',
          phone: user.emergencyContact?.phone || '',
          relationship: user.emergencyContact?.relationship || ''
        }
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await api.put('/api/auth/profile', form);
      await refreshUser?.();
      setMessage('Profile updated successfully');
      setEditing(false);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminPanelSettings sx={{ color: '#d32f2f' }} />;
      case 'staff':
        return <School sx={{ color: '#1976d2' }} />;
      case 'parent':
        return <ChildCare sx={{ color: '#2e7d32' }} />;
      case 'vendor':
        return <Business sx={{ color: '#ed6c02' }} />;
      case 'doctor':
        return <Person sx={{ color: '#9c27b0' }} />;
      default:
        return <Person sx={{ color: '#666' }} />;
    }
  };

  const getRoleColor = () => {
    switch (user?.role) {
      case 'admin':
        return '#d32f2f';
      case 'staff':
        return '#1976d2';
      case 'parent':
        return '#2e7d32';
      case 'vendor':
        return '#ed6c02';
      case 'doctor':
        return '#9c27b0';
      default:
        return '#666';
    }
  };

  if (!user) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 2, textAlign: 'center' }}>
        <Typography variant="h5">Please login to view your profile</Typography>
        <Button variant="contained" onClick={() => navigate('/login')} sx={{ mt: 2 }}>
          Login
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">My Profile</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getRoleIcon()}
          <Chip 
            label={user.role?.charAt(0).toUpperCase() + user.role?.slice(1)} 
            sx={{ 
              backgroundColor: getRoleColor(), 
              color: 'white',
              fontWeight: 600
            }} 
          />
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Grid container spacing={3}>
        {/* Profile Summary Card */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Avatar
              src={user?.profileImage}
              sx={{ width: 100, height: 100, mx: 'auto', mb: 2 }}
            >
              {user?.firstName?.charAt(0)}
            </Avatar>
            <Typography variant="h5" gutterBottom>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {user?.email}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {user?.phone}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Member since {new Date(user?.createdAt).toLocaleDateString()}
            </Typography>
          </Paper>
        </Grid>

        {/* Profile Details */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">Personal Information</Typography>
              {!editing ? (
                <IconButton onClick={handleEdit} color="primary">
                  <Edit />
                </IconButton>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton onClick={handleSave} color="success" disabled={saving}>
                    <Save />
                  </IconButton>
                  <IconButton onClick={handleCancel} color="error">
                    <Cancel />
                  </IconButton>
                </Box>
              )}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  disabled={true} // Email should not be editable
                  helperText="Email cannot be changed"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Address Information */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocationOn sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Address Information</Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  name="address.street"
                  value={form.address.street}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="City"
                  name="address.city"
                  value={form.address.city}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="State"
                  name="address.state"
                  value={form.address.state}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Zip Code"
                  name="address.zipCode"
                  value={form.address.zipCode}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Emergency Contact */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>Emergency Contact</Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Contact Name"
                  name="emergencyContact.name"
                  value={form.emergencyContact.name}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  name="emergencyContact.phone"
                  value={form.emergencyContact.phone}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Relationship"
                  name="emergencyContact.relationship"
                  value={form.emergencyContact.relationship}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Role-specific Information */}
          {user?.role === 'parent' && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>Parent Information</Typography>
              <Typography variant="body2" color="text.secondary">
                Additional parent-specific information and settings will be displayed here.
              </Typography>
            </Paper>
          )}

          {user?.role === 'staff' && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>Staff Information</Typography>
              <Typography variant="body2" color="text.secondary">
                Staff-specific information, schedules, and performance metrics will be displayed here.
              </Typography>
            </Paper>
          )}

          {user?.role === 'vendor' && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>Vendor Information</Typography>
              <Typography variant="body2" color="text.secondary">
                Vendor-specific information, products, and business details will be displayed here.
              </Typography>
            </Paper>
          )}

          {user?.role === 'admin' && (
            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom>Administrator Information</Typography>
              <Typography variant="body2" color="text.secondary">
                Administrative tools and system information will be displayed here.
              </Typography>
            </Paper>
          )}

          {/* Password Change Section - Available for all users */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <PasswordChangeSection />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

// Password Change Component
const PasswordChangeSection = () => {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changing, setChanging] = useState(false);

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(passwordForm.newPassword)) {
      setPasswordError('Password must be 8+ chars with upper, lower, number and special character');
      return;
    }

    try {
      setChanging(true);
      await api.post('/api/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordSuccess('Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChanging(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Change Password</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Update your password to keep your account secure
      </Typography>

      {passwordError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPasswordError('')}>
          {passwordError}
        </Alert>
      )}
      {passwordSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setPasswordSuccess('')}>
          {passwordSuccess}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Current Password"
            type={showCurrentPassword ? 'text' : 'password'}
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge="end"
                    size="small"
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="New Password"
            type={showNewPassword ? 'text' : 'password'}
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            helperText="8+ chars with upper, lower, number and special character"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                    size="small"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    size="small"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            onClick={handlePasswordChange}
            disabled={changing}
          >
            {changing ? 'Changing Password...' : 'Change Password'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardProfile;


