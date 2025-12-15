import React from 'react';
import { Box, Container, Grid, Card, CardActionArea, CardContent, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { School, DirectionsCar, LocalShipping, ChildCare } from '@mui/icons-material';

// Staff role configurations
const staffRoles = [
  { type: 'teacher', title: 'Teacher', icon: <School />, description: 'Early childhood education and child development', color: 'primary' },
  { type: 'driver', title: 'Driver', icon: <DirectionsCar />, description: 'Safe transportation for children', color: 'success' },
  { type: 'delivery', title: 'Delivery Staff', icon: <LocalShipping />, description: 'Product and service delivery', color: 'info' },
  { type: 'nanny', title: 'Nanny at Home Service', icon: <ChildCare />, description: 'In-home childcare services', color: 'warning' }
];

// Role images for cards
const roleImages = {
  teacher: '/jobs/teacher.jpg',
  nanny: '/jobs/nanny2.jpg',
  delivery: '/jobs/image.png',
  vendor: '/jobs/vendorr.jpg'
};

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
          <Typography variant="h6" sx={{ opacity: 0.9, mt: 1 }}>
            Select your desired role to begin registration
          </Typography>
        </Box>

        {/* Parent/Children Registration - First */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Parent Registration
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
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
                  <Button onClick={() => navigate('/register/parent')} variant="contained" color="primary" fullWidth>Go to Parent Registration</Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Staff Role Selection */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Staff Positions
          </Typography>
          <Grid container spacing={3}>
            {staffRoles.map((role) => (
              <Grid item xs={12} sm={6} md={4} key={role.type}>
                <Card 
                  sx={{ 
                    borderRadius: 3, 
                    overflow: 'hidden',
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6
                    }
                  }}
                >
                  <CardActionArea onClick={() => navigate(`/register/${role.type}`, { state: { staffType: role.type } })}>
                    <CardContent sx={{ p: 0 }}>
                      {(() => {
                        // Background image per role (driver, teacher, nanny, delivery). Fallback to gradient.
                        const backgroundImage = role.type === 'driver'
                          ? "url('/jobs/driver.jpg')"
                          : role.type === 'teacher'
                            ? `url('${roleImages.teacher}')`
                            : role.type === 'nanny'
                              ? `url('${roleImages.nanny}')`
                              : role.type === 'delivery'
                                ? `url('${roleImages.delivery}')`
                                : null;

                        return (
                          <>
                            <Box sx={{ 
                              height: 200, 
                              position: 'relative',
                              backgroundImage: backgroundImage || `linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(147, 51, 234, 0.8) 100%)`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white'
                            }}>
                              {!backgroundImage && (
                                <Box sx={{ fontSize: 48, mb: 2 }}>
                                  {role.icon}
                                </Box>
                              )}
                              {backgroundImage ? (
                                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0.15))' }} />
                              ) : null}
                              <Box sx={{ position: backgroundImage ? 'absolute' : 'static', bottom: backgroundImage ? 0 : 'auto', p: backgroundImage ? 3 : 0, textAlign: backgroundImage ? 'left' : 'center' }}>
                                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                  {role.title}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                  {role.description}
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ p: 2 }}>
                              <Button 
                                fullWidth 
                                variant="contained" 
                                color={role.color}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/register/${role.type}`, { state: { staffType: role.type } });
                                }}
                              >
                                Apply as {role.title}
                              </Button>
                            </Box>
                          </>
                        );
                      })()}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Vendor Registration */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Vendor Registration
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  borderRadius: 3, 
                  overflow: 'hidden',
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}
              >
                <CardActionArea onClick={() => navigate('/vendor-register')}>
                  <CardContent sx={{ p: 0 }}>
                    <Box sx={{ 
                      height: 200, 
                      position: 'relative',
                      backgroundImage: `url('${roleImages.vendor}')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}>
                      <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0.15))' }} />
                      <Box sx={{ position: 'absolute', bottom: 0, p: 3, color: 'white' }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          Vendor
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Service providers and suppliers registration
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                        Service providers and suppliers registration
                      </Typography>
                      <Button 
                        fullWidth 
                        variant="contained" 
                        color="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/vendor-register');
                        }}
                      >
                        Apply as Vendor
                      </Button>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          </Grid>
        </Box>

      </Container>
    </Box>
  );
};

export default JobsLanding;