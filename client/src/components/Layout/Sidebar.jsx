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
  Person
} from '@mui/icons-material';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Children', icon: <ChildCare />, path: '/children' },
  { text: 'Parents', icon: <People />, path: '/parents' },
  { text: 'Staff', icon: <Group />, path: '/staff' },
  { text: 'Attendance', icon: <AccessTime />, path: '/attendance' },
  { text: 'Billing', icon: <Payment />, path: '/billing' },
  { text: 'Activities', icon: <LocalActivity />, path: '/activities' },
  { text: 'Reports', icon: <Assessment />, path: '/reports' },
  { text: 'Profile', icon: <Person />, path: '/profile' },
];

const Sidebar = ({ mobileOpen, onDrawerToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();

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
              selected={location.pathname === item.path}
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
                  color: location.pathname === item.path ? 'white' : 'inherit',
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