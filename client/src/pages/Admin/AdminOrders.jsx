import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  LocalShipping,
  Visibility
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';

const AdminOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await api.get('/api/orders/admin');
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Load orders error:', error);
      setMessage('Failed to load orders');
    }
  };

  const handleConfirmOrder = async () => {
    try {
      await api.put(`/api/orders/admin/${selectedOrder._id}/confirm`, {
        estimatedDelivery,
        notes: adminNotes
      });

      setMessage('Order confirmed and forwarded to vendors');
      setConfirmDialog(false);
      setSelectedOrder(null);
      setEstimatedDelivery('');
      setAdminNotes('');
      loadOrders();
    } catch (error) {
      console.error('Confirm order error:', error);
      setMessage(error.response?.data?.message || 'Failed to confirm order');
    }
  };

  const handleShipOrder = async (orderId) => {
    try {
      await api.put(`/api/orders/admin/${orderId}/ship`, {
        trackingNumber: `TT-TRACK-${Date.now()}`
      });

      setMessage('Order marked as shipped');
      loadOrders();
    } catch (error) {
      console.error('Ship order error:', error);
      setMessage('Failed to mark order as shipped');
    }
  };

  const handleDeliverOrder = async (orderId) => {
    try {
      await api.put(`/api/orders/admin/${orderId}/deliver`);

      setMessage('Order marked as delivered');
      loadOrders();
    } catch (error) {
      console.error('Deliver order error:', error);
      setMessage('Failed to mark order as delivered');
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

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending Admin Confirmation';
      case 'confirmed': return 'Confirmed by Admin';
      case 'processing': return 'Being Prepared';
      case 'shipped': return 'Shipped';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Access Denied</Typography>
        <Typography variant="body1">Only administrators can access this page.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Order Management</Typography>

      {message && (
        <Alert severity={message.includes('success') ? 'success' : 'error'} sx={{ mb: 3 }}>
          {message}
        </Alert>
      )}

      {/* Order Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {orders.filter(o => o.status === 'pending').length}
              </Typography>
              <Typography variant="body2">Pending Orders</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main">
                {orders.filter(o => o.status === 'confirmed').length}
              </Typography>
              <Typography variant="body2">Confirmed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary.main">
                {orders.filter(o => o.status === 'processing').length}
              </Typography>
              <Typography variant="body2">Processing</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {orders.filter(o => o.status === 'delivered').length}
              </Typography>
              <Typography variant="body2">Delivered</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Orders Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell fontWeight={600}>
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.customer?.firstName} {order.customer?.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {order.customer?.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {order.items?.length || 0} items
                  </TableCell>
                  <TableCell>
                    ₹{order.total?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(order.status)}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Visibility />
                      </IconButton>

                      {order.status === 'pending' && (
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => {
                            setSelectedOrder(order);
                            setConfirmDialog(true);
                          }}
                        >
                          <CheckCircle />
                        </IconButton>
                      )}

                      {order.status === 'confirmed' && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleShipOrder(order._id)}
                        >
                          <LocalShipping />
                        </IconButton>
                      )}

                      {order.status === 'shipped' && (
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleDeliverOrder(order._id)}
                        >
                          <CheckCircle />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Order Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Order</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Confirm order {selectedOrder?.orderNumber} and forward to vendors?
          </Typography>

          <TextField
            fullWidth
            label="Estimated Delivery Date"
            type="date"
            value={estimatedDelivery}
            onChange={(e) => setEstimatedDelivery(e.target.value)}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            label="Admin Notes (Optional)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            multiline
            rows={3}
            placeholder="Any special instructions for vendors..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleConfirmOrder}
          >
            Confirm & Forward to Vendors
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog
        open={!!selectedOrder && !confirmDialog}
        onClose={() => setSelectedOrder(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Order Details - {selectedOrder?.orderNumber}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Customer Info</Typography>
                <Typography><strong>Name:</strong> {selectedOrder.customer?.firstName} {selectedOrder.customer?.lastName}</Typography>
                <Typography><strong>Email:</strong> {selectedOrder.customer?.email}</Typography>
                <Typography><strong>Phone:</strong> {selectedOrder.customer?.phone}</Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>Shipping Address</Typography>
                <Typography>
                  {selectedOrder.shippingAddress?.street}<br/>
                  {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state}<br/>
                  {selectedOrder.shippingAddress?.zipCode}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Order Items</Typography>
                {selectedOrder.items?.map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>{item.name} (x{item.quantity})</Typography>
                    <Typography>₹{(item.price * item.quantity).toFixed(2)}</Typography>
                  </Box>
                ))}

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>Order Summary</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Subtotal:</Typography>
                  <Typography>₹{selectedOrder.subtotal?.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Shipping:</Typography>
                  <Typography>₹{selectedOrder.shipping?.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>Tax:</Typography>
                  <Typography>₹{selectedOrder.tax?.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <Typography>Total:</Typography>
                  <Typography>₹{selectedOrder.total?.toFixed(2)}</Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedOrder(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminOrders;
