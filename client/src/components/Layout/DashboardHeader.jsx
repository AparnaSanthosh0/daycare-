import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton
} from '@mui/material';
import { 
  AccountCircle, 
  Logout, 
  ShoppingCart,
  Menu as MenuIcon,
  Dashboard,
  ChildCare,
  People,
  Group,
  AccessTime,
  Payment,
  LocalActivity,
  Assessment,
  Email,
  Person,
  SupervisorAccount,
  ManageAccounts,
  Inventory2,
  LocalHospital,
  DirectionsCar
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import VoiceAssistant from '../../VoiceAssistant';
import Dialog from '@mui/material/Dialog';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

const getMenuItems = (userRole, user) => {
  if (userRole === 'admin') {
    return [
      { text: 'Admin Home', icon: <SupervisorAccount />, path: '/admin' },
      { text: 'Order Management', icon: <ShoppingCart />, path: '/admin/orders' },
      { text: 'Users', icon: <ManageAccounts />, path: '/admin/users' },
      { text: 'Doctor Management', icon: <LocalHospital />, path: '/admin/doctors' },
      { text: 'Attendance', icon: <AccessTime />, path: '/attendance' },
      { text: 'Meal Planning', icon: <LocalActivity />, path: '/meal-planning' },
      { text: 'Billing', icon: <Payment />, path: '/billing' },
      { text: 'Activities', icon: <LocalActivity />, path: '/activities' },
      { text: 'Visitor Management', icon: <People />, path: '/visitors' },
      { text: 'Emergency Response', icon: <Assessment />, path: '/emergency' },
      { text: 'Transport & Pickup', icon: <Group />, path: '/transport' },
      { text: 'Communication', icon: <Email />, path: '/communication' },
      { text: 'Reports', icon: <Assessment />, path: '/reports' },
      { text: 'Inventory', icon: <Inventory2 />, path: '/admin/inventory' },
      { text: 'Meal Plan Approval', icon: <LocalActivity />, path: '/meal-plan-approval' },
      { text: 'Profile', icon: <Person />, path: '/profile' },
    ];
  }
  if (userRole === 'vendor') {
    return [
      { text: 'Vendor Home', icon: <SupervisorAccount />, path: '/vendor' },
      { text: 'Order Management', icon: <ShoppingCart />, path: '/vendor/orders' },
      { text: 'Supplier & Vendor Management', icon: <LocalActivity />, path: '/vendor?tab=0' },
      { text: 'Performance & Contract', icon: <Assessment />, path: '/vendor?tab=1' },
      { text: 'Invoices & Payments', icon: <Payment />, path: '/vendor?tab=2' },
      { text: 'Products', icon: <ChildCare />, path: '/vendor?tab=7' },
      { text: 'Profile', icon: <Person />, path: '/vendor' },
    ];
  }
  if (userRole === 'staff') {
    const isDriver = user?.staff?.staffType === 'driver';
    const isNanny = user?.staff?.staffType === 'nanny';
    const isDelivery = user?.staff?.staffType === 'delivery';
    const isTeacher = user?.staff?.staffType === 'teacher';
    
    if (isDriver) {
      return [
        { text: 'Driver Dashboard', icon: <DirectionsCar />, path: '/driver' },
        { text: 'Profile', icon: <Person />, path: '/profile' },
      ];
    }
    if (isNanny) {
      return [
        { text: 'Nanny Dashboard', icon: <ChildCare />, path: '/nanny' },
        { text: 'Profile', icon: <Person />, path: '/profile' },
      ];
    }
    if (isDelivery) {
      return [
        { text: 'Delivery Dashboard', icon: <LocalActivity />, path: '/delivery' },
        { text: 'Profile', icon: <Person />, path: '/profile' },
      ];
    }
    if (isTeacher) {
      return [
        { text: 'Teacher Dashboard', icon: <Group />, path: '/teacher' },
        { text: 'Attendance', icon: <AccessTime />, path: '/attendance' },
        { text: 'Meal Planning', icon: <LocalActivity />, path: '/meal-planning' },
        { text: 'Activities', icon: <LocalActivity />, path: '/activities' },
        { text: 'Visitor Management', icon: <People />, path: '/visitors' },
        { text: 'Emergency Response', icon: <Assessment />, path: '/emergency' },
        { text: 'Transport & Pickup', icon: <Group />, path: '/transport' },
        { text: 'Communication', icon: <Email />, path: '/communication' },
        { text: 'Reports', icon: <Assessment />, path: '/reports' },
        { text: 'Feedback', icon: <Assessment />, path: '/parent/feedback' },
        { text: 'Profile', icon: <Person />, path: '/profile' },
      ];
    }
    return [
      { text: 'Staff Dashboard', icon: <Group />, path: '/staff' },
      { text: 'Attendance', icon: <AccessTime />, path: '/attendance' },
      { text: 'Meal Planning', icon: <LocalActivity />, path: '/meal-planning' },
      { text: 'Activities', icon: <LocalActivity />, path: '/activities' },
      { text: 'Profile', icon: <Person />, path: '/profile' },
    ];
  }
  if (userRole === 'doctor') {
    return [
      { text: 'Doctor Dashboard', icon: <LocalHospital />, path: '/doctor' },
      { text: 'Profile', icon: <Person />, path: '/profile' },
    ];
  }
  if (userRole === 'parent') {
    return [
      { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
      { text: 'Staff', icon: <People />, path: '/parent/staff' },
      { text: 'Reports', icon: <Assessment />, path: '/parent/reports' },
      { text: 'Admissions', icon: <Assessment />, path: '/parent/admissions' },
      { text: 'Notifications', icon: <Assessment />, path: '/parent/notifications' },
      { text: 'Messaging', icon: <Email />, path: '/parent/messaging' },
      { text: 'Billing & Payments', icon: <Payment />, path: '/parent/billing' },
      { text: 'Attendance', icon: <AccessTime />, path: '/attendance' },
      { text: 'Activities', icon: <LocalActivity />, path: '/activities' },
      { text: 'Profile', icon: <Person />, path: '/profile' },
    ];
  }
  return [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Profile', icon: <Person />, path: '/profile' },
  ];
};

const DashboardHeader = () => {
    const [vaOpen, setVaOpen] = React.useState(false);
    const handleVaOpen = () => setVaOpen(true);
    const handleVaClose = () => setVaOpen(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

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

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const menuItems = getMenuItems(user?.role, user);
  const isTeacher = user?.role === 'staff' && user?.staff?.staffType === 'teacher';

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
    <>
    <AppBar
      position="fixed"
      sx={{
        width: '100%',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        zIndex: 1100,
        top: { xs: 0, md: -20 }
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
          mt: { xs: 0, md: 0.5 }
        }}
      >
        {/* Control Panel Button */}
        <IconButton
          onClick={toggleDrawer(true)}
          sx={{
            backgroundColor: 'rgba(26,188,156,0.08)',
            '&:hover': { backgroundColor: 'rgba(26,188,156,0.18)' },
            color: '#1abc9c'
          }}
          aria-label="Open control panel"
        >
          <MenuIcon />
        </IconButton>

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
          {/* Voice Assistant Button */}
          <IconButton
            onClick={handleVaOpen}
            sx={{
              background: 'linear-gradient(135deg, #43ea7f, #1abc9c)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(67,234,127,0.15)',
              width: 44,
              height: 44,
              ml: 1
            }}
            aria-label="Open Voice Assistant"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="rgba(255,255,255,0.08)"/>
              <path d="M12 17c1.66 0 3-1.34 3-3V9c0-1.66-1.34-3-3-3s-3 1.34-3 3v5c0 1.66 1.34 3 3 3zm5-3c0 2.5-2 4.5-5 4.5S7 16.5 7 14h2c0 1.38 1.12 2.5 2.5 2.5S14 15.38 14 14h2z" fill="#fff"/>
            </svg>
          </IconButton>
        </Box>
      {/* Voice Assistant Dialog */}
      <Dialog open={vaOpen} onClose={handleVaClose} maxWidth="xs" fullWidth>
        <Box sx={{ p: 2, bgcolor: '#f6f8fa' }}>
          <VoiceAssistant />
        </Box>
      </Dialog>

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

      {/* Control Panel Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box'
          }
        }}
      >
        <Box
          sx={{ width: 280 }}
          role="presentation"
        >
          {isTeacher ? (
            <Box
              sx={{
                backgroundColor: '#5CE1E6',
                color: '#fff',
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              <People sx={{ fontSize: 32 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Teacher Dashboard
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2, backgroundColor: '#1abc9c', color: '#fff' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Control Panel
              </Typography>
            </Box>
          )}
          <Divider />
          <List sx={{ pt: 2 }}>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={(location.pathname + location.search) === item.path}
                  onClick={() => {
                    navigate(item.path);
                    setDrawerOpen(false);
                  }}
                  sx={{
                    py: 1.5,
                    px: 2,
                    ...(isTeacher ? {
                      '&.Mui-selected': {
                        backgroundColor: '#5CE1E6',
                        color: '#fff',
                        '& .MuiListItemIcon-root': {
                          color: '#fff',
                        },
                        '&:hover': {
                          backgroundColor: '#4AC5C9',
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(92, 225, 230, 0.08)',
                      },
                    } : {
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(26,188,156,0.12)',
                        color: '#1abc9c',
                        '&:hover': {
                          backgroundColor: 'rgba(26,188,156,0.2)',
                        },
                      },
                    }),
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isTeacher 
                        ? ((location.pathname + location.search) === item.path ? '#fff' : '#333')
                        : ((location.pathname + location.search) === item.path ? '#1abc9c' : 'inherit'),
                      minWidth: 40
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text}
                    primaryTypographyProps={{
                      sx: {
                        fontSize: '1rem',
                        fontWeight: isTeacher ? 400 : 500
                      }
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </AppBar>
    </>
  );
};

export default DashboardHeader;
