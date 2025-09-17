import React, { useEffect, useMemo, useState } from 'react';
import {
  Typography, Box, Paper, Grid, Card, CardHeader, CardContent, Avatar,
  TextField, IconButton, Chip, Divider, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, MenuItem
} from '@mui/material';
import { People, ChildCare, Refresh, Search } from '@mui/icons-material';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

const Families = () => {
  const { user } = useAuth();
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [parents, setParents] = useState([]);
  const [children, setChildren] = useState([]);
  const [filter, setFilter] = useState('');
  // Admission dialog (parent creating new child)
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [admissionLoading, setAdmissionLoading] = useState(false);
  const [admissionMsg, setAdmissionMsg] = useState('');
  const [admissionError, setAdmissionError] = useState('');
  const [admissionForm, setAdmissionForm] = useState({
    childName: '',
    childDob: '',
    childGender: 'male',
    program: 'preschool',
    medicalInfo: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

  async function load() {
    try {
      setLoading(true); setError('');
      if (user?.role === 'admin' || user?.role === 'staff') {
        const [pRes, cRes] = await Promise.all([
          api.get('/api/admin/parents'),
          api.get('/api/children')
        ]);
        setParents(Array.isArray(pRes.data) ? pRes.data : (pRes.data || []));
        setChildren(Array.isArray(cRes.data) ? cRes.data : (cRes.data.children || []));
      } else if (user?.role === 'parent') {
        const [childrenRes] = await Promise.all([
          api.get('/api/parents/me/children')
        ]);
        setParents([user]);
        setChildren(Array.isArray(childrenRes.data) ? childrenRes.data : (childrenRes.data.children || []));
      } else {
        setParents([]); setChildren([]);
      }
    } catch (e) {
      console.error('Load families error:', e);
      setError('Failed to load families');
    } finally {
      setLoading(false);
    }
  }

  // Load families on mount; stable dependency prevents infinite loops
  useEffect(() => { load(); }, []);

  const byParent = useMemo(() => {
    const map = new Map();
    parents.forEach(p => map.set(p._id, { parent: p, children: [] }));
    children.forEach(c => {
      (c.parents || []).forEach(pid => {
        if (!map.has(pid)) map.set(pid, { parent: { _id: pid }, children: [] });
        map.get(pid).children.push(c);
      });
    });
    const list = Array.from(map.values());
    if (!filter.trim()) return list;
    const q = filter.trim().toLowerCase();
    return list.filter(f => {
      const pn = `${f.parent?.firstName || ''} ${f.parent?.lastName || ''}`.toLowerCase();
      const pe = (f.parent?.email || '').toLowerCase();
      const pp = (f.parent?.phone || '').toLowerCase();
      const cn = f.children.some(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q));
      return pn.includes(q) || pe.includes(q) || pp.includes(q) || cn;
    });
  }, [parents, children, filter]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Families</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search parent/child..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }}
          />
          <IconButton onClick={load}><Refresh /></IconButton>
          {user?.role === 'parent' && (
            <Button variant="contained" onClick={() => { setAdmissionOpen(true); setAdmissionMsg(''); setAdmissionError(''); }}>Add Child</Button>
          )}
        </Box>
      </Box>

      {error && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      <Grid container spacing={2}>
        {byParent.map((f, idx) => (
          <Grid item xs={12} key={idx}>
            <Card>
              <CardHeader
                avatar={<Avatar><People /></Avatar>}
                title={`${f.parent?.firstName || 'Unknown'} ${f.parent?.lastName || ''}`.trim()}
                subheader={`${f.parent?.email || '—'} • ${f.parent?.phone || '—'}`}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">Parent Details</Typography>
                    <Typography variant="body2">Address: {[
                      f.parent?.address?.street,
                      f.parent?.address?.city,
                      f.parent?.address?.state,
                      f.parent?.address?.zipCode
                    ].filter(Boolean).join(', ') || '—'}</Typography>
                    {f.parent?.emergencyContact && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Emergency: {f.parent.emergencyContact.name || '—'} ({f.parent.emergencyContact.relationship || '—'}) • {f.parent.emergencyContact.phone || '—'}
                      </Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Children</Typography>
                    <Grid container spacing={1}>
                      {f.children.length === 0 && (
                        <Grid item xs={12}>
                          <Chip size="small" label="No children" />
                        </Grid>
                      )}
                      {f.children.map((c) => (
                        <Grid item xs={12} md={6} key={c._id}>
                          <Paper sx={{ p: 1.5 }} variant="outlined">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28 }}><ChildCare sx={{ fontSize: 18 }} /></Avatar>
                              <Typography variant="body2" fontWeight={600}>{c.firstName} {c.lastName}</Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {c.program} • DOB: {new Date(c.dateOfBirth).toLocaleDateString()}
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="caption">Allergies: {(c.allergies || []).join(', ') || 'None'}</Typography><br />
                            <Typography variant="caption">Medical: {(c.medicalConditions && c.medicalConditions[0]?.condition) || 'None'}</Typography><br />
                            {c.assignedStaff && (
                              <Typography variant="caption">Staff: {c.assignedStaff.firstName} {c.assignedStaff.lastName}</Typography>
                            )}
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {byParent.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 6, textAlign: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
              <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No families found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add parents and children to see them combined here.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Admission Dialog (Parent) */}
      <Dialog open={admissionOpen} onClose={() => setAdmissionOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Child Admission</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}><TextField fullWidth label="Child Name" value={admissionForm.childName} onChange={(e) => setAdmissionForm({ ...admissionForm, childName: e.target.value })} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth type="date" label="Date of Birth" InputLabelProps={{ shrink: true }} value={admissionForm.childDob} onChange={(e) => setAdmissionForm({ ...admissionForm, childDob: e.target.value })} /></Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth label="Gender" value={admissionForm.childGender} onChange={(e) => setAdmissionForm({ ...admissionForm, childGender: e.target.value })}>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth label="Program" value={admissionForm.program} onChange={(e) => setAdmissionForm({ ...admissionForm, program: e.target.value })}>
                <MenuItem value="infant">Infant</MenuItem>
                <MenuItem value="toddler">Toddler</MenuItem>
                <MenuItem value="preschool">Preschool</MenuItem>
                <MenuItem value="prekindergarten">Pre-K</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField fullWidth multiline minRows={2} label="Medical Info" placeholder="Allergies, conditions, medications, instructions" value={admissionForm.medicalInfo} onChange={(e) => setAdmissionForm({ ...admissionForm, medicalInfo: e.target.value })} /></Grid>
            <Grid item xs={12}><Divider>Emergency Contact</Divider></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="Contact Name" value={admissionForm.emergencyContactName} onChange={(e) => setAdmissionForm({ ...admissionForm, emergencyContactName: e.target.value })} /></Grid>
            <Grid item xs={12} md={6}><TextField fullWidth label="Contact Phone" value={admissionForm.emergencyContactPhone} onChange={(e) => setAdmissionForm({ ...admissionForm, emergencyContactPhone: e.target.value })} /></Grid>
          </Grid>
          {!!admissionMsg && <Typography sx={{ mt: 2 }} color="success.main">{admissionMsg}</Typography>}
          {!!admissionError && <Typography sx={{ mt: 2 }} color="error.main">{admissionError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdmissionOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={admissionLoading || !admissionForm.childName || !admissionForm.childDob} onClick={async () => {
            try {
              setAdmissionLoading(true); setAdmissionMsg(''); setAdmissionError('');
              const payload = {
                childName: admissionForm.childName,
                childDob: admissionForm.childDob,
                childGender: admissionForm.childGender,
                program: admissionForm.program,
                medicalInfo: admissionForm.medicalInfo,
                emergencyContactName: admissionForm.emergencyContactName,
                emergencyContactPhone: admissionForm.emergencyContactPhone
              };
              await api.post('/api/parents/me/admissions', payload);
              setAdmissionMsg('Admission submitted for admin approval.');
              setAdmissionForm({ childName: '', childDob: '', childGender: 'male', program: 'preschool', medicalInfo: '', emergencyContactName: '', emergencyContactPhone: '' });
            } catch (e) {
              console.error('Admission error:', e);
              setAdmissionError(e?.response?.data?.message || 'Failed to submit admission');
            } finally { setAdmissionLoading(false); }
          }}>Submit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Families;


