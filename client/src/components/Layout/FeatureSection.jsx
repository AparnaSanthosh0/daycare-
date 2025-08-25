import React from 'react';
import { Box, Button, IconButton, Typography, Divider } from '@mui/material';
import { ShoppingCart, Info, Help } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ecommerceConfig, handleEcommerceNavigation } from '../../config/ecommerce';

const FeatureSection = () => {
  const navigate = useNavigate();
  
  const handleEcommerceClick = () => {
    handleEcommerceNavigation(navigate, 'header-features');
  };

  const handleAboutClick = () => {
    // Navigate to about page or scroll to about section
    console.log('About clicked');
  };

  const handleHelpClick = () => {
    // Navigate to help/support page
    console.log('Help clicked');
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5, 
        mr: 3,
        borderRight: { sm: '1px solid rgba(255, 255, 255, 0.2)' },
        pr: { sm: 3 }
      }}
    >
      {/* Ecommerce Feature */}
      {ecommerceConfig.enabled && (
        <>
          <Button
            color="inherit"
            startIcon={<ShoppingCart />}
            onClick={handleEcommerceClick}
            sx={{
              textTransform: 'none',
              borderRadius: '25px',
              px: { xs: 1.5, sm: 2.5 },
              py: 0.5,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              fontWeight: 600,
              background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              '&:hover': {
                background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
                borderColor: 'rgba(255, 255, 255, 0.6)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              },
              transition: 'all 0.3s ease-in-out',
              display: { xs: 'none', sm: 'flex' }
            }}
          >
            🛒 {ecommerceConfig.buttonText.desktop}
          </Button>
          
          {/* Mobile Ecommerce Icon */}
          <IconButton
            color="inherit"
            onClick={handleEcommerceClick}
            sx={{
              display: { xs: 'flex', sm: 'none' },
              background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              '&:hover': {
                background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
                borderColor: 'rgba(255, 255, 255, 0.6)',
                transform: 'translateY(-2px)',
              }
            }}
            title="Visit Our Shop"
          >
            <ShoppingCart />
          </IconButton>
        </>
      )}
      
      {/* Additional Feature Buttons (Optional - can be enabled later) */}
      {false && ( // Set to true to enable additional features
        <>
          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255, 255, 255, 0.3)', mx: 1 }} />
          
          {/* About Button */}
          <IconButton
            color="inherit"
            onClick={handleAboutClick}
            sx={{
              display: { xs: 'none', md: 'flex' },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
            title="About TinyTots"
          >
            <Info />
          </IconButton>
          
          {/* Help Button */}
          <IconButton
            color="inherit"
            onClick={handleHelpClick}
            sx={{
              display: { xs: 'none', md: 'flex' },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
            title="Help & Support"
          >
            <Help />
          </IconButton>
        </>
      )}
      
      {/* Features Label */}
      <Typography 
        variant="caption" 
        sx={{ 
          display: { xs: 'none', md: 'block' },
          opacity: 0.8,
          fontSize: '0.7rem',
          fontStyle: 'italic',
          ml: 1
        }}
      >
        Features
      </Typography>
    </Box>
  );
};

export default FeatureSection;