import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Divider,
  Avatar,
  Chip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  ShoppingCart as ShoppingCartIcon,
  Close
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const SimpleCart = ({ isOpen, onClose }) => {
  // Simple cart items
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: 'Building Blocks',
      price: 29.99,
      quantity: 2,
      image: '🧱'
    },
    {
      id: 2,
      name: 'Learning Tablet',
      price: 89.99,
      quantity: 1,
      image: '📱'
    },
    {
      id: 3,
      name: 'Art Kit',
      price: 24.99,
      quantity: 1,
      image: '🎨'
    }
  ]);

  // Update quantity
  const updateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(id);
      return;
    }
    setCartItems(items =>
      items.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Remove item
  const removeItem = (id) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Registration state (only required on checkout)
  const [showRegistration, setShowRegistration] = useState(false);
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    password: '',
    address: ''
  });

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const navigate = useNavigate();

  const handleProceedCheckout = () => {
    // Redirect to a dedicated customer registration form
    navigate('/customer-register', { state: { from: 'cart' } });
  };

  const handlePlaceOrder = () => {
    // Basic validation for required fields
    if (!customer.name || !customer.email || !customer.password || !customer.address) {
      alert('Please fill all registration fields to proceed with purchase.');
      return;
    }
    // Here, integrate your purchase API call
    alert('Order placed successfully!');
    setShowRegistration(false);
    onClose();
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          maxHeight: '80vh'
        }
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Badge badgeContent={totalItems} color="error">
            <ShoppingCartIcon />
          </Badge>
          <Typography variant="h5" fontWeight={600}>
            Shopping Cart
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ p: 3 }}>
        {cartItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Your cart is empty
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add some items to get started!
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Cart Items */}
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Items in Cart ({totalItems})
            </Typography>
            
            {cartItems.map((item) => (
              <Card key={item.id} sx={{ mb: 2, borderRadius: '12px' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {/* Product Image/Icon */}
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: '8px',
                        backgroundColor: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px'
                      }}
                    >
                      {item.image}
                    </Box>
                    
                    {/* Product Info */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        {item.name}
                      </Typography>
                      <Typography variant="h6" color="primary" fontWeight={600}>
                        ₹{item.price.toFixed(2)}
                      </Typography>
                    </Box>
                    
                    {/* Quantity Controls */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        size="small"
                        sx={{ border: '1px solid #ddd' }}
                      >
                        <Remove fontSize="small" />
                      </IconButton>
                      
                      <Typography
                        sx={{
                          minWidth: 40,
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: '1.1rem'
                        }}
                      >
                        {item.quantity}
                      </Typography>
                      
                      <IconButton
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        size="small"
                        sx={{ border: '1px solid #ddd' }}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                      
                      <IconButton
                        onClick={() => removeItem(item.id)}
                        sx={{ ml: 1, color: 'error.main' }}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}

            <Divider sx={{ my: 3 }} />

            {/* Order Summary */}
            <Card sx={{ borderRadius: '12px', backgroundColor: '#f8f9fa', mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                  Order Summary
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Subtotal ({totalItems} items)</Typography>
                  <Typography>₹{subtotal.toFixed(2)}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Tax (8%)</Typography>
                  <Typography>₹{tax.toFixed(2)}</Typography>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" fontWeight={600}>Total</Typography>
                  <Typography variant="h6" fontWeight={600} color="primary">
                    ₹{total.toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Registration form shown only when proceeding to buy */}
            {showRegistration && (
              <Card sx={{ borderRadius: '12px' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Customer Registration
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Customer Name"
                        name="name"
                        value={customer.name}
                        onChange={handleCustomerChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={customer.email}
                        onChange={handleCustomerChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Password"
                        name="password"
                        type="password"
                        value={customer.password}
                        onChange={handleCustomerChange}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Address"
                        name="address"
                        multiline
                        minRows={2}
                        value={customer.address}
                        onChange={handleCustomerChange}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </DialogContent>

      {/* Actions */}
      {cartItems.length > 0 && (
        <DialogActions sx={{ p: 3, pt: 0, gap: 2, flexWrap: 'wrap' }}>
          {!showRegistration ? (
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleProceedCheckout}
              sx={{
                background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '25px',
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(45deg, #5a67d8 0%, #6b46c1 100%)',
                }
              }}
            >
              Register to Buy - ₹{total.toFixed(2)}
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={() => setShowRegistration(false)}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handlePlaceOrder}
                sx={{
                  background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': { background: 'linear-gradient(45deg, #5a67d8 0%, #6b46c1 100%)' }
                }}
              >
                Place Order
              </Button>
            </>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default SimpleCart;