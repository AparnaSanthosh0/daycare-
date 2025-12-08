import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider
} from '@mui/material';
import {
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
  ShoppingCart,
  LocalHospital,
  DirectionsCar
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 240;

const getMenuItems = (userRole, user) => {
  if (userRole === 'admin') {
    return [
      { text: 'Admin Home', icon: <SupervisorAccount />, path: '/admin' },
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
      { text: 'Order Management', icon: <ShoppingCart />, path: '/admin/orders' },
      { text: 'Meal Plan Approval', icon: <LocalActivity />, path: '/meal-plan-approval' },
      { text: 'Profile', icon: <Person />, path: '/profile' },
    ];
  }
  if (userRole === 'vendor') {
    return [
      { text: 'Supplier & Vendor Management', icon: <LocalActivity />, path: '/vendor?tab=0' },
      { text: 'Performance & Contract', icon: <Assessment />, path: '/vendor?tab=1' },
      { text: 'Invoices & Payments', icon: <Payment />, path: '/vendor?tab=2' },
      { text: 'Returns & Refunds', icon: <Assessment />, path: '/vendor?tab=3' },
      { text: 'Support & Ticketing', icon: <People />, path: '/vendor?tab=4' },
      { text: 'Reviews Moderation', icon: <Assessment />, path: '/vendor?tab=5' },
      { text: 'Gift Cards & Vouchers', icon: <Dashboard />, path: '/vendor?tab=6' },
      { text: 'Products', icon: <ChildCare />, path: '/vendor?tab=7' },
      { text: 'Order Management', icon: <ShoppingCart />, path: '/vendor/orders' },
      { text: 'Profile', icon: <Person />, path: '/vendor' },
    ];
  }
  if (userRole === 'staff') {
    // Check if user is a driver
    const isDriver = user?.staff?.staffType === 'driver';
    
    if (isDriver) {
      return [
        { text: 'Driver Dashboard', icon: <DirectionsCar />, path: '/driver' },
        { text: 'Profile', icon: <Person />, path: '/profile' },
      ];
    }
    
    // Regular staff menu
    return [
      { text: 'Teacher Dashboard', icon: <Group />, path: '/staff' },
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
  // Default app navigation
  return [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Attendance', icon: <AccessTime />, path: '/attendance' },
    { text: 'Meal Planning', icon: <LocalActivity />, path: '/staff' },
    { text: 'Activities', icon: <LocalActivity />, path: '/activities' },
    // Parent-focused modules as standalone pages
    { text: 'Notifications', icon: <Assessment />, path: '/parent/notifications' },
    { text: 'Messaging', icon: <Email />, path: '/parent/messaging' },
    { text: 'Billing', icon: <Payment />, path: '/parent/billing' },
    { text: 'Feedback', icon: <Assessment />, path: '/parent/feedback' },
    { text: 'Profile', icon: <Person />, path: '/profile' },
  ];
};

const Sidebar = ({ mobileOpen, onDrawerToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const menuItems = getMenuItems(user?.role, user);

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" color="primary">
          TinyTots
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={(location.pathname + location.search) === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: (location.pathname + location.search) === item.path ? 'white' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;