import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  IconButton,
  useTheme,
  useMediaQuery,
  Fade,
  Slide,
  Zoom
} from '@mui/material';
import {
  ChildCare,
  People,
  AccessTime,
  Payment,
  Group,
  Assessment,
  Menu as MenuIcon,
  ArrowForward,
  Security,
  Speed,
  Support,
  ShoppingCart
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { ecommerceConfig, handleEcommerceNavigation } from '../../config/ecommerce';

// Styled Components
const HeroSection = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: `
    linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.4) 100%),
    url('/Landing_image.jpg')
  `,
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',
  backgroundAttachment: 'fixed',
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.1) 100%)
    `,
    zIndex: 2,
  },
  // Responsive background handling
  [theme.breakpoints.down('md')]: {
    backgroundAttachment: 'scroll',
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
  },
  [theme.breakpoints.down('sm')]: {
    minHeight: '80vh',
    backgroundPosition: 'center center',
  }
}));

const FeatureCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.3s ease-in-out',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-10px)',
    boxShadow: theme.shadows[10],
  }
}));

const StatsCard = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  color: 'white',
  padding: theme.spacing(3),
}));

const FloatingIcon = styled(Box)(({ theme }) => ({
  width: 80,
  height: 80,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 16px',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'scale(1.1)',
  },
  '& .MuiSvgIcon-root': {
    fontSize: '2rem',
    color: 'white',
  }
}));

const LandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [scrolled, setScrolled] = React.useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Ecommerce handler
  const handleEcommerceClick = () => {
    // Navigate internally to our shop route for reliability
    navigate('/shop');
  };

  const features = [
    {
      icon: <ChildCare />,
      title: 'Child Management',
      description: 'Complete profiles, medical records, allergies, and developmental milestones tracking for every child.',
      delay: 100
    },
    {
      icon: <People />,
      title: 'Parent Portal',
      description: 'Real-time updates, photo sharing, and seamless communication between parents and caregivers.',
      delay: 200
    },
    {
      icon: <AccessTime />,
      title: 'Attendance Tracking',
      description: 'Digital check-in/out system with automated notifications and detailed attendance reports.',
      delay: 300
    },
    {
      icon: <Payment />,
      title: 'Billing & Payments',
      description: 'Automated invoicing, payment processing, and financial reporting to streamline your revenue.',
      delay: 400
    },
    {
      icon: <Group />,
      title: 'Staff Management',
      description: 'Employee scheduling, performance tracking, and role-based access control.',
      delay: 500
    },
    {
      icon: <Assessment />,
      title: 'Analytics & Reports',
      description: 'Comprehensive insights into your daycare operations with customizable reports and dashboards.',
      delay: 600
    }
  ];

  const stats = [
    { number: '500+', label: 'Daycare Centers' },
    { number: '10,000+', label: 'Happy Children' },
    { number: '25,000+', label: 'Satisfied Parents' },
    { number: '99.9%', label: 'Uptime' }
  ];

  const benefits = [
    {
      icon: <Security />,
      title: 'Secure & Compliant',
      description: 'Bank-level security with COPPA compliance for child data protection.'
    },
    {
      icon: <Speed />,
      title: 'Lightning Fast',
      description: 'Cloud-based system with 99.9% uptime and instant data synchronization.'
    },
    {
      icon: <Support />,
      title: '24/7 Support',
      description: 'Dedicated customer support team available whenever you need assistance.'
    }
  ];

  return (
    <Box>
      {/* Navigation */}
      <AppBar 
        position="fixed" 
        sx={{ 
          background: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          boxShadow: scrolled ? 2 : 0,
          transition: 'all 0.3s ease',
          color: scrolled ? 'text.primary' : 'white'
        }}
      >
        <Toolbar>
          <Typography 
            variant="h5" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 700,
              fontFamily: 'Poppins, sans-serif',
              color: scrolled ? 'primary.main' : 'white'
            }}
          >
            TinyTots
          </Typography>
          
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2, mr: 3 }}>
              <Button 
                color="inherit" 
                sx={{ color: scrolled ? 'text.primary' : 'white' }}
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Features
              </Button>
              
              {/* Ecommerce Shop Button */}
              {ecommerceConfig.enabled && (
                <Button 
                  color="inherit" 
                  startIcon={<ShoppingCart />}
                  onClick={handleEcommerceClick}
                  sx={{ 
                    color: scrolled ? 'text.primary' : 'white',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '20px',
                    px: 2,
                    border: scrolled ? '1px solid rgba(25, 118, 210, 0.3)' : '1px solid rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      backgroundColor: scrolled ? 'rgba(25, 118, 210, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                      borderColor: scrolled ? 'rgba(25, 118, 210, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease-in-out'
                  }}
                >
                  🛒 Shop
                </Button>
              )}
              
              <Button 
                color="inherit" 
                sx={{ color: scrolled ? 'text.primary' : 'white' }}
                onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
              >
                About
              </Button>
            </Box>
          )}
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Mobile Ecommerce Button */}
            {isMobile && ecommerceConfig.enabled && (
              <IconButton
                color="inherit"
                onClick={handleEcommerceClick}
                sx={{
                  color: scrolled ? 'primary.main' : 'white',
                  border: scrolled ? '1px solid rgba(25, 118, 210, 0.3)' : '1px solid rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    backgroundColor: scrolled ? 'rgba(25, 118, 210, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                    borderColor: scrolled ? 'rgba(25, 118, 210, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                  }
                }}
                title="Visit Our Shop"
              >
                <ShoppingCart />
              </IconButton>
            )}
            
            <Button 
              variant="outlined" 
              onClick={() => navigate('/login')}
              sx={{ 
                color: scrolled ? 'primary.main' : 'white',
                borderColor: scrolled ? 'primary.main' : 'white',
                '&:hover': {
                  borderColor: scrolled ? 'primary.dark' : 'rgba(255,255,255,0.8)',
                  backgroundColor: scrolled ? 'primary.main' : 'rgba(255,255,255,0.1)',
                  color: scrolled ? 'white' : 'white'
                }
              }}
            >
              Login
            </Button>
            <Button 
              variant="contained" 
              onClick={() => navigate('/register')}
              sx={{ 
                backgroundColor: scrolled ? 'primary.main' : 'white',
                color: scrolled ? 'white' : 'primary.main',
                '&:hover': {
                  backgroundColor: scrolled ? 'primary.dark' : 'rgba(255,255,255,0.9)',
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
            >
              Get Started
            </Button>
          </Box>
          
          {isMobile && (
            <IconButton 
              color="inherit" 
              sx={{ ml: 1, color: scrolled ? 'text.primary' : 'white' }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <HeroSection>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 10 }}>
          <Fade in timeout={1000}>
            <Box textAlign="center" color="white">
              <Typography 
                variant="h2" 
                component="h1" 
                gutterBottom
                sx={{ 
                  fontWeight: 700,
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  mb: 3,
                  color: 'white',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.6)'
                }}
              >
                Welcome to TinyTots
              </Typography>
              <Typography 
                variant="h5" 
                component="p" 
                sx={{ 
                  mb: 4, 
                  opacity: 0.95,
                  maxWidth: '800px',
                  mx: 'auto',
                  fontSize: { xs: '1.1rem', md: '1.3rem' },
                  color: 'white',
                  lineHeight: 1.6,
                  textShadow: '1px 1px 3px rgba(0,0,0,0.5)'
                }}
              >
                The complete daycare management solution that streamlines operations, 
                enhances parent communication, and ensures the best care for every child.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  size="large"
                  onClick={() => navigate('/register')}
                  endIcon={<ArrowForward />}
                  sx={{ 
                    backgroundColor: 'white',
                    color: 'primary.main',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    borderRadius: '50px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      transform: 'translateY(-3px)',
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
                    }
                  }}
                >
                  Start Free Trial
                </Button>
                <Button 
                  variant="outlined" 
                  size="large"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  sx={{ 
                    borderColor: 'white',
                    color: 'white',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    borderRadius: '50px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderColor: 'white',
                      transform: 'translateY(-3px)',
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
                    }
                  }}
                >
                  Learn More
                </Button>
              </Box>
            </Box>
          </Fade>
        </Container>
      </HeroSection>

      {/* Features Section */}
      <Box id="features" sx={{ py: 8, backgroundColor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Slide direction="up" in timeout={800}>
            <Box textAlign="center" mb={6}>
              <Typography 
                variant="h3" 
                component="h2" 
                gutterBottom
                sx={{ 
                  fontWeight: 700,
                  fontFamily: 'Poppins, sans-serif',
                  color: 'text.primary',
                  fontSize: { xs: '2rem', md: '2.5rem' }
                }}
              >
                Everything You Need to Manage Your Daycare
              </Typography>
              <Typography 
                variant="h6" 
                color="text.secondary"
                sx={{ maxWidth: '600px', mx: 'auto' }}
              >
                Comprehensive tools designed specifically for daycare centers, preschools, and childcare facilities.
              </Typography>
            </Box>
          </Slide>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Zoom in timeout={800 + feature.delay}>
                  <FeatureCard>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <FloatingIcon>
                        {feature.icon}
                      </FloatingIcon>
                      <Typography 
                        variant="h5" 
                        component="h3" 
                        gutterBottom
                        sx={{ 
                          fontWeight: 600,
                          fontFamily: 'Poppins, sans-serif',
                          color: 'text.primary'
                        }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </FeatureCard>
                </Zoom>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box sx={{ py: 8, background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Fade in timeout={1000 + index * 200}>
                  <StatsCard>
                    <Typography 
                      variant="h3" 
                      component="div" 
                      gutterBottom
                      sx={{ 
                        fontWeight: 700,
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: { xs: '2rem', md: '3rem' }
                      }}
                    >
                      {stat.number}
                    </Typography>
                    <Typography variant="h6" sx={{ opacity: 0.9 }}>
                      {stat.label}
                    </Typography>
                  </StatsCard>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Benefits Section */}
      <Box id="about" sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography 
              variant="h3" 
              component="h2" 
              gutterBottom
              sx={{ 
                fontWeight: 700,
                fontFamily: 'Poppins, sans-serif',
                color: 'text.primary'
              }}
            >
              Why Choose TinyTots?
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Built by childcare professionals, for childcare professionals.
            </Typography>
          </Box>
          
          <Grid container spacing={4}>
            {benefits.map((benefit, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Slide direction="up" in timeout={800 + index * 200}>
                  <Box textAlign="center">
                    <FloatingIcon>
                      {benefit.icon}
                    </FloatingIcon>
                    <Typography 
                      variant="h5" 
                      component="h3" 
                      gutterBottom
                      sx={{ 
                        fontWeight: 600,
                        fontFamily: 'Poppins, sans-serif'
                      }}
                    >
                      {benefit.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {benefit.description}
                    </Typography>
                  </Box>
                </Slide>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: 8, backgroundColor: 'grey.900', color: 'white', textAlign: 'center' }}>
        <Container maxWidth="md">
          <Fade in timeout={1000}>
            <Box>
              <Typography 
                variant="h3" 
                component="h2" 
                gutterBottom
                sx={{ 
                  fontWeight: 700,
                  fontFamily: 'Poppins, sans-serif',
                  mb: 2
                }}
              >
                Ready to Transform Your Daycare?
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                Join thousands of daycare centers already using TinyTots to provide better care and streamline operations.
              </Typography>
              <Button 
                variant="contained" 
                size="large"
                onClick={() => navigate('/register')}
                endIcon={<ArrowForward />}
                sx={{ 
                  backgroundColor: 'primary.main',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  borderRadius: '50px',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                    transform: 'translateY(-3px)',
                    boxShadow: 6
                  }
                }}
              >
                Start Your Free Trial Today
              </Button>
            </Box>
          </Fade>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 6, backgroundColor: 'grey.100' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={3}>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ 
                  fontWeight: 700,
                  fontFamily: 'Poppins, sans-serif',
                  color: 'primary.main'
                }}
              >
                TinyTots
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The leading daycare management system trusted by childcare professionals worldwide.
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Features
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Child Management</Typography>
                <Typography variant="body2" color="text.secondary">Parent Portal</Typography>
                <Typography variant="body2" color="text.secondary">Attendance Tracking</Typography>
                <Typography variant="body2" color="text.secondary">Billing & Payments</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Support
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Help Center</Typography>
                <Typography variant="body2" color="text.secondary">Contact Us</Typography>
                <Typography variant="body2" color="text.secondary">Training</Typography>
                <Typography variant="body2" color="text.secondary">API Documentation</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Company
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">About Us</Typography>
                <Typography variant="body2" color="text.secondary">Privacy Policy</Typography>
                <Typography variant="body2" color="text.secondary">Terms of Service</Typography>
                <Typography variant="body2" color="text.secondary">Careers</Typography>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 4, pt: 4, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              © 2024 TinyTots. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;