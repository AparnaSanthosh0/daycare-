import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const Profile = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        User Profile
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          User profile management features will be implemented here. This will include:
        </Typography>
        <ul>
          <li>Edit personal information</li>
          <li>Change password</li>
          <li>Update contact details</li>
          <li>Notification preferences</li>
          <li>Profile picture upload</li>
        </ul>
      </Paper>
    </Box>
  );
};

export default Profile;