import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  // CardContent,
  AppBar,
  Toolbar,
  IconButton,
  useTheme,
  useMediaQuery,
  Fade,
  Slide,
  // Zoom,
  Menu,
  MenuItem
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
import { ecommerceConfig } from '../../config/ecommerce';
import DiscoverySection from './DiscoverySection';

// Styled Components
const HeroSection = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: `
    linear-gradient(135deg, rgba(20, 184, 166, 0.35) 0%, rgba(251, 113, 133, 0.35) 100%)
  `,
  backgroundSize: 'cover',
  backgroundPosition: 'center 35%',
  backgroundRepeat: 'no-repeat',
  backgroundAttachment: 'fixed',
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  overflow: 'hidden',
  animation: 'bg-zoom-pan 35s ease-in-out infinite',
  '@keyframes bg-zoom-pan': {
    '0%': { backgroundPosition: 'center 20%', backgroundSize: '115% 115%' },
    '50%': { backgroundPosition: 'center 10%', backgroundSize: '110% 110%' },
    '100%': { backgroundPosition: 'center 20%', backgroundSize: '115% 115%' }
  },
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
      radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.15) 100%)
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



// Removed unused StatsCard

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
  const [jobsAnchor, setJobsAnchor] = React.useState(null);
  const openJobs = Boolean(jobsAnchor);
  
  // Hidden admin login trigger (5 taps on brand within 3s)
  const [adminTap, setAdminTap] = React.useState(0);
  const tapTimeout = React.useRef(null);
  const handleSecretTap = () => {
    if (tapTimeout.current) clearTimeout(tapTimeout.current);
    setAdminTap((c) => c + 1);
    tapTimeout.current = setTimeout(() => setAdminTap(0), 3000);
  };
  React.useEffect(() => {
    if (adminTap >= 5) {
      navigate('/admin-login');
      setAdminTap(0);
    }
  }, [adminTap, navigate]);

  // Unified nav button style
  const navButtonSx = {
    color: scrolled ? 'text.primary' : 'white',
    fontWeight: 600,
    textTransform: 'none',
    borderRadius: '20px',
    px: 2,
    border: scrolled ? '1px solid rgba(25, 118, 210, 0.3)' : '1px solid rgba(255, 255, 255, 0.3)',
    '&:hover': {
      backgroundColor: scrolled ? 'rgba(25, 118, 210, 0.1)' : 'rgba(255, 255, 255, 0.1)',
      borderColor: scrolled ? 'rgba(25, 118, 210, 0.6)' : 'rgba(255, 255, 255, 0.6)',
      transform: 'translateY(-2px)'
    },
    transition: 'all 0.3s ease-in-out'
  };

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

  // Removed unused `features` array to satisfy ESLint no-unused-vars. Re-introduce when rendering a features grid.

  // Removed unused stats array

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
      {/* Decorative floating shapes */}
      <Box sx={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        '& .float': {
          position: 'absolute', borderRadius: '50%', opacity: 0.15,
          filter: 'blur(1px)', animation: 'floatY 12s ease-in-out infinite'
        },
        '@keyframes floatY': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' }
        }
      }}>
        <Box className="float" sx={{ width: 120, height: 120, background: '#90caf9', top: '15%', left: '8%', animationDelay: '0s' }} />
        <Box className="float" sx={{ width: 80, height: 80, background: '#f48fb1', top: '40%', right: '10%', animationDelay: '2s' }} />
        <Box className="float" sx={{ width: 100, height: 100, background: '#a5d6a7', bottom: '18%', left: '15%', animationDelay: '1s' }} />
      </Box>

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
            onClick={handleSecretTap}
            sx={{ 
              flexGrow: 1, 
              fontWeight: 700,
              fontFamily: 'Poppins, sans-serif',
              color: scrolled ? 'primary.main' : 'white',
              cursor: 'default'
            }}
            title=""
          >
            TinyTots
          </Typography>
          
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2, mr: 3 }}>
              <Button 
                color="inherit" 
                sx={navButtonSx}
                onClick={() => document.getElementById('discovery')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Features
              </Button>
              
              {/* Ecommerce Shop Button */}
              {ecommerceConfig.enabled && (
                <Button 
                  color="inherit" 
                  startIcon={<ShoppingCart />}
                  onClick={handleEcommerceClick}
                  sx={navButtonSx}
                >
                  Shop
                </Button>
              )}
              
              <Button 
                color="inherit" 
                sx={navButtonSx}
                onClick={(e) => setJobsAnchor(e.currentTarget)}
              >
                Search Jobs
              </Button>
              {/* On click go to dedicated Jobs page */}
              <Menu anchorEl={jobsAnchor} open={openJobs} onClose={() => setJobsAnchor(null)}
                MenuListProps={{ 'aria-labelledby': 'jobs-button' }}
              >
                <MenuItem onClick={() => { setJobsAnchor(null); navigate('/jobs'); }}>Open Jobs</MenuItem>
              </Menu>

              <Button 
                color="inherit" 
                sx={navButtonSx}
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
                <ShoppingCart fontSize="small" />
              </IconButton>
            )}
            
            <Button 
              color="inherit"
              variant="outlined" 
              onClick={() => navigate('/login')}
              sx={navButtonSx}
            >
              Login
            </Button>
            {/* Vendor Register moved under Jobs page */}
            <Button 
              color="inherit"
              variant="outlined" 
              onClick={() => navigate('/register/parent')}
              sx={navButtonSx}
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
        {/* Background slideshow - y.jpg, ss.jpg, o.jpg */}
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          {/* Slide 1 */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: "url('/landing/y.jpg?v=19')",
              backgroundSize: 'cover',
              backgroundPosition: 'center 50%',
              backgroundRepeat: 'no-repeat',
              opacity: 1,
              animation: 'heroFade 12s ease-in-out infinite',
              '@keyframes heroFade': {
                '0%': { opacity: 1 },
                '28%': { opacity: 1 },
                '33%': { opacity: 0 },
                '95%': { opacity: 0 },
                '100%': { opacity: 1 }
              }
            }}
          />
          {/* Slide 2: replaced with logo.jpg */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: "url('/logo.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center 38%',
              backgroundRepeat: 'no-repeat',
              filter: 'contrast(1.06) brightness(1.02)',
              opacity: 0,
              animation: 'heroFade 12s ease-in-out infinite',
              animationDelay: '4s'
            }}
          />
          {/* Slide 3: cd.jpg (moved from 2nd) */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: "url('/landing/cd.jpg?v=19')",
              backgroundSize: 'cover',
              backgroundPosition: 'center 38%',
              backgroundRepeat: 'no-repeat',
              filter: 'contrast(1.06) brightness(1.02)',
              opacity: 0,
              animation: 'heroFade 12s ease-in-out infinite',
              animationDelay: '8s'
            }}
          />
        </Box>
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
                  onClick={() => navigate('/register/parent')}
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
                {/* Secondary CTA removed per request */}
              </Box>
            </Box>
          </Fade>
        </Container>
      </HeroSection>

      {/* Discovery Callout (Inspired by abts.png) */}
      <DiscoverySection />

      {/* Features Section removed in favor of DiscoverySection (two-column hero with CTA to /approach) */}

      {/* Programs Section (like reference, without Summer Program) */}
      <Box sx={{ py: 10, backgroundColor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography 
              variant="h3" 
              component="h2" 
              gutterBottom
              sx={{ fontWeight: 700, fontFamily: 'Poppins, sans-serif', color: 'text.primary' }}
            >
              Our Early Education Programs Offer More Than Daycare
            </Typography>
            <Box sx={{ width: 120, height: 6, backgroundColor: 'primary.main', borderRadius: 3, mx: 'auto', opacity: 0.25 }} />
          </Box>

          {(() => {
            const programs = [
              {
                title: 'Infants',
                description: 'An exceptional place for your baby to thrive and grow',
                img: '/landing/adh.jpg?v=19'
              },
              {
                title: 'Toddler/Twos',
                description: 'An engaging world where toddlers learn and explore',
                img: '/landing/c.jpg?v=19'
              },
              {
                title: 'Preschool',
                description: 'Where curious children become inspired and ready for school',
                img: '/landing/cd.jpg?v=19'
              }
            ];
            return (
              <Grid container spacing={4} justifyContent="center">
                {programs.map((p, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Fade in timeout={800 + i * 200}>
                      <Box textAlign="center">
                        <Box
                          sx={{
                            width: 140,
                            height: 140,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            mx: 'auto',
                            mb: 2,
                            boxShadow: 3,
                            border: '4px solid white',
                            backgroundImage: `url(${p.img})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        />
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{p.title}</Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 320, mx: 'auto' }}>
                          {p.description}
                        </Typography>
                      </Box>
                    </Fade>
                  </Grid>
                ))}
              </Grid>
            );
          })()}
        </Container>
      </Box>

      {/* Stories/Carousel Section (replaces old stats) */}
      <Box sx={{ py: 8, backgroundColor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={4}>
            <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>Bringing Our Curriculum to Life</Typography>
          </Box>
          <Grid container spacing={3}>
            {[0,1,2].map((i) => (
              <Grid item xs={12} md={4} key={i}>
                <Box sx={{
                  height: 260,
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: 2,
                  backgroundColor: 'grey.200',
                  backgroundImage: i === 1 ? "url('/logo.jpg')" : `url('/landing/${i===0?'c.jpg':'cd.jpg'}?v=20')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }} />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button variant="outlined" size="large" onClick={() => navigate('/curriculum')}>Learn About Curriculum</Button>
          </Box>
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
                onClick={() => navigate('/register/parent')}
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                © 2024 TinyTots. All rights reserved.
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ cursor: 'pointer', opacity: 0.6, '&:hover': { opacity: 1, textDecoration: 'underline' } }}
                onClick={() => navigate('/admin-login')}
                title="Help & Docs"
              >
                Help & Docs
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;