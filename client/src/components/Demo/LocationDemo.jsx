import React from 'react';
import { Container, Grid, Typography, Paper, Box } from '@mui/material';
import DaycareLocationMap from '../Maps/DaycareLocationMap';
import PickupTracker from '../Maps/PickupTracker';

const LocationDemo = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        📍 Location & Maps Features
      </Typography>

      <Grid container spacing={3}>
        {/* Daycare Location with Directions */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              🏫 Find Us & Get Directions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              View our location, get directions from your current location, or search for directions from any address.
            </Typography>
            <DaycareLocationMap 
              showDirections={true} 
              showSearch={true} 
            />
          </Paper>
        </Grid>

        {/* Pickup Tracker */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              🚗 Real-Time Pickup Tracking
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Parents can share their location when coming to pick up their child. 
              Staff will be notified when you're nearby!
            </Typography>
            <PickupTracker 
              parentName="Parent"
              childName="Child"
            />
          </Paper>
        </Grid>

        {/* Information Box */}
        <Grid item xs={12}>
          <Box sx={{ 
            bgcolor: 'info.light', 
            p: 3, 
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'info.main'
          }}>
            <Typography variant="h6" gutterBottom>
              ℹ️ How to Use
            </Typography>
            <ul>
              <li>
                <strong>Get Directions:</strong> Click "My Location" to use your current position, 
                or enter an address in the search box
              </li>
              <li>
                <strong>Start Pickup Tracking:</strong> Click "Start Tracking Pickup" when you're 
                on your way to pick up your child
              </li>
              <li>
                <strong>Geofence Alert:</strong> Staff will automatically be notified when you're 
                within 500 meters of the daycare
              </li>
              <li>
                <strong>Travel Mode:</strong> Switch between driving and walking directions
              </li>
            </ul>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default LocationDemo;
