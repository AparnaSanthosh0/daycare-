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
  Visibility,
  Cancel
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';

const VendorOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState('confirmed');
  const [vendorNotes, setVendorNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await api.get('/api/orders/vendor');
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Load orders error:', error);
      setMessage('Failed to load orders');
    }
  };

  const handleVendorConfirmation = async () => {
    try {
      await api.put(`/api/orders/vendor/${selectedOrder._id}/confirm`, {
        status: confirmationStatus,
        notes: vendorNotes,
        ...(confirmationStatus === 'confirmed' && trackingNumber && { trackingNumber })
      });

      setMessage(`Order ${confirmationStatus} successfully`);
      setConfirmDialog(false);
      setSelectedOrder(null);
      setVendorNotes('');
      setTrackingNumber('');
      loadOrders();
    } catch (error) {
      console.error('Vendor confirmation error:', error);
      setMessage(error.response?.data?.message || 'Failed to update order');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending Vendor Confirmation';
      case 'confirmed': return 'Confirmed - Ready to Ship';
      case 'rejected': return 'Rejected - Out of Stock';
      default: return status;
    }
  };

  if (user?.role !== 'vendor') {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Access Denied</Typography>
        <Typography variant="body1">Only vendors can access this page.</Typography>
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
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {orders.filter(o => o.vendorConfirmations?.some(v => v.vendor.toString() === user.userId && v.status === 'pending')).length}
              </Typography>
              <Typography variant="body2">Pending Confirmation</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {orders.filter(o => o.vendorConfirmations?.some(v => v.vendor.toString() === user.userId && v.status === 'confirmed')).length}
              </Typography>
              <Typography variant="body2">Confirmed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="info.main">
                {orders.filter(o => o.status === 'processing').length}
              </Typography>
              <Typography variant="body2">In Processing</Typography>
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
                <TableCell>Products</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => {
                const vendorConfirmation = order.vendorConfirmations?.find(
                  v => v.vendor.toString() === user.userId
                );

                return (
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
                      <Typography variant="body2">
                        {order.items?.filter(item => item.vendor?.toString() === user.userId).length || 0} items
                      </Typography>
                    </TableCell>
                    <TableCell>
                      ₹{order.total?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(vendorConfirmation?.status || 'pending')}
                        color={getStatusColor(vendorConfirmation?.status || 'pending')}
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

                        {vendorConfirmation?.status === 'pending' && (
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              setSelectedOrder(order);
                              setConfirmationStatus('confirmed');
                              setConfirmDialog(true);
                            }}
                          >
                            <CheckCircle />
                          </IconButton>
                        )}

                        {vendorConfirmation?.status === 'pending' && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedOrder(order);
                              setConfirmationStatus('rejected');
                              setConfirmDialog(true);
                            }}
                          >
                            <Cancel />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {confirmationStatus === 'confirmed' ? 'Confirm Order' : 'Reject Order'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {confirmationStatus === 'confirmed'
              ? `Confirm that you can fulfill order ${selectedOrder?.orderNumber}?`
              : `Reject order ${selectedOrder?.orderNumber}? Please provide a reason.`
            }
          </Typography>

          {confirmationStatus === 'confirmed' && (
            <TextField
              fullWidth
              label="Tracking Number (Optional)"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="Enter tracking number if available"
            />
          )}

          <TextField
            fullWidth
            label="Notes"
            value={vendorNotes}
            onChange={(e) => setVendorNotes(e.target.value)}
            multiline
            rows={3}
            placeholder={confirmationStatus === 'confirmed'
              ? "Any notes for admin or customer..."
              : "Reason for rejection (required)"
            }
            required={confirmationStatus === 'rejected'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={confirmationStatus === 'confirmed' ? 'success' : 'error'}
            onClick={handleVendorConfirmation}
            disabled={confirmationStatus === 'rejected' && !vendorNotes.trim()}
          >
            {confirmationStatus === 'confirmed' ? 'Confirm Order' : 'Reject Order'}
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
                <Typography variant="h6" gutterBottom>Your Products</Typography>
                {selectedOrder.items?.filter(item => item.vendor?.toString() === user.userId).map((item, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography>{item.name} (x{item.quantity})</Typography>
                    <Typography>₹{(item.price * item.quantity).toFixed(2)}</Typography>
                  </Box>
                ))}

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>Admin Instructions</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedOrder.notes || 'No special instructions from admin'}
                </Typography>

                {selectedOrder.estimatedDelivery && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2">
                      <strong>Estimated Delivery:</strong> {new Date(selectedOrder.estimatedDelivery).toLocaleDateString()}
                    </Typography>
                  </>
                )}
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

export default VendorOrders;
