import React, { useCallback } from 'react';
import { Box, Container, Typography, Paper, Grid, TextField, Button, Card, CardContent, Accordion, AccordionSummary, AccordionDetails, CircularProgress, Chip } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import api from '../config/api';

export default function TrackOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { orderNumber } = useParams();
  const [orderId, setOrderId] = React.useState('');
  const [orderData, setOrderData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleTrackOrder = useCallback(async (orderIdToTrack = orderId) => {
    // Convert to string and trim, handle null/undefined cases
    const trimmedOrderId = String(orderIdToTrack || '').trim();
    
    if (!trimmedOrderId) {
      setError('Please enter an order ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/api/orders/track/${trimmedOrderId}`);
      setOrderData(response.data);
    } catch (err) {
      console.error('Error tracking order:', err);
      setError(err.response?.data?.message || 'Order not found');
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Get order ID from URL parameter or query string
  React.useEffect(() => {
    const orderParam = searchParams.get('order') || orderNumber;
    if (orderParam) {
      setOrderId(orderParam);
      // Auto-track if order ID is provided in URL
      handleTrackOrder(orderParam);
    }
  }, [searchParams, orderNumber, handleTrackOrder]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleTrackOrder();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'info';
      case 'processing': return 'primary';
      case 'shipped': return 'secondary';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Track Your Order</Typography>
        <Typography variant="body1" color="text.secondary">
          Enter your order ID to track your delivery status
        </Typography>
      </Box>

      {/* Search Form */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Order ID"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your order ID (e.g., TT-2024-001)"
              error={!!error}
              helperText={error}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="contained"
              color="success"
              fullWidth
              size="large"
              onClick={handleTrackOrder}
              disabled={loading}
              sx={{ height: '56px' }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Track Order'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Order Details */}
      {orderData && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" fontWeight={700}>
                Order #{orderData.orderNumber}
              </Typography>
              <Chip
                label={orderData.status?.toUpperCase()}
                color={getStatusColor(orderData.status)}
                variant="outlined"
              />
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Order Information</Typography>
                <Typography><strong>Order Date:</strong> {new Date(orderData.placedAt).toLocaleDateString()}</Typography>
                <Typography><strong>Payment:</strong> {orderData.paymentStatus?.toUpperCase()}</Typography>
                {orderData.trackingNumber && (
                  <Typography><strong>Tracking Number:</strong> {orderData.trackingNumber}</Typography>
                )}
                {orderData.estimatedDelivery && (
                  <Typography><strong>Estimated Delivery:</strong> {new Date(orderData.estimatedDelivery).toLocaleDateString()}</Typography>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Order Total</Typography>
                <Typography variant="h4" color="primary" fontWeight={800}>
                  ₹{orderData.totals?.total?.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Including all taxes and shipping
                </Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>Order Items</Typography>
              {orderData.items?.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, borderBottom: index < orderData.items.length - 1 ? 1 : 0, borderColor: 'divider' }}>
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
                    {item.vendor && (
                      <Typography variant="caption" color="text.secondary">
                        Vendor: {item.vendor}
                      </Typography>
                    )}
                  </Box>
                  <Typography fontWeight={600}>
                    ₹{(item.quantity * item.price).toFixed(2)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Order Timeline */}
      {orderData && orderData.timeline && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Order Timeline</Typography>
            {orderData.timeline.map((stage, index) => (
              <Box key={stage.key} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: stage.completed ? 'success.main' : 'grey.300'
                  }}
                />
                <Typography
                  sx={{
                    flex: 1,
                    fontWeight: stage.completed ? 600 : 400,
                    color: stage.completed ? 'text.primary' : 'text.secondary'
                  }}
                >
                  {stage.label}
                </Typography>
                {stage.date && (
                  <Typography variant="body2" color="text.secondary">
                    {new Date(stage.date).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>Order Tracking Help</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Orders</Typography>
              <Typography variant="body2" color="text.secondary">
                Check your recent orders in your account dashboard for quick tracking.
              </Typography>
              <Button
                variant="outlined"
                color="success"
                sx={{ mt: 2 }}
                onClick={() => navigate('/orders')}
              >
                View Order History
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Delivery Times</Typography>
              <Typography variant="body2" color="text.secondary">
                Standard delivery: 3-5 business days<br />
                Express delivery: 1-2 business days<br />
                Same day delivery: Available in select cities
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Contact Support</Typography>
              <Typography variant="body2" color="text.secondary">
                Need help with your order? Our support team is here to help.
              </Typography>
              <Button
                variant="outlined"
                color="success"
                sx={{ mt: 2 }}
                onClick={() => navigate('/support')}
              >
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>Order Status Guide</Typography>
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Order Placed</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Your order has been received and payment confirmed. We're preparing your items for shipment.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Processing</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Your order is being processed and prepared for shipment. This usually takes 1-2 business days.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Shipped</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Your order has been shipped! You should receive it within 3-5 business days.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Delivered</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Your order has been successfully delivered. Thank you for shopping with TinyTots!
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Container>
  );
}
