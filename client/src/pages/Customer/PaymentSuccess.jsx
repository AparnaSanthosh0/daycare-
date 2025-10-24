import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Divider,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle,
  ShoppingBag,
  LocalShipping,
  CreditCard,
  ArrowForward
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get order data from location state or URL params
  const orderNumber = location.state?.orderNumber || new URLSearchParams(location.search).get('order');

  const loadOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/orders/track/${orderNumber}`);
      setOrderDetails(response.data);
    } catch (err) {
      console.error('Error loading order details:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    if (orderNumber) {
      loadOrderDetails();
    } else {
      setLoading(false);
      setError('Order number not found');
    }
  }, [orderNumber, loadOrderDetails]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button variant="contained" onClick={() => navigate('/shop')}>
            Back to Shop
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        {/* Success Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <CheckCircle sx={{ fontSize: 80, color: '#4caf50', mb: 2 }} />
          <Typography variant="h3" fontWeight={800} color="success.main" gutterBottom>
            Payment Successful!
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Your order has been placed successfully
          </Typography>
        </Box>

        {/* Order Summary Card */}
        {orderDetails && (
          <Card sx={{ mb: 4, borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={700}>
                  Order #{orderDetails.orderNumber}
                </Typography>
                <Chip
                  label={orderDetails.status?.toUpperCase()}
                  color="success"
                  variant="outlined"
                />
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Order Details
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <ShoppingBag fontSize="small" color="action" />
                    <Typography variant="body2">
                      Order Date: {new Date(orderDetails.placedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CreditCard fontSize="small" color="action" />
                    <Typography variant="body2">
                      Payment: {orderDetails.paymentStatus?.toUpperCase()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocalShipping fontSize="small" color="action" />
                    <Typography variant="body2">
                      Delivery: {orderDetails.estimatedDelivery ? new Date(orderDetails.estimatedDelivery).toLocaleDateString() : '3-5 business days'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Total Amount
                  </Typography>
                  <Typography variant="h4" color="primary" fontWeight={800}>
                    ₹{orderDetails.totals?.total?.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Including all taxes and shipping
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Order Items */}
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Items Ordered
              </Typography>
              {orderDetails.items?.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                  <Box
                    component="img"
                    src={item.image}
                    alt={item.name}
                    sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1 }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={600}>{item.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Quantity: {item.quantity} × ₹{item.price?.toFixed(2)}
                    </Typography>
                  </Box>
                  <Typography fontWeight={600}>
                    ₹{(item.quantity * item.price).toFixed(2)}
                  </Typography>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              {/* Order Totals */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Subtotal</Typography>
                <Typography>₹{orderDetails.totals?.subtotal?.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Shipping</Typography>
                <Typography>₹{orderDetails.totals?.shipping?.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Tax</Typography>
                <Typography>₹{orderDetails.totals?.tax?.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontWeight={700}>Total</Typography>
                <Typography fontWeight={800} color="primary">₹{orderDetails.totals?.total?.toFixed(2)}</Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/customer')}
            endIcon={<ArrowForward />}
          >
            Continue Shopping
          </Button>
          {user?.role === 'customer' && (
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/orders')}
            >
              View Order History
            </Button>
          )}
        </Box>

        {/* Additional Information */}
        <Box sx={{ textAlign: 'center', mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            A confirmation email has been sent to your registered email address with order details.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            You can track your order status using the order number above.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default PaymentSuccess;
