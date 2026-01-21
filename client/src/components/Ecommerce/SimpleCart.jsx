/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Divider,
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
import { useShop } from '../../contexts/ShopContext';
import api from '../../config/api';

const SimpleCart = ({ isOpen, onClose }) => {
  const { cartItems, updateQuantity, removeFromCart, cartSubtotal } = useShop();
  const [productStocks, setProductStocks] = React.useState({});

  // Fetch fresh stock data when cart opens
  useEffect(() => {
    if (!isOpen || cartItems.length === 0) return;
    
    const fetchStockData = async () => {
      try {
        const productIds = cartItems.map(item => item.id).filter(Boolean);
        if (productIds.length === 0) return;

        const { data } = await api.get('/products', { params: { all: true } });
        const products = data?.products || [];
        
        const stocks = {};
        products.forEach(product => {
          if (productIds.includes(product._id)) {
            stocks[product._id] = product.stockQty ?? 0;
          }
        });

        setProductStocks(stocks);
      } catch (error) {
        console.error('Failed to fetch stock data:', error);
      }
    };

    fetchStockData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, cartItems.length]);

  // Calculate totals
  const subtotal = cartSubtotal;
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
    // Go to Cart page; guests will be asked to login there
    navigate('/cart');
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
      PaperProps={{ sx: { maxHeight: '80vh' } }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          bgcolor: 'success.main',
          color: 'success.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 3,
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
        <IconButton onClick={onClose} sx={{ color: 'success.contrastText' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ p: 3 }}>
        {cartItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 6 }}>
            <Typography variant="h6" gutterBottom>
              Your cart is empty
            </Typography>
            <Typography variant="body2">Add items to get started.</Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {cartItems.map((item) => (
              <Grid item xs={12} key={item.key}>
                <Card variant="outlined">
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography fontWeight={600}>{item.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.variant ? `Size: ${item.variant} · ` : ''}Qty: {item.quantity}
                      </Typography>
                      {(() => {
                        const currentStock = productStocks[item.id] ?? item.stockQty ?? 0;
                        const isOutOfStock = currentStock <= 0;
                        const exceedsStock = item.quantity > currentStock;
                        
                        if (isOutOfStock) {
                          return (
                            <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                              Out of Stock
                            </Typography>
                          );
                        }
                        
                        if (exceedsStock) {
                          return (
                            <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                              Only {currentStock} available - Quantity will be adjusted
                            </Typography>
                          );
                        }
                        
                        if (currentStock <= 5) {
                          return (
                            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                              Only {currentStock} left
                            </Typography>
                          );
                        }
                        
                        return null;
                      })()}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton size="small" onClick={() => updateQuantity(item.key, Math.max(1, item.quantity - 1))}><Remove /></IconButton>
                      <Typography>{item.quantity}</Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          const currentStock = productStocks[item.id] ?? item.stockQty ?? 0;
                          if (item.quantity + 1 <= currentStock) {
                            updateQuantity(item.key, item.quantity + 1);
                          }
                        }}
                        disabled={(() => {
                          const currentStock = productStocks[item.id] ?? item.stockQty ?? 0;
                          return item.quantity >= currentStock || currentStock <= 0;
                        })()}
                      >
                        <Add />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => removeFromCart(item.key)}><Delete /></IconButton>
                      <Typography sx={{ minWidth: 80, textAlign: 'right' }}>₹{(item.price * item.quantity).toFixed(2)}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>

      {/* Actions */}
      {cartItems.length > 0 && (
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            variant="contained"
            color="success"
            fullWidth
            size="large"
            onClick={handleProceedCheckout}
            sx={{ borderRadius: '25px', py: 1.5, fontSize: '1.1rem', fontWeight: 600 }}
          >
            Proceed to Checkout - ₹{total.toFixed(2)}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default SimpleCart;