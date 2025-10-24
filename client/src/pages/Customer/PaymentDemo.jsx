import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import api from '../../config/api';
import RAZORPAY_CONFIG from '../../config/razorpay';

// Real payment integration using Razorpay
const PaymentDemo = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const total = typeof location.state?.total === 'number' ? location.state.total : 0;
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

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

  const handlePay = async () => {
    try {
      setLoading(true);
      setError('');

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Failed to load Razorpay. Please check your internet connection.');
        setLoading(false);
        return;
      }

      // Create order on backend
      const orderResponse = await api.post('/api/payments/create-order', {
        amount: total,
        currency: 'INR',
        receipt: `order_${Date.now()}`
      });

      if (!orderResponse.data.success) {
        setError('Failed to create payment order');
        setLoading(false);
        return;
      }

      const { order } = orderResponse.data;

      // Prepare order data for payment verification
      // Since this is a demo, we'll create sample order data
      const orderData = {
        items: [
          {
            product: 'demo_product_id', // This would be actual product IDs in real implementation
            quantity: 1,
            price: total,
            name: 'Demo Product',
            image: '/logo192.svg'
          }
        ],
        shippingAddress: {
          street: 'Demo Address',
          city: 'Demo City',
          state: 'Demo State',
          zipCode: '123456'
        },
        billingAddress: {
          street: 'Demo Address',
          city: 'Demo City',
          state: 'Demo State',
          zipCode: '123456'
        },
        customerEmail: 'demo@example.com',
        customerName: 'Demo Customer',
        customerPhone: '9999999999'
      };

      // Razorpay options
      const options = {
        key: RAZORPAY_CONFIG.key_id,
        amount: order.amount,
        currency: order.currency,
        name: RAZORPAY_CONFIG.name,
        description: RAZORPAY_CONFIG.description,
        image: RAZORPAY_CONFIG.image,
        order_id: order.id,
        handler: async function (response) {
          // Verify payment on backend with order data
          try {
            const verifyResponse = await api.post('/api/payments/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderData: orderData
            });

            if (verifyResponse.data.success) {
              const createdOrder = verifyResponse.data.order;
              setError('');

              // Navigate to success page
              navigate('/payment-success', {
                state: {
                  orderNumber: createdOrder?.orderNumber,
                  transactionId: response.razorpay_payment_id
                }
              });
            } else {
              setError('Payment verification failed');
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            setError('Payment verification failed');
          }
          setLoading(false);
        },
        prefill: RAZORPAY_CONFIG.prefill,
        theme: RAZORPAY_CONFIG.theme,
        modal: {
          ondismiss: function() {
            setLoading(false);
            setError('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="sm">
        <Typography variant="h4" fontWeight={700} align="center" gutterBottom>
          Secure Payment
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" gutterBottom>
          Complete your payment securely using Razorpay
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card sx={{ borderRadius: 2, mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Order Summary
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Items Total</Typography>
              <Typography>₹{total.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Shipping</Typography>
              <Typography>₹0.00</Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>Amount to Pay</Typography>
              <Typography variant="h6" fontWeight={700} color="primary">₹{total.toFixed(2)}</Typography>
            </Box>

            <Box sx={{ mt: 3, p: 2, bgcolor: '#f0f9ff', borderRadius: 1 }}>
              <Typography variant="body2" color="primary" fontWeight={600}>
                ✓ Secure payment powered by Razorpay
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Supports UPI, Cards, NetBanking, Wallets & more
              </Typography>
            </Box>
          </CardContent>
          <CardActions sx={{ p: 2 }}>
            <Button 
              fullWidth 
              variant="contained" 
              size="large" 
              onClick={handlePay}
              disabled={loading || total <= 0}
              sx={{
                background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
                '&:hover': { background: 'linear-gradient(45deg, #5a67d8 0%, #6b46c1 100%)' }
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ color: 'white', mr: 1 }} />
                  Processing...
                </>
              ) : (
                `Pay ₹${total.toFixed(2)}`
              )}
            </Button>
          </CardActions>
        </Card>

        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button onClick={() => navigate('/shop')} disabled={loading}>Back to Shop</Button>
        </Box>
      </Container>
    </Box>
  );
};

export default PaymentDemo;