import React from 'react';
import { Box, Typography, Card, CardHeader, CardContent, Grid, TextField, MenuItem, Button } from '@mui/material';

const ParentFeedback = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Feedback & Complaints</Typography>
      <Card>
        <CardHeader title="Submit Feedback" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth label="Category" defaultValue="feedback">
                <MenuItem value="feedback">Feedback</MenuItem>
                <MenuItem value="complaint">Complaint</MenuItem>
                <MenuItem value="suggestion">Suggestion</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Subject" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={4} label="Details" />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained">Submit</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ParentFeedback;




