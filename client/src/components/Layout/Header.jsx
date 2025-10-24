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
  Badge,
  TextField,
  InputAdornment,
  Divider
} from '@mui/material';
import { Menu as MenuIcon, AccountCircle, Logout, FavoriteBorder, ShoppingCart, Search, Store } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useShop } from '../../contexts/ShopContext';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { cartCount, wishlist } = useShop();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [search, setSearch] = React.useState('');
  const wishlistCount = React.useMemo(() => {
    if (!wishlist) return 0;
    if (wishlist instanceof Set) return wishlist.size;
    if (Array.isArray(wishlist)) return wishlist.length;
    return 0;
  }, [wishlist]);
  const accountLabel = user ? 'Profile' : 'Login / Register';
  const navItems = React.useMemo(() => ([
    { key: 'stores', label: 'Stores & Preschools', onClick: () => navigate('/stores') },
    { key: 'support', label: 'Support', onClick: () => navigate('/support') },
    { key: 'track', label: 'Track Order', onClick: () => navigate('/track-order') },
    { key: 'parenting', label: 'TinyTots Parenting', onClick: () => navigate('/curriculum') },
    {
      key: 'account',
      label: accountLabel,
      onClick: () => {
        if (user) navigate('/profile');
        else navigate('/customer-login', { state: { redirectTo: '/profile' } });
      }
    }
  ]), [navigate, user, accountLabel]);

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

  const handleSearch = () => {
    const query = search.trim();
    if (query) {
      navigate('/shop', { state: { q: query } });
    } else {
      navigate('/shop');
    }
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
        boxShadow: 'none'
      }}
    >
      <Box sx={{ height: 6, backgroundColor: '#4b314d', width: '100%' }} />
      <Toolbar
        sx={{
          width: '100%',
          gap: { xs: 1.5, md: 3 },
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#ffffff',
          color: '#4b314d',
          borderRadius: { xs: 0, md: 12 },
          boxShadow: '0 12px 36px rgba(75,49,77,0.08)',
          border: '1px solid rgba(75,49,77,0.1)',
          px: { xs: 1.5, md: 3 },
          py: { xs: 1, md: 1.5 },
          mt: { xs: 0, md: 1.5 }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minWidth: 0,
            order: { xs: 1, md: 1 }
          }}
        >
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{ display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box
            onClick={() => navigate('/')}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
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
                Daycare & Lifestyle
              </Typography>
            </Box>
          </Box>

          {/* TinyTots Shop Icon */}
          <Box
            onClick={() => navigate('/shop')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              ml: 2,
              p: 1,
              borderRadius: '8px',
              bgcolor: 'rgba(242, 101, 34, 0.1)',
              '&:hover': { bgcolor: 'rgba(242, 101, 34, 0.2)' },
              transition: 'all 0.2s ease'
            }}
          >
            <Store sx={{ color: '#f26522', fontSize: 20 }} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: '#f26522',
                display: { xs: 'none', sm: 'block' }
              }}
            >
              Shop
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            minWidth: { xs: '100%', md: 360 },
            order: { xs: 3, md: 2 }
          }}
        >
          <TextField
            placeholder="Search for a Category, Brand or Product"
            size="small"
            fullWidth
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSearch();
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '999px',
                backgroundColor: '#f4faf8',
                '& fieldset': { borderColor: 'rgba(26,188,156,0.2)' },
                '&:hover fieldset': { borderColor: 'rgba(26,188,156,0.45)' },
                '&.Mui-focused fieldset': { borderColor: '#1abc9c' }
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleSearch} edge="end">
                    <Search sx={{ color: '#1abc9c' }} />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1, md: 2 },
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            order: { xs: 2, md: 3 },
            ml: 'auto'
          }}
        >
          {navItems.map((item, index) => (
            <React.Fragment key={item.key}>
              {index > 0 && (
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' }, borderColor: 'rgba(75,49,77,0.18)' }} />
              )}
              <Typography
                variant="body2"
                onClick={item.onClick}
                sx={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#4b314d',
                  display: { xs: 'none', sm: 'block' },
                  '&:hover': { color: '#1abc9c' }
                }}
              >
                {item.label}
              </Typography>
            </React.Fragment>
          ))}

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' }, borderColor: 'rgba(75,49,77,0.18)' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }} onClick={() => navigate('/shortlist')}>
            <Badge
              badgeContent={wishlistCount}
              color="secondary"
              overlap="circular"
              showZero
              sx={{ '& .MuiBadge-badge': { backgroundColor: '#ff6f61', color: '#fff' } }}
            >
              <FavoriteBorder sx={{ color: '#1abc9c' }} />
            </Badge>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#4b314d', display: { xs: 'none', sm: 'block' } }}>
              Shortlist
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' }, borderColor: 'rgba(75,49,77,0.18)' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }} onClick={() => navigate('/cart')}>
            <Badge
              badgeContent={cartCount}
              color="secondary"
              overlap="circular"
              showZero
              sx={{ '& .MuiBadge-badge': { backgroundColor: '#ff6f61', color: '#fff' } }}
            >
              <ShoppingCart sx={{ color: '#1abc9c' }} />
            </Badge>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#4b314d', display: { xs: 'none', sm: 'block' } }}>
              Cart
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, borderColor: 'rgba(75,49,77,0.18)' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' }, fontWeight: 500 }}>
              Welcome, {user?.firstName || 'Guest'}
            </Typography>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              sx={{ backgroundColor: 'rgba(26,188,156,0.08)', '&:hover': { backgroundColor: 'rgba(26,188,156,0.18)' } }}
            >
              <Avatar src={user?.profileImage ? `${toAbsolute(user.profileImage)}?v=${encodeURIComponent(user?.updatedAt || '')}` : undefined} sx={{ width: 36, height: 36 }}>
                {(!user?.profileImage && user?.firstName) ? user.firstName.charAt(0) : ''}
              </Avatar>
            </IconButton>
          </Box>
        </Box>
      </Toolbar>
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
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={() => { handleClose(); navigate('/profile'); }}>
          <AccountCircle sx={{ mr: 1 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Header;
