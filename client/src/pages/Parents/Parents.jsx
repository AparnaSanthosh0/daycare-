import React, { useEffect, useMemo, useState } from 'react';
import {
  Typography, Box, Paper, Grid, Card, CardHeader, CardContent, Avatar,
  TextField, Button, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Divider
} from '@mui/material';
import { People, Visibility, Edit, Refresh, Search, Email, Payments } from '@mui/icons-material';
import api from '../../config/api';

const Parents = () => {
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [parents, setParents] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null); // selected parent object
  const [editOpen, setEditOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);

  const [contactForm, setContactForm] = useState({ phone: '', address: { street: '', city: '', state: '', zipCode: '' }, emergencyContact: { name: '', phone: '', relationship: '' } });
  const [paymentForm, setPaymentForm] = useState({ method: 'other', last4: '', billingEmail: '' });
  const [commForm, setCommForm] = useState({ channel: 'other', subject: '', notes: '' });

  const loadParents = async () => {
    try {
      setLoading(true); setError('');
      const res = await api.get('/api/admin/parents');
      setParents(res.data || []);
    } catch (e) {
      console.error('Load parents error:', e);
      setError('Failed to load parents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadParents(); }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
      || (p.email || '').toLowerCase().includes(q)
      || (p.phone || '').toLowerCase().includes(q)
    );
  }, [parents, filter]);

  const openEdit = (p) => {
    setSelected(p);
    setContactForm({
      phone: p.phone || '',
      address: { street: p.address?.street || '', city: p.address?.city || '', state: p.address?.state || '', zipCode: p.address?.zipCode || '' },
      emergencyContact: { name: p.emergencyContact?.name || '', phone: p.emergencyContact?.phone || '', relationship: p.emergencyContact?.relationship || '' }
    });
    setPaymentForm({ method: p.payment?.method || 'other', last4: p.payment?.last4 || '', billingEmail: p.payment?.billingEmail || '' });
    setEditOpen(true);
  };

  const saveContact = async () => {
    if (!selected?._id) return;
    try {
      await api.put(`/api/admin/parents/${selected._id}/contact`, contactForm);
      await loadParents();
      setEditOpen(false);
    } catch (e) {
      console.error('Save contact error:', e);
      alert(e?.response?.data?.message || 'Failed to save');
    }
  };

  const savePayment = async () => {
    if (!selected?._id) return;
    try {
      await api.put(`/api/admin/parents/${selected._id}/payment`, paymentForm);
      await loadParents();
      setEditOpen(false);
    } catch (e) {
      console.error('Save payment error:', e);
      alert(e?.response?.data?.message || 'Failed to save');
    }
  };

  const openComm = (p) => { setSelected(p); setCommForm({ channel: 'other', subject: '', notes: '' }); setCommOpen(true); };
  const saveComm = async () => {
    if (!selected?._id) return;
    try {
      await api.post(`/api/admin/parents/${selected._id}/communications`, commForm);
      await loadParents();
      setCommOpen(false);
    } catch (e) {
      console.error('Save comm error:', e);
      alert(e?.response?.data?.message || 'Failed to save');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Parents Management</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" placeholder="Search parents..." value={filter} onChange={(e) => setFilter(e.target.value)} InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }} />
          <IconButton onClick={loadParents}><Refresh /></IconButton>
        </Box>
      </Box>

      {error && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      <Grid container spacing={2}>
        {filtered.map((p) => (
          <Grid item xs={12} sm={6} md={4} key={p._id}>
            <Card sx={{ height: '100%', transition: 'transform 120ms ease, box-shadow 120ms ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: 6 } }}>
              <CardHeader
                avatar={<Avatar sx={{ bgcolor: 'primary.main' }}><People /></Avatar>}
                title={`${p.firstName} ${p.lastName}`}
                subheader={`${p.email} • ${p.phone || 'No phone'}`}
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">Status: {p.isActive ? 'Active' : 'Inactive'}</Typography>
                {Array.isArray(p.communications) && p.communications.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2">Recent Communication</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(p.communications[p.communications.length - 1].date).toLocaleString()} • {p.communications[p.communications.length - 1].channel}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button size="small" startIcon={<Visibility />} onClick={() => openEdit(p)}>Profile</Button>
                  <Button size="small" startIcon={<Edit />} variant="outlined" onClick={() => openEdit(p)}>Edit</Button>
                  <Button size="small" startIcon={<Email />} onClick={() => openComm(p)}>Log Communication</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {filtered.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">No parents found.</Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Parent Profile</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Box>
              <Typography variant="h6">{selected.firstName} {selected.lastName}</Typography>
              <Typography variant="body2" color="text.secondary">{selected.email} • {selected.phone || 'No phone'}</Typography>

              <Divider sx={{ my: 2 }}>Contact</Divider>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Phone" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} /></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Billing Email" value={paymentForm.billingEmail} onChange={(e) => setPaymentForm({ ...paymentForm, billingEmail: e.target.value })} /></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Street" value={contactForm.address.street} onChange={(e) => setContactForm({ ...contactForm, address: { ...contactForm.address, street: e.target.value } })} /></Grid>
                <Grid item xs={12} sm={3}><TextField fullWidth label="City" value={contactForm.address.city} onChange={(e) => setContactForm({ ...contactForm, address: { ...contactForm.address, city: e.target.value } })} /></Grid>
                <Grid item xs={12} sm={3}><TextField fullWidth label="State" value={contactForm.address.state} onChange={(e) => setContactForm({ ...contactForm, address: { ...contactForm.address, state: e.target.value } })} /></Grid>
                <Grid item xs={12} sm={3}><TextField fullWidth label="Zip" value={contactForm.address.zipCode} onChange={(e) => setContactForm({ ...contactForm, address: { ...contactForm.address, zipCode: e.target.value } })} /></Grid>
              </Grid>

              <Divider sx={{ my: 2 }}>Emergency Contact</Divider>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}><TextField fullWidth label="Name" value={contactForm.emergencyContact.name} onChange={(e) => setContactForm({ ...contactForm, emergencyContact: { ...contactForm.emergencyContact, name: e.target.value } })} /></Grid>
                <Grid item xs={12} sm={4}><TextField fullWidth label="Phone" value={contactForm.emergencyContact.phone} onChange={(e) => setContactForm({ ...contactForm, emergencyContact: { ...contactForm.emergencyContact, phone: e.target.value } })} /></Grid>
                <Grid item xs={12} sm={4}><TextField fullWidth label="Relationship" value={contactForm.emergencyContact.relationship} onChange={(e) => setContactForm({ ...contactForm, emergencyContact: { ...contactForm.emergencyContact, relationship: e.target.value } })} /></Grid>
              </Grid>

              <Divider sx={{ my: 2 }}>Payment</Divider>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField select fullWidth label="Method" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                    <MenuItem value="card">Card</MenuItem>
                    <MenuItem value="bank">Bank</MenuItem>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}><TextField fullWidth label="Last 4" value={paymentForm.last4} onChange={(e) => setPaymentForm({ ...paymentForm, last4: e.target.value })} /></Grid>
                <Grid item xs={12} sm={4}><Button fullWidth variant="outlined" startIcon={<Payments />} onClick={savePayment}>Save Payment</Button></Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Close</Button>
          <Button variant="contained" onClick={saveContact}>Save Contact</Button>
        </DialogActions>
      </Dialog>

      {/* Log Communication */}
      <Dialog open={commOpen} onClose={() => setCommOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Log Communication</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth label="Channel" value={commForm.channel} onChange={(e) => setCommForm({ ...commForm, channel: e.target.value })}>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="phone">Phone</MenuItem>
                <MenuItem value="in-person">In-person</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={8}><TextField fullWidth label="Subject" value={commForm.subject} onChange={(e) => setCommForm({ ...commForm, subject: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Notes" multiline minRows={3} value={commForm.notes} onChange={(e) => setCommForm({ ...commForm, notes: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveComm}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Parents;