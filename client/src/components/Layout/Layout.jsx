import React, { useState } from 'react';
import { Box, CssBaseline } from '@mui/material';
import DashboardHeader from './DashboardHeader';

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <DashboardHeader />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          pt: { xs: 12, sm: 12 },
          width: '100%',
          minHeight: '100vh',
          position: 'relative',
          backgroundColor: 'background.default',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            backgroundImage: `linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.88)), url(${process.env.PUBLIC_URL}/toys.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'none'
          }
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;