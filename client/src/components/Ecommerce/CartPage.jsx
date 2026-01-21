import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Button,
  Divider,
  Chip,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel
} from '@mui/material';
import {
  Delete,
  ArrowBack
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useShop } from '../../contexts/ShopContext';
import api from '../../config/api';
import RAZORPAY_CONFIG from '../../config/razorpay';

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, removeFromCart, updateQuantity, cartSubtotal, clearCart } = useShop();
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [productStocks, setProductStocks] = useState({}); // { productId: stockQty }
  const [stockErrors, setStockErrors] = useState({}); // { itemKey: errorMessage }

  const tax = cartSubtotal * 0.08;
  const total = cartSubtotal + tax;

  // Fetch fresh stock data for all products in cart
  useEffect(() => {
    const fetchStockData = async () => {
      if (cartItems.length === 0) return;
      
      try {
        const productIds = cartItems.map(item => item.id).filter(Boolean);
        if (productIds.length === 0) return;

        // Fetch all products to get current stock
        const { data } = await api.get('/products', { params: { all: true } });
        const products = data?.products || [];
        
        const stocks = {};
        const errors = {};
        
        products.forEach(product => {
          if (productIds.includes(product._id)) {
            stocks[product._id] = product.stockQty ?? 0;
          }
        });

        // Validate cart items against fresh stock
        cartItems.forEach(item => {
          const currentStock = stocks[item.id] ?? 0;
          if (item.quantity > currentStock) {
            errors[item.key] = `Only ${currentStock} available in stock. Please reduce quantity.`;
            // Auto-correct quantity to available stock
            if (currentStock > 0) {
              updateQuantity(item.key, currentStock);
            } else {
              // Remove item if out of stock
              removeFromCart(item.key);
            }
          }
        });

        setProductStocks(stocks);
        setStockErrors(errors);
      } catch (error) {
        console.error('Failed to fetch stock data:', error);
      }
    };

        fetchStockData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems.length]); // Re-fetch when cart items change

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate('/customer-login', { state: { redirectTo: '/cart' } });
      return;
    }

    try {
      setPlacingOrder(true);
      setOrderMessage('');

      if (paymentMethod === 'cash_on_delivery') {
        // For COD, place order directly without payment
        const orderItems = cartItems.map(item => ({
          product: item.id,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
          image: item.image
        }));

        const shippingAddress = {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || ''
        };

        const response = await api.post('/orders', {
          items: orderItems,
          shippingAddress,
          billingAddress: shippingAddress,
          paymentMethod: 'cash_on_delivery',
          paymentStatus: 'pending'
        });

        const orderData = response.data;
        setOrderNumber(orderData.orderNumber || orderData.order?.orderNumber);
        setOrderMessage('Order placed successfully! Payment will be collected on delivery.');

      } else {
        // For online payment, create payment order first
        const paymentResponse = await api.post('/payments/create-order', {
          amount: total,
          currency: 'INR',
          receipt: `order_${Date.now()}`
        });

        if (!paymentResponse.data.success) {
          setOrderMessage('Failed to create payment order');
          return;
        }

        const { order: razorpayOrder } = paymentResponse.data;

        // Load Razorpay script
        const loadRazorpayScript = () => {
          return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          setOrderMessage('Failed to load payment system. Please try again.');
          setPlacingOrder(false);
          return;
        }

        // Razorpay options
        const options = {
          key: RAZORPAY_CONFIG.key_id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: RAZORPAY_CONFIG.name,
          description: RAZORPAY_CONFIG.description,
          image: RAZORPAY_CONFIG.image,
          order_id: razorpayOrder.id,
          handler: async function (response) {
            try {
              // Prepare order data for payment verification
              const orderItems = cartItems.map(item => ({
                product: item.id,
                quantity: item.quantity,
                price: item.price,
                name: item.name,
                image: item.image
              }));

              const shippingAddress = {
                street: user.address?.street || '',
                city: user.address?.city || '',
                state: user.address?.state || '',
                zipCode: user.address?.zipCode || ''
              };

              const orderData = {
                items: orderItems,
                shippingAddress,
                billingAddress: shippingAddress,
                customerEmail: user.email,
                customerName: `${user.firstName} ${user.lastName}`,
                customerPhone: user.phone
              };

              // Verify payment with order data
              const verifyResponse = await api.post('/payments/verify-payment', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderData: orderData
              });

              if (verifyResponse.data.success) {
                // Payment successful and order created
                const orderData = verifyResponse.data.order;
                if (orderData && orderData.orderNumber) {
                  setOrderNumber(orderData.orderNumber);
                  setOrderMessage(`Payment successful! Order placed successfully. Transaction ID: ${response.razorpay_payment_id}`);

                  // Clear cart after successful order
                  clearCart();

                  // Navigate to success page after a short delay
                  setTimeout(() => {
                    navigate('/payment-success', {
                      state: {
                        orderNumber: orderData.orderNumber,
                        transactionId: response.razorpay_payment_id
                      }
                    });
                  }, 1500);
                } else {
                  // Payment successful but order creation failed
                  setOrderMessage(`Payment successful! Transaction ID: ${response.razorpay_payment_id}. However, there was an issue creating your order. Please contact support with this transaction ID.`);
                }
              } else {
                setOrderMessage('Payment verification failed');
              }
            } catch (error) {
              console.error('Order creation error:', error);
              setOrderMessage(error.response?.data?.message || 'Failed to place order after payment');
            }
            setPlacingOrder(false);
          },
          prefill: {
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            contact: user.phone
          },
          theme: RAZORPAY_CONFIG.theme,
          modal: {
            ondismiss: function() {
              setPlacingOrder(false);
              setOrderMessage('Payment cancelled');
            }
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      }

    } catch (error) {
      console.error('Order placement error:', error);
      setOrderMessage(error.response?.data?.message || 'Failed to place order. Please try again.');
      setPlacingOrder(false);
    }
  };

  const goLogin = () => {
    navigate('/customer-login', { state: { redirectTo: '/cart' } });
  };

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>Back</Button>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Your Cart</Typography>

        {/* Order Message */}
        {orderMessage && (
          <Alert severity={orderMessage.includes('successfully') ? 'success' : 'error'} sx={{ mb: 3 }}>
            {orderMessage}
            {orderNumber && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Order Number: <strong>{orderNumber}</strong>
              </Typography>
            )}
          </Alert>
        )}

        {cartItems.length === 0 ? (
          <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Missing Cart items?</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Login to see the items you added previously</Typography>
            <Button variant="contained" onClick={goLogin}>Login</Button>
          </Card>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              {cartItems.map((item) => (
                <Card key={item.key} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CardMedia component="img" image={item.image || '/logo192.svg'} alt={item.name} sx={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 1 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={700}>{item.name}</Typography>
                      {item.variant && (
                        <Chip size="small" label={`Size: ${item.variant}`} sx={{ mt: 0.5 }} />
                      )}
                      <Typography variant="body2" color="text.secondary">₹{item.price.toFixed(2)}</Typography>
                      
                      {/* Stock information */}
                      {(() => {
                        const currentStock = productStocks[item.id] ?? item.stockQty ?? 0;
                        const isOutOfStock = currentStock <= 0;
                        const exceedsStock = item.quantity > currentStock;
                        
                        if (isOutOfStock) {
                          return (
                            <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
                              <Typography variant="caption" fontWeight={600}>
                                Out of Stock - This item will be removed
                              </Typography>
                            </Alert>
                          );
                        }
                        
                        if (exceedsStock) {
                          return (
                            <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
                              <Typography variant="caption" fontWeight={600}>
                                Only {currentStock} available in stock. Quantity adjusted.
                              </Typography>
                            </Alert>
                          );
                        }
                        
                        if (currentStock <= 5) {
                          return (
                            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                              Only {currentStock} left in stock
                            </Typography>
                          );
                        }
                        
                        return null;
                      })()}
                      
                      {stockErrors[item.key] && (
                        <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
                          <Typography variant="caption">{stockErrors[item.key]}</Typography>
                        </Alert>
                      )}
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Button size="small" variant="outlined" onClick={() => updateQuantity(item.key, Math.max(1, item.quantity - 1))}>-</Button>
                        <Typography>{item.quantity}</Typography>
                        <Button 
                          size="small" 
                          variant="outlined" 
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
                          +
                        </Button>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography fontWeight={700}>₹{(item.price * item.quantity).toFixed(2)}</Typography>
                      <IconButton color="error" onClick={() => removeFromCart(item.key)}>
                        <Delete />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" fontWeight={800}>Price Details</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Subtotal</Typography>
                    <Typography>₹{cartSubtotal.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>Tax (8%)</Typography>
                    <Typography>₹{tax.toFixed(2)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography fontWeight={700}>Total</Typography>
                    <Typography fontWeight={800}>₹{total.toFixed(2)}</Typography>
                  </Box>

                  {/* Payment Method Selection */}
                  <Box sx={{ mb: 3 }}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                        Payment Method
                      </FormLabel>
                      <RadioGroup
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <FormControlLabel
                          value="cash_on_delivery"
                          control={<Radio color="success" />}
                          label={
                            <Box>
                              <Typography variant="body2">Cash on Delivery</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Pay when you receive your order
                              </Typography>
                            </Box>
                          }
                        />
                        <FormControlLabel
                          value="online"
                          control={<Radio color="success" />}
                          label={
                            <Box>
                              <Typography variant="body2">Online Payment</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Pay now with UPI, Cards, NetBanking, Wallets
                              </Typography>
                            </Box>
                          }
                        />
                      </RadioGroup>
                    </FormControl>
                  </Box>

                  {/* Check for out of stock items before allowing checkout */}
                  {(() => {
                    const hasOutOfStock = cartItems.some(item => {
                      const currentStock = productStocks[item.id] ?? item.stockQty ?? 0;
                      return currentStock <= 0 || item.quantity > currentStock;
                    });
                    
                    if (hasOutOfStock) {
                      return (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            Some items in your cart are out of stock or exceed available quantity. Please review your cart.
                          </Typography>
                        </Alert>
                      );
                    }
                    
                    return null;
                  })()}
                  
                  {user ? (
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      onClick={handlePlaceOrder}
                      disabled={placingOrder || cartItems.some(item => {
                        const currentStock = productStocks[item.id] ?? item.stockQty ?? 0;
                        return currentStock <= 0 || item.quantity > currentStock;
                      })}
                      sx={{ py: 1.5 }}
                    >
                      {placingOrder ? 'Placing Order...' : 'Place Order'}
                    </Button>
                  ) : (
                    <Button fullWidth variant="contained" color="success" onClick={goLogin}>
                      Login to Checkout
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
}
