import React from 'react';
import { Box, Container, Typography, TextField, InputAdornment, IconButton, Badge, Button, Divider, Menu, MenuItem, Dialog, DialogTitle, DialogContent } from '@mui/material';
import {
  Person,
  LocalShipping,
  Logout,
  ShoppingBag,
  AccountCircle,
  Search,
  FavoriteBorder,
  ShoppingCart,
  CameraAlt,
  Close,
  PhotoCamera,
  PhotoLibrary
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
  const [photoSearchOpen, setPhotoSearchOpen] = React.useState(false);
  const [uploadedImage, setUploadedImage] = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState(null);
  const [cameraActive, setCameraActive] = React.useState(false);
  const [stream, setStream] = React.useState(null);
  const fileInputRef = React.useRef(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

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

  const handlePhotoSearchOpen = () => {
    setPhotoSearchOpen(true);
  };

  const handlePhotoSearchClose = () => {
    setPhotoSearchOpen(false);
    setUploadedImage(null);
    setImagePreview(null);
    stopCamera();
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions or use "Select a photo" instead.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      setImagePreview(imageData);
      setUploadedImage(new File([imageData], 'camera-capture.jpg', { type: 'image/jpeg' }));
      stopCamera();
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoSearch = () => {
    if (uploadedImage) {
      // Navigate to shop with image data
      navigate('/shop', { state: { searchImage: imagePreview } });
      handlePhotoSearchClose();
    }
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
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handlePhotoSearchOpen}
                  sx={{ color: '#2e7d32' }}
                  title="Search by photo"
                >
                  <CameraAlt />
                </IconButton>
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

      {/* Photo Search Dialog */}
      <Dialog 
        open={photoSearchOpen} 
        onClose={handlePhotoSearchClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Photo Search</Typography>
          <IconButton onClick={handlePhotoSearchClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ py: 4 }}>
            {cameraActive ? (
              <Box sx={{ px: 3, textAlign: 'center' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    maxHeight: 400,
                    borderRadius: 8,
                    backgroundColor: '#000'
                  }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={stopCamera}
                    sx={{ textTransform: 'none', py: 1.5 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    onClick={capturePhoto}
                    startIcon={<PhotoCamera />}
                    sx={{ textTransform: 'none', py: 1.5, fontWeight: 600 }}
                  >
                    Capture Photo
                  </Button>
                </Box>
              </Box>
            ) : imagePreview ? (
              <Box sx={{ px: 3 }}>
                <Box
                  component="img"
                  src={imagePreview}
                  alt="Uploaded"
                  sx={{
                    width: '100%',
                    maxHeight: 400,
                    objectFit: 'contain',
                    borderRadius: 2,
                    boxShadow: 3,
                    mb: 3
                  }}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<Close />}
                    onClick={() => {
                      setUploadedImage(null);
                      setImagePreview(null);
                    }}
                    sx={{ textTransform: 'none', py: 1.5 }}
                  >
                    Remove
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    onClick={handlePhotoSearch}
                    startIcon={<Search />}
                    sx={{ textTransform: 'none', py: 1.5, fontWeight: 600 }}
                  >
                    Search Products
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ px: 3 }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Box
                    onClick={startCamera}
                    sx={{
                      flex: 1,
                      border: '2px solid #e0e0e0',
                      borderRadius: 2,
                      p: 3,
                      cursor: 'pointer',
                      textAlign: 'center',
                      bgcolor: 'white',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: '#f5f5f5',
                        borderColor: '#2e7d32',
                        transform: 'translateY(-2px)',
                        boxShadow: 2
                      }
                    }}
                  >
                    <PhotoCamera sx={{ fontSize: 48, color: '#666', mb: 1 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Click a photo
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Use camera to take picture
                    </Typography>
                  </Box>
                  
                  <Box
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      flex: 1,
                      border: '2px solid #e0e0e0',
                      borderRadius: 2,
                      p: 3,
                      cursor: 'pointer',
                      textAlign: 'center',
                      bgcolor: 'white',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: '#f5f5f5',
                        borderColor: '#2e7d32',
                        transform: 'translateY(-2px)',
                        boxShadow: 2
                      }
                    }}
                  >
                    <PhotoLibrary sx={{ fontSize: 48, color: '#666', mb: 1 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Select a photo
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Choose from gallery
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', px: 2 }}>
                  Upload a clear image of the product you're looking for. We'll show you similar items from our catalog.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
