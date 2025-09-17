import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Grid, Typography, Button } from '@mui/material';

/*
  DiscoverySection
  - Two-column callout inspired by your reference (abts.png)
  - Uses existing project images from public/ instead of external files
*/
const DiscoverySection = () => {
  const navigate = useNavigate();

  const handleLearnMore = () => {
    navigate('/approach');
  };

  return (
    <Box id="discovery" sx={{ py: { xs: 6, md: 10 }, backgroundColor: 'rgba(59,130,246,0.06)' }}>
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          {/* Left image */}
          <Grid item xs={12} md={6}>
            <Box
              component="img"
              src={`${process.env.PUBLIC_URL}/landing/tt.jpg`}
              alt="Children discovering through play"
              sx={{
                width: '100%',
                height: { xs: 240, md: 400 },
                objectFit: 'cover',
                borderRadius: 3,
                boxShadow: '0 10px 30px rgba(2,132,199,0.25)'
              }}
            />
          </Grid>

          {/* Right content */}
          <Grid item xs={12} md={6}>
            <Box sx={{ maxWidth: 560, ml: { md: 4 } }}>
              <Box sx={{ width: 120, height: 8, backgroundColor: '#f59e0b', borderRadius: 9999, mb: 2 }} />
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
                Discovery: At the Heart of TinyTots
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                Our play-based approach nurtures curiosity and confidence. Children explore, observe,
                and learn through meaningful activities tailored for early childhood development.
              </Typography>
              <Button variant="contained" onClick={handleLearnMore}>Learn More</Button>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default DiscoverySection;