import React, { useEffect, useMemo, useState } from 'react';
import {
  Typography, Box, Paper, Grid, Card, CardContent, CardHeader, Avatar,
  TextField, Button, IconButton, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Divider
} from '@mui/material';
import { ChildCare, Edit, Visibility, Add, Refresh, Search } from '@mui/icons-material';
import api from '../../config/api';

const Children = () => {
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [children, setChildren] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    parentId: '',
    program: 'preschool',
    medicalInfo: '',
    allergies: [],
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: 'Emergency'
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/children');
        if (!mounted) return;
        setChildren(Array.isArray(res.data) ? res.data : (res.data.children || []));
      } catch (e) {
        console.error('Load children error:', e);
        setError('Failed to load children');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return children;
    return children.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
      || (c.program || '').toLowerCase().includes(q)
    );
  }, [children, filter]);

  const openCreate = (prefill) => {
    setForm({
      firstName: prefill?.firstName || '',
      lastName: prefill?.lastName || '',
      dateOfBirth: prefill?.dateOfBirth || '',
      gender: prefill?.gender || 'male',
      parentId: prefill?.parentId || '',
      program: prefill?.program || 'preschool',
      medicalInfo: prefill?.medicalInfo || '',
      allergies: [],
      emergencyName: '',
      emergencyPhone: '',
      emergencyRelationship: 'Emergency'
    });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    try {
      setError('');
      if (!form.firstName || !form.lastName || !form.dateOfBirth || !form.parentId) {
        setError('Fill all required fields');
        return;
      }
      const emergencyContacts = (form.emergencyName && form.emergencyPhone)
        ? [{ name: form.emergencyName.trim(), phone: form.emergencyPhone.trim(), relationship: form.emergencyRelationship.trim() }]
        : [];
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        parents: [form.parentId],
        program: form.program,
        allergies: form.allergies,
        medicalConditions: form.medicalInfo ? [{ condition: form.medicalInfo }] : [],
        emergencyContacts
      };
      await api.post('/api/children', payload);
      setCreateOpen(false);
      const res = await api.get('/api/children');
      setChildren(Array.isArray(res.data) ? res.data : (res.data.children || []));
    } catch (e) {
      console.error('Create child error:', e);
      setError(e?.response?.data?.message || 'Server error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Children Management</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search children..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
          />
          <Button variant="contained" startIcon={<Add />} onClick={() => openCreate()}>Add Child</Button>
          <IconButton onClick={async () => {
            const res = await api.get('/api/children');
            setChildren(Array.isArray(res.data) ? res.data : (res.data.children || []));
          }}><Refresh /></IconButton>
        </Box>
      </Box>

      {error && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      <Grid container spacing={2}>
        {filtered.map((c) => (
          <Grid item xs={12} sm={6} md={4} key={c._id}>
            <Card sx={{ height: '100%', transition: 'transform 120ms ease, box-shadow 120ms ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: 6 } }}>
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {c.profileImage ? (
                      <img 
                        src={c.profileImage} 
                        alt={`${c.firstName} ${c.lastName}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <ChildCare />
                    )}
                  </Avatar>
                }
                title={`${c.firstName} ${c.lastName}`}
                subheader={`${c.program} • ${new Date(c.dateOfBirth).toLocaleDateString()}`}
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Age: {c.age ?? '-'} • Status: {c.isActive ? 'Active' : 'Inactive'}
                </Typography>
                {c.assignedStaff && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Staff: {c.assignedStaff.firstName} {c.assignedStaff.lastName}
                  </Typography>
                )}
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {(c.allergies || []).slice(0, 4).map((a, i) => <Chip key={i} size="small" label={a} />)}
                  {(c.allergies || []).length === 0 && <Chip size="small" label="No allergies" variant="outlined" />}
                </Box>
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Button size="small" startIcon={<Visibility />} onClick={() => setSelected(c)}>Profile</Button>
                  <Button size="small" startIcon={<Edit />} variant="outlined" onClick={() => setSelected(c)}>Edit</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {filtered.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 6, textAlign: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
              <ChildCare sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No children found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start by adding a child or check if there are pending admissions to approve.
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => openCreate()}>
                Add First Child
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Child</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth type="date" label="Date of Birth" InputLabelProps={{ shrink: true }} value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="Parent ID" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} helperText="Paste the parent user ID" /></Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Program" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })}>
                <MenuItem value="toddler">Toddler (1-2 years)</MenuItem>
                <MenuItem value="preschool">Preschool (3-4 years)</MenuItem>
                <MenuItem value="prekindergarten">Pre-Kindergarten (5-7 years)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Medical Info" placeholder="Allergies, conditions, medications, instructions" value={form.medicalInfo || ''} onChange={(e) => setForm({ ...form, medicalInfo: e.target.value })} /></Grid>

            <Grid item xs={12}><Divider>Emergency Contact (optional)</Divider></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Name" value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Phone" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth label="Relationship" value={form.emergencyRelationship} onChange={(e) => setForm({ ...form, emergencyRelationship: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitCreate}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Profile Drawer/Modal (simplified) */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="md">
        <DialogTitle>Child Profile</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar sx={{ width: 120, height: 120, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                      {selected.profileImage ? (
                        <img 
                          src={selected.profileImage} 
                          alt={`${selected.firstName} ${selected.lastName}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <ChildCare sx={{ fontSize: 60 }} />
                      )}
                    </Avatar>
                    <Typography variant="h6">{selected.firstName} {selected.lastName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selected.program} • Age: {selected.age || '-'}
                    </Typography>
                    <Chip 
                      label={selected.isActive ? 'Active' : 'Inactive'} 
                      color={selected.isActive ? 'success' : 'default'}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">Date of Birth</Typography>
                      <Typography variant="body1">{new Date(selected.dateOfBirth).toLocaleDateString()}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">Gender</Typography>
                      <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{selected.gender}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">Enrollment Date</Typography>
                      <Typography variant="body1">{new Date(selected.enrollmentDate).toLocaleDateString()}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">Medical Info</Typography>
                      <Typography variant="body1">{(selected.medicalConditions && selected.medicalConditions[0]?.condition) || 'None provided'}</Typography>
                    </Grid>
                    {selected.assignedStaff && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">Assigned Staff</Typography>
                        <Typography variant="body1">
                          {selected.assignedStaff.firstName} {selected.assignedStaff.lastName}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">Allergies</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        {(selected.allergies || []).map((a, i) => <Chip key={i} label={a} size="small" />)}
                        {(selected.allergies || []).length === 0 && <Typography variant="body2" color="text.secondary">None</Typography>}
                      </Box>
                    </Grid>
                    {selected.notes && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                        <Typography variant="body1">{selected.notes}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Children;