import React, { useEffect, useState } from 'react';
import { Typography, Box, Paper, Grid, TextField, Button, Alert, Avatar, Switch, FormControlLabel } from '@mui/material';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', address: { street: '', city: '', state: '', zipCode: '' }, notifications: { email: true, sms: false, whatsapp: false } });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [imgFile, setImgFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        address: { street: user.address?.street || '', city: user.address?.city || '', state: user.address?.state || '', zipCode: user.address?.zipCode || '' },
        notifications: { email: !!user.notifications?.email, sms: !!user.notifications?.sms, whatsapp: !!user.notifications?.whatsapp }
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const key = name.split('.')[1];
      setForm(prev => ({ ...prev, address: { ...prev.address, [key]: value } }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    if (error) setError(''); if (message) setMessage('');
  };

  const handleNotif = (key) => (e) => {
    const checked = e.target.checked;
    setForm(prev => ({ ...prev, notifications: { ...prev.notifications, [key]: checked } }));
  };

  async function saveProfile() {
    try {
      setSaving(true); setError(''); setMessage('');
      await api.put('/api/auth/profile', form);
      await refreshUser?.();
      setMessage('Profile updated');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    try {
      setSaving(true); setError(''); setMessage('');
      if (pwd.newPassword !== pwd.confirmPassword) throw new Error('Passwords do not match');
      await api.post('/api/auth/change-password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      setMessage('Password updated');
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage() {
    try {
      if (!imgFile) return;
      setSaving(true); setError(''); setMessage('');
      const fd = new FormData();
      fd.append('image', imgFile);
      await api.post('/api/auth/profile/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser?.();
      setMessage('Profile picture updated');
      setImgFile(null);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to upload image');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>User Profile</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Personal Information</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="First Name" name="firstName" value={form.firstName} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Phone" name="phone" value={form.phone} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Street" name="address.street" value={form.address.street} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="City" name="address.city" value={form.address.city} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="State" name="address.state" value={form.address.state} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Zip Code" name="address.zipCode" value={form.address.zipCode} onChange={handleChange} />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={saveProfile} disabled={saving}>Save Changes</Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Notification Preferences</Typography>
        <FormControlLabel control={<Switch checked={form.notifications.email} onChange={handleNotif('email')} />} label="Email" />
        <FormControlLabel control={<Switch checked={form.notifications.sms} onChange={handleNotif('sms')} />} label="SMS" />
        <FormControlLabel control={<Switch checked={form.notifications.whatsapp} onChange={handleNotif('whatsapp')} />} label="WhatsApp" />
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={saveProfile} disabled={saving}>Save Preferences</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Change Password</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField type="password" fullWidth label="Current Password" value={pwd.currentPassword} onChange={(e) => setPwd(p => ({ ...p, currentPassword: e.target.value }))} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField type="password" fullWidth label="New Password" value={pwd.newPassword} onChange={(e) => setPwd(p => ({ ...p, newPassword: e.target.value }))} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField type="password" fullWidth label="Confirm New Password" value={pwd.confirmPassword} onChange={(e) => setPwd(p => ({ ...p, confirmPassword: e.target.value }))} />
          </Grid>
          <Grid item xs={12}>
            <Button variant="outlined" onClick={changePassword} disabled={saving}>Update Password</Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Profile Picture</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            src={user?.profileImage ? 
              (user.profileImage.startsWith('http') ? user.profileImage : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${user.profileImage}`) 
              : ''} 
            sx={{ width: 72, height: 72 }} 
          />
          <input type="file" accept="image/*" onChange={(e) => setImgFile(e.target.files?.[0] || null)} />
          <Button variant="contained" onClick={uploadImage} disabled={!imgFile || saving}>Upload</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Profile;