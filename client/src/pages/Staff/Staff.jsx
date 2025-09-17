import React from 'react';
import { Grid, Typography, Box, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function Staff() {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Staff Console
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Quick Links</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={6} md={3}><Button fullWidth variant="contained" onClick={() => navigate('/meal-planning')}>Meal Planning</Button></Grid>
              <Grid item xs={12} sm={6} md={3}><Button fullWidth variant="outlined" onClick={() => navigate('/visitors')}>Visitor Management</Button></Grid>
              <Grid item xs={12} sm={6} md={3}><Button fullWidth variant="outlined" onClick={() => navigate('/emergency')}>Emergency Response</Button></Grid>
              <Grid item xs={12} sm={6} md={3}><Button fullWidth variant="outlined" onClick={() => navigate('/transport')}>Transport & Pickup</Button></Grid>
              <Grid item xs={12} sm={6} md={3}><Button fullWidth variant="outlined" onClick={() => navigate('/communication')}>Communication</Button></Grid>
              <Grid item xs={12} sm={6} md={3}><Button fullWidth variant="outlined" onClick={() => navigate('/attendance')}>Attendance</Button></Grid>
              <Grid item xs={12} sm={6} md={3}><Button fullWidth variant="outlined" onClick={() => navigate('/activities')}>Activities</Button></Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Today at a glance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Today at a glance</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Check-ins</Typography>
                <Typography variant="h5">—</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Check-outs</Typography>
                <Typography variant="h5">—</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Activities Scheduled</Typography>
                <Typography variant="h5">—</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Visitors</Typography>
                <Typography variant="h5">—</Typography>
              </Box>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Button size="small" variant="text" onClick={() => navigate('/attendance')}>Open attendance</Button>
            </Box>
          </Paper>
        </Grid>

        {/* My Tasks */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>My Tasks</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button variant="outlined" onClick={() => navigate('/communication')}>Send daily update to parents</Button>
              <Button variant="outlined" onClick={() => navigate('/meal-planning')}>Review meal plan</Button>
              <Button variant="outlined" onClick={() => navigate('/activities')}>Confirm afternoon activity</Button>
            </Box>
          </Paper>
        </Grid>

        {/* Announcements */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Announcements</Typography>
            <Typography variant="body2" color="text.secondary">
              No announcements yet. Admin messages and emergency alerts will appear here.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
