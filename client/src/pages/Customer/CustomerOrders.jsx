import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  ShoppingBag,
  Visibility,
  Refresh
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';

const CustomerOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/orders/customer');
      setOrders(response.data.orders || []);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight={800}>
            My Orders
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadOrders}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {orders.length === 0 ? (
          <Card variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <ShoppingBag sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No orders found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              You haven't placed any orders yet.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/shop')}>
              Start Shopping
            </Button>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {orders.map((order) => (
              <Grid item xs={12} key={order._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          Order #{order.orderNumber}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Placed on {formatDate(order.createdAt)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Chip
                          label={order.status?.toUpperCase()}
                          color={getStatusColor(order.status)}
                          variant="outlined"
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="h6" fontWeight={800} color="primary">
                          ₹{order.total?.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {order.items?.length || 0} item(s) • Payment: {order.paymentStatus?.toUpperCase()}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    {/* Order Items Preview */}
                    <Box sx={{ mb: 2 }}>
                      {order.items?.slice(0, 2).map((item, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Box
                            component="img"
                            src={item.image || '/logo192.svg'}
                            alt={item.name}
                            sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {item.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Qty: {item.quantity} × ₹{item.price?.toFixed(2)}
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={600}>
                            ₹{(item.quantity * item.price).toFixed(2)}
                          </Typography>
                        </Box>
                      ))}
                      {order.items?.length > 2 && (
                        <Typography variant="caption" color="text.secondary">
                          +{order.items.length - 2} more item(s)
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => navigate(`/track-order?order=${order.orderNumber}`)}
                        >
                          Track Order
                        </Button>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Total: ₹{order.total?.toFixed(2)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default CustomerOrders;
