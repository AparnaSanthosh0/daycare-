import React from 'react';
import { Box, Container, Typography, TextField, InputAdornment, IconButton, Badge, Button, Divider, Menu, MenuItem } from '@mui/material';
import {
  Person,
  LocalShipping,
  Logout,
  ShoppingBag,
  AccountCircle,
  Search,
  FavoriteBorder,
  ShoppingCart
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useShop } from '../../contexts/ShopContext';

export default function ShopHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cartCount } = useShop();
  const [search, setSearch] = React.useState('');
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleMenu = (event) => {
    if (event?.currentTarget) {
      setAnchorEl(event.currentTarget);
    } else {
      setAnchorEl(null);
    }
    setMenuOpen(Boolean(event?.currentTarget));
  };

  const handleClose = () => {
    setAnchorEl(null);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  return (
    <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      {/* Top utility bar */}
      <Box sx={{ bgcolor: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
        <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer' }} onClick={() => navigate('/stores')}>
              Stores & Preschools
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer' }} onClick={() => navigate('/support')}>
              Support
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ cursor: 'pointer' }} onClick={() => navigate('/track-order')}>
              Track Order
            </Typography>
          </Box>

          {/* Login section at top right - only show when not logged in */}
          {!user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/customer-login')}
                sx={{ textTransform: 'none', borderRadius: '20px' }}
              >
                Customer Login
              </Button>
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={() => navigate('/customer-register')}
                sx={{ textTransform: 'none', borderRadius: '20px' }}
              >
                Register
              </Button>
            </Box>
          )}
        </Container>
      </Box>

      {/* Main header */}
      <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', gap: 3, py: 2 }}>
        {/* Logo */}
        <Typography
          variant="h4"
          sx={{
            color: '#ff6f00',
            fontWeight: 900,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
          onClick={() => navigate('/shop')}
        >
          TinyTots
        </Typography>

        {/* Search bar */}
        <TextField
          placeholder="Search for products, brands and more"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') navigate('/shop', { state: { q: search } }); }}
          sx={{
            flex: 1,
            maxWidth: 600,
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              backgroundColor: '#f5f5f5'
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#666' }} />
              </InputAdornment>
            )
          }}
        />

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            aria-label="account"
            onClick={(e) => {
              if (user) {
                handleMenu(e);
              } else {
                navigate('/customer-login');
              }
            }}
            sx={{ '&:hover': { bgcolor: '#f5f5f5' } }}
          >
            {user ? <AccountCircle sx={{ color: '#2e7d32' }} /> : <AccountCircle />}
          </IconButton>

          <IconButton
            aria-label="wishlist"
            onClick={() => navigate('/shortlist')}
            sx={{ '&:hover': { bgcolor: '#f5f5f5' } }}
          >
            <FavoriteBorder />
          </IconButton>

          <Button
            variant="contained"
            color="success"
            startIcon={
              <Badge badgeContent={cartCount} color="error">
                <ShoppingCart />
              </Badge>
            }
            onClick={() => navigate('/cart')}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              px: 2
            }}
          >
            Cart
          </Button>
        </Box>
      </Container>

      {/* Profile Menu */}
      <Menu
        id="menu-appbar"
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
        open={menuOpen}
        onClose={handleClose}
      >
        <MenuItem onClick={() => { handleClose(); navigate('/profile'); }}>
          <Person sx={{ mr: 1 }} />
          My Account
        </MenuItem>
        <MenuItem onClick={() => { handleClose(); navigate('/track-order'); }}>
          <LocalShipping sx={{ mr: 1 }} />
          Track Order
        </MenuItem>
        <MenuItem onClick={() => { handleClose(); navigate('/shortlist'); }}>
          <ShoppingBag sx={{ mr: 1 }} />
          My Wishlist
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
}
