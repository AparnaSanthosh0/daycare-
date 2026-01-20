import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  LocationOn,
  History,
  LocalShipping,
  Star,
  Edit,
  Add,
  Logout,
  ShoppingBag
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

const EcommerceProfile = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        email: user.email || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || ''
        }
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const key = name.split('.')[1];
      setForm(prev => ({ ...prev, address: { ...prev.address, [key]: value } }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    if (error) setError('');
    if (message) setMessage('');
  };

  const handleLogout = () => {
    logout();
    navigate('/shop');
  };

  async function saveProfile() {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      await api.put('/auth/profile', form);
      await refreshUser?.();
      setMessage('Profile updated successfully');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  const sidebarItems = [
    {
      id: 'profile',
      label: 'My Account',
      icon: <Person />,
      active: activeSection === 'profile'
    },
    {
      id: 'orders',
      label: 'Order History',
      icon: <History />,
      active: activeSection === 'orders'
    },
    {
      id: 'track',
      label: 'Track Order',
      icon: <LocalShipping />,
      active: activeSection === 'track'
    },
    {
      id: 'reviews',
      label: 'My Reviews',
      icon: <Star />,
      active: activeSection === 'reviews'
    },
    {
      id: 'wishlist',
      label: 'Wishlist',
      icon: <ShoppingBag />,
      active: activeSection === 'wishlist'
    }
  ];

  const renderSidebar = () => (
    <Paper sx={{ p: 2, mb: 3, position: 'sticky', top: 20 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar
          src={user?.profileImage}
          sx={{ width: 50, height: 50, mr: 2 }}
        >
          {user?.firstName?.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.email}
          </Typography>
        </Box>
      </Box>

      <List>
        {sidebarItems.map((item) => (
          <ListItem
            key={item.id}
            button
            onClick={() => setActiveSection(item.id)}
            sx={{
              bgcolor: item.active ? 'success.light' : 'transparent',
              borderRadius: 1,
              mb: 0.5,
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <ListItemIcon sx={{ color: item.active ? 'success.contrastText' : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              sx={{ '& .MuiListItemText-primary': { fontWeight: item.active ? 600 : 400 } }}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />
      <Button
        fullWidth
        variant="outlined"
        color="error"
        startIcon={<Logout />}
        onClick={handleLogout}
        sx={{ textTransform: 'none' }}
      >
        Logout
      </Button>
    </Paper>
  );

  const ReviewForm = ({ productId, productName }) => {
    const [rating, setRating] = React.useState(0);
    const [review, setReview] = React.useState('');
    const [title, setTitle] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    const handleSubmitReview = async () => {
      if (rating === 0 || !review.trim()) {
        setError('Please provide both rating and review');
        return;
      }

      try {
        setSubmitting(true);
        setError('');
        setMessage('');

        // Send review to backend (will be forwarded to vendor and admin)
        await api.post('/reviews', {
          productId,
          rating,
          title,
          review: review.trim(),
          productName
        });

        setMessage('Review submitted successfully! It will be visible after admin approval.');
        setRating(0);
        setReview('');
        setTitle('');

        // Refresh user data to update review status
        await refreshUser?.();

      } catch (e) {
        setError(e.response?.data?.message || 'Failed to submit review');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <Box>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Write a Review
        </Typography>

        {/* Rating Stars */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" sx={{ mr: 2 }}>Rating:</Typography>
          {[1, 2, 3, 4, 5].map((star) => (
            <IconButton
              key={star}
              size="small"
              onClick={() => setRating(star)}
              sx={{ p: 0.5 }}
            >
              <Star
                sx={{
                  color: star <= rating ? 'warning.main' : 'grey.300',
                  fontSize: 20
                }}
              />
            </IconButton>
          ))}
          <Typography variant="body2" sx={{ ml: 1 }}>
            {rating > 0 ? `${rating}/5` : 'Click to rate'}
          </Typography>
        </Box>

        {/* Review Title */}
        <TextField
          fullWidth
          label="Review Title (Optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          size="small"
          sx={{ mb: 2 }}
        />

        {/* Review Text */}
        <TextField
          fullWidth
          label="Your Review"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          multiline
          rows={3}
          placeholder="Share your experience with this product..."
          sx={{ mb: 2 }}
        />

        {/* Submit Button */}
        <Button
          variant="contained"
          color="success"
          onClick={handleSubmitReview}
          disabled={submitting || rating === 0 || !review.trim()}
          size="small"
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Your review will be sent to the vendor and admin for quality assurance
        </Typography>
      </Box>
    );
  };

  const renderProfileSection = () => (
    <Box>
      {/* Login Details Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Person sx={{ mr: 1, color: 'success.main' }} />
          <Typography variant="h6">Login Details</Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Email sx={{ mr: 2, color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Email Address</Typography>
                <Typography variant="body1">{user?.email}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Phone sx={{ mr: 2, color: 'text.secondary' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">Phone Number</Typography>
                <TextField
                  fullWidth
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  size="small"
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Personal Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Personal Information</Typography>
          <IconButton size="small">
            <Edit />
          </IconButton>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="First Name"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Last Name"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="success"
              onClick={saveProfile}
              disabled={saving}
              sx={{ mt: 1 }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Address Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LocationOn sx={{ mr: 1, color: 'success.main' }} />
            <Typography variant="h6">Address Book</Typography>
          </Box>
          <Button startIcon={<Add />} variant="outlined" size="small">
            Add New Address
          </Button>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Street Address"
              name="address.street"
              value={form.address.street}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="City"
              name="address.city"
              value={form.address.city}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="State"
              name="address.state"
              value={form.address.state}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Zip Code"
              name="address.zipCode"
              value={form.address.zipCode}
              onChange={handleChange}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  const renderOrdersSection = () => (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <History sx={{ mr: 1, color: 'success.main' }} />
        <Typography variant="h6">Order History</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        No orders found. Start shopping to see your order history here.
      </Typography>
    </Paper>
  );

  const renderTrackSection = () => (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <LocalShipping sx={{ mr: 1, color: 'success.main' }} />
        <Typography variant="h6">Track Your Order</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter your order ID to track your delivery
      </Typography>
      <TextField
        fullWidth
        label="Order ID"
        placeholder="e.g., TT-2024-001"
        sx={{ mb: 2 }}
      />
      <Button variant="contained" color="success">
        Track Order
      </Button>
    </Paper>
  );

  const renderReviewsSection = () => (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Star sx={{ mr: 1, color: 'success.main' }} />
          <Typography variant="h6">My Reviews</Typography>
        </Box>

        {/* Products to Review */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Products You Can Review
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Rate and review products you've purchased to help other customers
        </Typography>

        {/* Sample products for review */}
        <Grid container spacing={2}>
          {[
            { id: 1, name: 'Baby Stroller', image: '/baby-stroller.jpg', purchased: true, reviewed: false },
            { id: 2, name: 'Organic Baby Food Set', image: '/baby-food.jpg', purchased: true, reviewed: true, rating: 4, review: 'Great quality and my baby loves it!' },
            { id: 3, name: 'Baby Clothes Set', image: '/baby-clothes.jpg', purchased: true, reviewed: false }
          ].map((product) => (
            <Grid item xs={12} md={6} key={product.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      component="img"
                      src={product.image}
                      alt={product.name}
                      sx={{
                        width: 60,
                        height: 60,
                        objectFit: 'cover',
                        borderRadius: 1,
                        mr: 2
                      }}
                    />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Purchased • {product.reviewed ? 'Reviewed' : 'Not reviewed'}
                      </Typography>
                    </Box>
                  </Box>

                  {product.reviewed ? (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            sx={{
                              color: star <= product.rating ? 'warning.main' : 'grey.300',
                              fontSize: 16
                            }}
                          />
                        ))}
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {product.rating}/5
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        "{product.review}"
                      </Typography>
                    </Box>
                  ) : (
                    <ReviewForm productId={product.id} productName={product.name} />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Review Guidelines */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Review Guidelines</Typography>
        <Typography variant="body2" color="text.secondary">
          • Be honest and helpful in your reviews<br/>
          • Mention specific features you liked or disliked<br/>
          • Your reviews help other parents make informed decisions<br/>
          • Reviews are shared with vendors and admins for quality improvement
        </Typography>
      </Paper>
    </Box>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'orders':
        return renderOrdersSection();
      case 'track':
        return renderTrackSection();
      case 'reviews':
        return renderReviewsSection();
      case 'wishlist':
        return (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>My Wishlist</Typography>
            <Typography variant="body2" color="text.secondary">
              Your wishlist is empty. Add products to your wishlist while shopping.
            </Typography>
          </Paper>
        );
      default:
        return renderProfileSection();
    }
  };

  if (!user) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 2, textAlign: 'center' }}>
        <Typography variant="h5">Please login to view your profile</Typography>
        <Button variant="contained" onClick={() => navigate('/customer-login')} sx={{ mt: 2 }}>
          Login
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">My Account</Typography>
        <Button variant="outlined" onClick={() => navigate('/shop')}>
          Back to Shop
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Grid container spacing={3}>
        {/* Sidebar */}
        <Grid item xs={12} md={3}>
          {renderSidebar()}
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={9}>
          {renderContent()}
        </Grid>
      </Grid>
    </Box>
  );
};

export default EcommerceProfile;