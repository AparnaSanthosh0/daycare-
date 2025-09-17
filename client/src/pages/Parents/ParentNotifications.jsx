import React from 'react';
import { Box, Card, CardHeader, CardContent, Grid, Typography } from '@mui/material';

const ParentNotifications = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Notifications</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Visitor & Pickup Notifications" />
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Real-time alerts when someone arrives for pickup or visits your child.
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'warning.50', border: '1px dashed', borderColor: 'warning.main', borderRadius: 1 }}>
                <Typography variant="body2"><strong>Example:</strong> Grandma approved for pickup at 3:10 PM.</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Emergency Alerts" />
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Immediate alerts during emergencies will appear here.
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'error.50', border: '1px dashed', borderColor: 'error.main', borderRadius: 1 }}>
                <Typography variant="body2"><strong>Example:</strong> Shelter-in-place drill completed successfully.</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ParentNotifications;




