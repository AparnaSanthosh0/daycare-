import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem
} from '@mui/material';
import { AccountCircle, Logout, ShoppingCart } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

const DashboardHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  const toAbsolute = (maybePath) => {
    if (!maybePath) return '';
    if (/^https?:\/\//i.test(maybePath)) return maybePath;
    let origin = (API_BASE_URL || '').replace(/\/?api\/?$/i, '').replace(/\/$/, '');
    if (!/^https?:\/\//i.test(origin) && typeof window !== 'undefined') {
      origin = window.location.origin;
    }
    const resource = String(maybePath).startsWith('/') ? String(maybePath) : `/${String(maybePath)}`;
    try { return new URL(resource, origin).href; } catch { return `${origin}${resource}`; }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - 240px)` },
        ml: { sm: `240px` },
        backgroundColor: 'transparent',
        boxShadow: 'none',
        zIndex: 1100,
        top: { xs: 0, md: -16 } // Move header up more for better visibility
      }}
    >
      <Box sx={{ height: 6, backgroundColor: '#4b314d', width: '100%' }} />
      <Toolbar
        sx={{
          width: '100%',
          gap: 3,
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          color: '#4b314d',
          borderRadius: { xs: 0, md: 12 },
          boxShadow: '0 12px 36px rgba(75,49,77,0.08)',
          border: '1px solid rgba(75,49,77,0.1)',
          px: 3,
          py: 1.5,
          mt: { xs: 0, md: 0.5 } // Reduced margin-top
        }}
      >
        {/* TinyTots Logo */}
        <Box
          onClick={() => navigate('/dashboard')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            '&:hover': { opacity: 0.8 }
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1abc9c, #2ecc71)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 18px rgba(46,204,113,0.25)'
            }}
          >
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, letterSpacing: 1 }}>
              TT
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1abc9c', letterSpacing: 1.2 }}>
              TinyTots
            </Typography>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: 2, color: 'rgba(26,188,156,0.75)' }}>
              Dashboard
            </Typography>
          </Box>
        </Box>

        {/* Ecommerce Icon */}
        <IconButton
          onClick={() => navigate('/shop')}
          sx={{
            backgroundColor: 'rgba(26,188,156,0.08)',
            '&:hover': { backgroundColor: 'rgba(26,188,156,0.18)' },
            color: '#1abc9c'
          }}
          aria-label="Go to ecommerce shop"
        >
          <ShoppingCart />
        </IconButton>

        {/* User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' }, fontWeight: 500 }}>
            Welcome, {user?.firstName || 'User'}
          </Typography>
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="dashboard-menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            sx={{
              backgroundColor: 'rgba(26,188,156,0.08)',
              '&:hover': { backgroundColor: 'rgba(26,188,156,0.18)' }
            }}
          >
            <Avatar
              src={user?.profileImage ? `${toAbsolute(user.profileImage)}?v=${encodeURIComponent(user?.updatedAt || '')}` : undefined}
              sx={{ width: 36, height: 36 }}
            >
              {(!user?.profileImage && user?.firstName) ? user.firstName.charAt(0) : ''}
            </Avatar>
          </IconButton>
        </Box>
      </Toolbar>

      {/* User Dropdown Menu */}
      <Menu
        id="dashboard-menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        sx={{
          mt: 1,
          '& .MuiMenu-paper': {
            borderRadius: 2,
            boxShadow: '0 12px 36px rgba(75,49,77,0.15)',
            border: '1px solid rgba(75,49,77,0.1)'
          }
        }}
      >
        <MenuItem onClick={() => { handleClose(); navigate('/profile'); }}>
          <AccountCircle sx={{ mr: 1, color: '#1abc9c' }} />
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1, color: '#d32f2f' }} />
          Logout
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default DashboardHeader;
