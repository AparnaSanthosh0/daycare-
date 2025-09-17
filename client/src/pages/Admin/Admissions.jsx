import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, Grid, Chip, Stack, Divider } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const Admissions = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [error, setError] = useState('');

  const fetchPending = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/admissions/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load admissions');
      setList(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const act = async (id, action) => {
    try {
      const res = await fetch(`/api/admin/admissions/${id}/${action}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Action failed');
      await fetchPending();
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Container maxWidth="lg">
        <Typography variant="h5" fontWeight={700} gutterBottom>Pending Admissions</Typography>
        {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
        {loading ? (
          <Typography>Loading...</Typography>
        ) : list.length === 0 ? (
          <Typography>No pending admissions</Typography>
        ) : (
          <Grid container spacing={2}>
            {list.map((ar) => (
              <Grid item xs={12} md={6} key={ar._id}>
                <Card>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">{ar.child?.name}</Typography>
                      <Chip label={ar.status} color={ar.status === 'pending' ? 'warning' : (ar.status === 'approved' ? 'success' : 'error')} />
                    </Stack>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="body2">Parent: {ar.parent?.firstName} {ar.parent?.lastName} ({ar.parent?.email})</Typography>
                    <Typography variant="body2">Phone: {ar.parent?.phone || '-'}</Typography>
                    <Typography variant="body2">DOB: {ar.child?.dateOfBirth ? new Date(ar.child.dateOfBirth).toLocaleDateString() : '-'}</Typography>
                    <Typography variant="body2">Gender: {ar.child?.gender}</Typography>
                    <Typography variant="body2">Program: {ar.child?.program || '-'}</Typography>
                    {ar.child?.medicalInfo && <Typography variant="body2">Medical: {ar.child.medicalInfo}</Typography>}
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button variant="contained" color="success" onClick={() => act(ar._id, 'approve')}>Approve</Button>
                      <Button variant="outlined" color="error" onClick={() => act(ar._id, 'reject')}>Reject</Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default Admissions;