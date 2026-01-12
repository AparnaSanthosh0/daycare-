import React from 'react';
import { Container, Grid, Typography, Paper } from '@mui/material';
import NearbyParentsMap from '../Maps/NearbyParentsMap';

const StaffLocationDashboard = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        🗺️ Live Pickup Monitoring
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Monitor parents who are currently en route to pick up their children. 
            The map updates in real-time showing their location and estimated arrival time.
          </Typography>
          
          <NearbyParentsMap />
        </Grid>
      </Grid>
    </Container>
  );
};

export default StaffLocationDashboard;
