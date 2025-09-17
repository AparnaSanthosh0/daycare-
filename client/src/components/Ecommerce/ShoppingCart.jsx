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
  TextField,
  Grid,
  Badge,
  Fade,
  Slide
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  ShoppingCart as ShoppingCartIcon,
  LocalShipping,
  Security,
  Favorite,
  FavoriteBorder,
  Close,
  Payment,
  CheckCircle
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Styled Components


const CartCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  border: '1px solid rgba(0, 0, 0, 0.05)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
  }
}));

const ProductImage = styled(Avatar)(({ theme }) => ({
  width: 80,
  height: 80,
  borderRadius: '12px',
  marginRight: theme.spacing(2),
  border: '2px solid #f0f0f0'
}));

const QuantityButton = styled(IconButton)(({ theme }) => ({
  width: 32,
  height: 32,
  border: '1px solid #e0e0e0',
  '&:hover': {
    backgroundColor: theme.palette.primary.main,
    color: 'white',
    borderColor: theme.palette.primary.main,
  }
}));

const CheckoutButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
  borderRadius: '25px',
  padding: '12px 32px',
  fontSize: '1.1rem',
  fontWeight: 600,
  textTransform: 'none',
  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  '&:hover': {
    background: 'linear-gradient(45deg, #5a67d8 0%, #6b46c1 100%)',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
  }
}));

const ShoppingCart = ({ isOpen, onClose }) => {
  // Simple sample cart data with placeholder images
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: 'Educational Building Blocks',
      price: 29.99,
      quantity: 2,
      image: 'https://via.placeholder.com/80x80/4CAF50/white?text=🧱',
      category: 'Toys',
      inStock: true,
      isFavorite: false,
      description: 'Colorful wooden blocks for creative learning'
    },
    {
      id: 2,
      name: 'Interactive Learning Tablet',
      price: 89.99,
      quantity: 1,
      image: 'https://via.placeholder.com/80x80/2196F3/white?text=📱',
      category: 'Electronics',
      inStock: true,
      isFavorite: true,
      description: 'Kid-friendly tablet with educational apps'
    },
    {
      id: 3,
      name: 'Art Supply Kit',
      price: 24.99,
      quantity: 1,
      image: 'https://via.placeholder.com/80x80/FF9800/white?text=🎨',
      category: 'Art & Crafts',
      inStock: true,
      isFavorite: false,
      description: 'Complete set of crayons, markers, and paper'
    }
  ]);

  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  // Cart calculations
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 50 ? 0 : 9.99;
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const tax = (subtotal - discount) * 0.08;
  const total = subtotal + shipping + tax - discount;

  // Cart functions
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

  const removeItem = (id) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const toggleFavorite = (id) => {
    setCartItems(items =>
      items.map(item =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  };

  const applyPromoCode = () => {
    if (promoCode.toLowerCase() === 'tinytots10') {
      setPromoApplied(true);
    }
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (!isOpen) return null;

  return (
    <Fade in={isOpen}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}
        onClick={onClose}
      >
        <Slide direction="up" in={isOpen}>
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              backgroundColor: 'white',
              borderRadius: '20px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header */}
            <Box
              sx={{
                p: 3,
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
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
            </Box>

            {/* Cart Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
              {cartItems.length === 0 ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 8,
                    color: 'text.secondary'
                  }}
                >
                  <ShoppingCartIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                  <Typography variant="h6" gutterBottom>
                    Your cart is empty
                  </Typography>
                  <Typography variant="body2">
                    Add some items to get started!
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {/* Cart Items */}
                  <Grid item xs={12} md={8}>
                    <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                      Cart Items ({totalItems})
                    </Typography>
                    
                    {cartItems.map((item, index) => (
                      <Fade in key={item.id} timeout={300 + index * 100}>
                        <CartCard>
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <ProductImage
                                src={item.image}
                                alt={item.name}
                                variant="rounded"
                              />
                              
                              <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="h6" fontWeight={600}>
                                    {item.name}
                                  </Typography>
                                  <IconButton
                                    onClick={() => toggleFavorite(item.id)}
                                    sx={{ color: item.isFavorite ? 'red' : 'grey.400' }}
                                  >
                                    {item.isFavorite ? <Favorite /> : <FavoriteBorder />}
                                  </IconButton>
                                </Box>
                                
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  {item.description}
                                </Typography>
                                
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                  <Chip
                                    label={item.category}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                  <Chip
                                    label={item.inStock ? 'In Stock' : 'Out of Stock'}
                                    size="small"
                                    color={item.inStock ? 'success' : 'error'}
                                    icon={item.inStock ? <CheckCircle /> : undefined}
                                  />
                                </Box>
                                
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="h6" color="primary" fontWeight={600}>
                                    ${item.price.toFixed(2)}
                                  </Typography>
                                  
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <QuantityButton
                                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                      disabled={!item.inStock}
                                    >
                                      <Remove fontSize="small" />
                                    </QuantityButton>
                                    
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
                                    
                                    <QuantityButton
                                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                      disabled={!item.inStock}
                                    >
                                      <Add fontSize="small" />
                                    </QuantityButton>
                                    
                                    <IconButton
                                      onClick={() => removeItem(item.id)}
                                      sx={{ ml: 1, color: 'error.main' }}
                                    >
                                      <Delete />
                                    </IconButton>
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                          </CardContent>
                        </CartCard>
                      </Fade>
                    ))}
                  </Grid>

                  {/* Order Summary */}
                  <Grid item xs={12} md={4}>
                    <Card
                      sx={{
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                        position: 'sticky',
                        top: 20
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom fontWeight={600}>
                          Order Summary
                        </Typography>
                        
                        <Box sx={{ mb: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography>Subtotal ({totalItems} items)</Typography>
                            <Typography>${subtotal.toFixed(2)}</Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography>Shipping</Typography>
                            <Typography color={shipping === 0 ? 'success.main' : 'inherit'}>
                              {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography>Tax</Typography>
                            <Typography>${tax.toFixed(2)}</Typography>
                          </Box>
                          
                          {promoApplied && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography color="success.main">Discount (10%)</Typography>
                              <Typography color="success.main">-${discount.toFixed(2)}</Typography>
                            </Box>
                          )}
                          
                          <Divider sx={{ my: 2 }} />
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6" fontWeight={600}>Total</Typography>
                            <Typography variant="h6" fontWeight={600} color="primary">
                              ${total.toFixed(2)}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Promo Code */}
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Promo Code
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                              size="small"
                              placeholder="Enter code"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value)}
                              disabled={promoApplied}
                              sx={{ flex: 1 }}
                            />
                            <Button
                              variant="outlined"
                              onClick={applyPromoCode}
                              disabled={promoApplied || !promoCode}
                              size="small"
                            >
                              {promoApplied ? 'Applied' : 'Apply'}
                            </Button>
                          </Box>
                          {promoApplied && (
                            <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                              ✓ Promo code applied successfully!
                            </Typography>
                          )}
                        </Box>

                        {/* Checkout Button */}
                        <CheckoutButton
                          fullWidth
                          startIcon={<Payment />}
                          sx={{ mb: 2 }}
                        >
                          Proceed to Checkout
                        </CheckoutButton>

                        {/* Security & Shipping Info */}
                        <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 1 }}>
                            <Security fontSize="small" />
                            <LocalShipping fontSize="small" />
                          </Box>
                          <Typography variant="caption">
                            Secure checkout • Free shipping over $50
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Box>
          </Box>
        </Slide>
      </Box>
    </Fade>
  );
};

export default ShoppingCart;