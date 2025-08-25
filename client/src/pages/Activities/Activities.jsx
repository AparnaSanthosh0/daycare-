import React from 'react';
import { Typography, Box, Paper } from '@mui/material';

const Activities = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Activities & Programs
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Activities and program management features will be implemented here. This will include:
        </Typography>
        <ul>
          <li>Daily activity planning</li>
          <li>Educational programs</li>
          <li>Activity reports for parents</li>
          <li>Photo sharing</li>
          <li>Milestone tracking</li>
        </ul>
      </Paper>
    </Box>
  );
};

export default Activities;