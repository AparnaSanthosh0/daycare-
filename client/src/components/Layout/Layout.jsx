import React, { useState } from 'react';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Header onMenuClick={handleDrawerToggle} />
      <Sidebar mobileOpen={mobileOpen} onDrawerToggle={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 240px)` },
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
        <Toolbar />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;