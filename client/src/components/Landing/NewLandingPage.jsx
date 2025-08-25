import React, { useEffect, useState } from 'react';
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
  ShoppingCart,
  School
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { handleEcommerceNavigation } from '../../config/ecommerce';

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
  color: 'white'
}));

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'all 0.3s ease-in-out',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
  }
}));

const NewLandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Ecommerce handler
  const handleEcommerceClick = () => {
    // Navigate internally to our shop route for reliability
    navigate('/shop');
  };

  const features = [
    {
      icon: <ChildCare />,
      title: 'Child Management',
      description: 'Comprehensive child profiles with medical records, emergency contacts, and developmental tracking.'
    },
    {
      icon: <People />,
      title: 'Parent Portal',
      description: 'Real-time updates, photo sharing, and direct communication between parents and caregivers.'
    },
    {
      icon: <AccessTime />,
      title: 'Attendance Tracking',
      description: 'Digital check-in/out system with automated notifications and detailed attendance reports.'
    },
    {
      icon: <Payment />,
      title: 'Billing & Payments',
      description: 'Automated invoicing, online payments, and financial reporting for seamless transactions.'
    },
    {
      icon: <Group />,
      title: 'Staff Management',
      description: 'Employee scheduling, performance tracking, and role-based access control.'
    },
    {
      icon: <Assessment />,
      title: 'Reports & Analytics',
      description: 'Detailed insights into operations, attendance patterns, and business performance.'
    }
  ];

  return (
    <Box>
      {/* Navigation */}
      <AppBar 
        position="fixed" 
        sx={{ 
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 2px 20px rgba(0, 0, 0, 0.1)',
          color: 'text.primary'
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E8E 90%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}
            >
              <ChildCare sx={{ color: 'white', fontSize: 24 }} />
            </Box>
            <Typography 
              variant="h5" 
              component="div" 
              sx={{ 
                fontWeight: 700,
                fontFamily: 'Poppins, sans-serif',
                color: '#FF6B6B'
              }}
            >
              TinyTots
            </Typography>
          </Box>
          
          {/* Navigation Links */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 4, mr: 4 }}>
              <Button 
                color="inherit" 
                sx={{ 
                  color: 'text.primary',
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '1rem',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    color: '#FF6B6B'
                  }
                }}
                onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Home
              </Button>
              
              <Button 
                color="inherit" 
                sx={{ 
                  color: 'text.primary',
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '1rem',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    color: '#FF6B6B'
                  }
                }}
                onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
              >
                About
              </Button>
              
              <Button 
                color="inherit" 
                sx={{ 
                  color: 'text.primary',
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '1rem',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    color: '#FF6B6B'
                  }
                }}
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Modules
              </Button>
              
              <Button 
                color="inherit" 
                sx={{ 
                  color: 'text.primary',
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '1rem',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    color: '#FF6B6B'
                  }
                }}
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Contact
              </Button>
            </Box>
          )}
          
          {/* Login Button */}
          <Button
            variant="contained"
            onClick={() => navigate('/login')}
            sx={{
              background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E8E 90%)',
              borderRadius: '25px',
              px: 3,
              py: 1,
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
              '&:hover': {
                background: 'linear-gradient(45deg, #FF5252 30%, #FF7979 90%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 6px 20px rgba(255, 107, 107, 0.4)',
              }
            }}
          >
            Login / Signup
          </Button>
          
          {/* Mobile Menu */}
          {isMobile && (
            <IconButton 
              color="inherit" 
              sx={{ ml: 1, color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <HeroSection id="hero">
        <Container maxWidth="lg">
          <Fade in timeout={1000}>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                  fontFamily: 'Poppins, sans-serif',
                  lineHeight: 1.2
                }}
              >
                TinyTots – Caring for Children,
              </Typography>
              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontWeight: 700,
                  mb: 4,
                  fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                  fontFamily: 'Poppins, sans-serif',
                  lineHeight: 1.2,
                  color: '#FF6B6B'
                }}
              >
                Managing with Ease
              </Typography>
              
              <Typography
                variant="h5"
                sx={{
                  mb: 6,
                  opacity: 0.9,
                  fontWeight: 400,
                  fontSize: { xs: '1.2rem', md: '1.5rem' },
                  maxWidth: '600px',
                  mx: 'auto'
                }}
              >
                Complete daycare management and baby product sales system
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<School />}
                  onClick={() => navigate('/register')}
                  sx={{
                    background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E8E 90%)',
                    borderRadius: '30px',
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: '0 8px 25px rgba(255, 107, 107, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #FF5252 30%, #FF7979 90%)',
                      transform: 'translateY(-3px)',
                      boxShadow: '0 12px 35px rgba(255, 107, 107, 0.5)',
                    }
                  }}
                >
                  Admission Now
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<ShoppingCart />}
                  onClick={handleEcommerceClick}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    borderRadius: '30px',
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderWidth: '2px',
                    '&:hover': {
                      borderColor: '#FF6B6B',
                      backgroundColor: 'rgba(255, 107, 107, 0.1)',
                      borderWidth: '2px',
                      transform: 'translateY(-3px)',
                    }
                  }}
                >
                  Explore E-Commerce
                </Button>
              </Box>
            </Box>
          </Fade>
        </Container>
      </HeroSection>

      {/* Features Section */}
      <Box id="features" sx={{ py: 10, backgroundColor: '#f8f9fa' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
              Why Choose TinyTots?
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
              Comprehensive daycare management solution designed to streamline operations and enhance child care quality.
            </Typography>
          </Box>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Zoom in timeout={1000 + index * 200}>
                  <StyledCard>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 3,
                          color: 'white'
                        }}
                      >
                        {React.cloneElement(feature.icon, { fontSize: 'large' })}
                      </Box>
                      <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </StyledCard>
                </Zoom>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* About Section */}
      <Box id="about" sx={{ py: 10, backgroundColor: 'white' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
                About TinyTots
              </Typography>
              <Typography variant="h6" color="text.secondary" paragraph>
                We're dedicated to revolutionizing daycare management through innovative technology solutions.
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Our comprehensive platform combines child care management with e-commerce capabilities, 
                providing daycare centers with everything they need to operate efficiently while offering 
                parents convenient access to quality baby products.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                <Button
                  variant="contained"
                  startIcon={<ArrowForward />}
                  onClick={() => navigate('/register')}
                  sx={{
                    background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '25px',
                    px: 3,
                    py: 1.5,
                    fontWeight: 600,
                    textTransform: 'none'
                  }}
                >
                  Get Started Today
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '20px',
                  p: 4,
                  color: 'white',
                  textAlign: 'center'
                }}
              >
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                  Join 500+ Daycares
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Already using TinyTots to manage their operations and serve families better.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Contact Section */}
      <Box id="contact" sx={{ py: 10, backgroundColor: '#f8f9fa' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
              Ready to Get Started?
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ maxWidth: '600px', mx: 'auto' }}>
              Join thousands of daycare providers who trust TinyTots for their management needs.
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', mt: 4 }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/register')}
                sx={{
                  background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E8E 90%)',
                  borderRadius: '30px',
                  px: 4,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                Start Free Trial
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  borderColor: '#FF6B6B',
                  color: '#FF6B6B',
                  borderRadius: '30px',
                  px: 4,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#FF5252',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)'
                  }
                }}
              >
                Login
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 6, backgroundColor: '#2c3e50', color: 'white' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E8E 90%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2
                  }}
                >
                  <ChildCare sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  TinyTots
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Caring for children, managing with ease. Your complete daycare management solution.
              </Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.8 }}>
                © 2024 TinyTots. All rights reserved. | Privacy Policy | Terms of Service
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default NewLandingPage;