import React from 'react';
import { Box, Typography, Card, CardHeader, CardContent, Button } from '@mui/material';

const ParentBilling = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Billing & Payments</Typography>
      <Card>
        <CardHeader title="Invoices & Payments" />
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Connect this module to your billing API to load and pay invoices.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="outlined">View Latest Invoice</Button>
            <Button variant="contained">Pay Now</Button>
            <Button variant="text">Manage Subscription</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ParentBilling;




