import React from 'react';
import { Box, Container, Grid, Card, CardActionArea, CardContent, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Simple landing for job search: choose Parent / Vendor
const JobsLanding = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative', color: 'white' }}>
      {/* Background hero image */}
      <Box sx={{ position: 'absolute', inset: 0, backgroundImage: "url('/jobs/hero.jpg')", backgroundSize: 'cover', backgroundPosition: 'center 35%', filter: 'brightness(0.65)' }} />
      {/* Overlay gradient to match theme */}
      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.35) 0%, rgba(251, 113, 133, 0.35) 100%)' }} />

      {/* Back to landing */}
      <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 3 }}>
        <Button variant="contained" onClick={() => navigate('/')}>Back</Button>
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, py: { xs: 8, md: 12 } }}>
        <Box textAlign="center" sx={{ mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            Find Opportunities with TinyTots
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Choose your path to continue
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <CardActionArea onClick={() => navigate('/register/parent')}>
                <Box sx={{ height: 260, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', inset: 0, backgroundImage: "url('/jobs/parent.jpg')", backgroundSize: 'cover', backgroundPosition: 'center 35%' }} />
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0.15))' }} />
                  <Box sx={{ position: 'absolute', bottom: 0, p: 3, color: 'white' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>Parents</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Admission registration and parent onboarding</Typography>
                  </Box>
                </Box>
              </CardActionArea>
              <CardContent>
                <Button onClick={() => navigate('/register/parent')} variant="contained" color="primary">Go to Parent Registration</Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <CardActionArea onClick={() => navigate('/register/staff')}>
                <Box sx={{ height: 260, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', inset: 0, backgroundImage: "url('/jobs/staff.jpg')", backgroundSize: 'cover', backgroundPosition: 'center 35%' }} />
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0.15))' }} />
                  <Box sx={{ position: 'absolute', bottom: 0, p: 3, color: 'white' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>Staff</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Apply as caregiver, teacher, or support staff</Typography>
                  </Box>
                </Box>
              </CardActionArea>
              <CardContent>
                <Button onClick={() => navigate('/register/staff')} variant="contained" color="success">Go to Staff Registration</Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <CardActionArea onClick={() => navigate('/vendor-register')}>
                <Box sx={{ height: 260, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', inset: 0, backgroundImage: "url('/vendor-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0.15))' }} />
                  <Box sx={{ position: 'absolute', bottom: 0, p: 3, color: 'white' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>Vendors</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Service providers and suppliers registration</Typography>
                  </Box>
                </Box>
              </CardActionArea>
              <CardContent>
                <Button onClick={() => navigate('/vendor-register')} variant="contained" color="secondary">Go to Vendor Registration</Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default JobsLanding;