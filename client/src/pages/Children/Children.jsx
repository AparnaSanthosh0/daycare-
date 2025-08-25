import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const Children = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Children Management
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Children management features will be implemented here. This will include:
        </Typography>
        <ul>
          <li>Add new children</li>
          <li>View children profiles</li>
          <li>Edit children information</li>
          <li>Manage enrollment status</li>
          <li>Track medical information and allergies</li>
        </ul>
      </Paper>
    </Box>
  );
};

export default Children;