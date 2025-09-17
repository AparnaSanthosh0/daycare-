import React from 'react';
import { Box, Typography, Card, CardHeader, CardContent, Grid, TextField, MenuItem, Button } from '@mui/material';

const ParentMessages = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Messaging</Typography>
      <Card>
        <CardHeader title="Send a Message" subheader="Communicate with staff or administration" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth label="To" defaultValue="staff">
                <MenuItem value="staff">Assigned Staff</MenuItem>
                <MenuItem value="admin">Administration</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField fullWidth label="Subject" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={4} label="Message" />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained">Send</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ParentMessages;




