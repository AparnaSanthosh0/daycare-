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
  Divider,
  Tabs,
  Tab
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
  const [vendorId, setVendorId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState('confirmed');
  const [vendorNotes, setVendorNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [message, setMessage] = useState('');
  const [orderView, setOrderView] = useState('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      console.log('🔄 Loading vendor orders...');
      const response = await api.get('/orders/vendor');
      console.log('📦 Vendor orders response:', response.data);
      setOrders(response.data.orders || []);
      setVendorId(response.data.vendorId); // Store vendor ID from backend
      
      if (response.data.orders && response.data.orders.length === 0) {
        // Try debug endpoint to see what's happening
        try {
          const debugResponse = await api.get('/orders/vendor/debug');
          console.log('🔍 Debug info:', debugResponse.data);
          if (debugResponse.data.ordersWithThisVendor && debugResponse.data.ordersWithThisVendor.length > 0) {
            setMessage(`Found ${debugResponse.data.ordersWithThisVendor.length} orders but they're not showing. Check console for details.`);
          }
        } catch (debugError) {
          console.error('Debug endpoint error:', debugError);
        }
      }
    } catch (error) {
      console.error('❌ Load orders error:', error);
      console.error('Error response:', error.response?.data);
      setMessage(error.response?.data?.message || 'Failed to load orders. Check console for details.');
    }
  };

  const handleVendorConfirmation = async () => {
    try {
      await api.put(`/orders/vendor/${selectedOrder._id}/confirm`, {
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
      case 'confirmed': return 'info';
      case 'ready_for_pickup': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending Vendor Confirmation';
      case 'confirmed': return 'Confirmed - Preparing';
      case 'ready_for_pickup': return 'Ready for Pickup';
      case 'rejected': return 'Rejected - Out of Stock';
      default: return status;
    }
  };

  const isCustomizedItem = (item) => {
    const c = item?.customization;
    return !!c && (c.isCustomized || c.customizationKind === 'customized_dress' || c.type === 'dress_customizer');
  };

  const hasCustomizedForVendor = (order) => {
    if (!vendorId) return false;
    return (order.items || []).some((item) => {
      const itemVendorId = item.vendor?._id ? item.vendor._id.toString() : item.vendor?.toString();
      return itemVendorId === vendorId && isCustomizedItem(item);
    });
  };

  const visibleOrders = orders.filter((order) => {
    if (orderView === 'custom') return hasCustomizedForVendor(order);
    return true;
  });

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
                {orders.filter(o => {
                  if (!vendorId) return false;
                  const conf = o.vendorConfirmations?.find(v => {
                    const vid = v.vendor?._id ? v.vendor._id.toString() : v.vendor?.toString();
                    return vid === vendorId;
                  });
                  return conf?.status === 'pending';
                }).length}
              </Typography>
              <Typography variant="body2">Pending Confirmation</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main">
                {orders.filter(o => {
                  if (!vendorId) return false;
                  const conf = o.vendorConfirmations?.find(v => {
                    const vid = v.vendor?._id ? v.vendor._id.toString() : v.vendor?.toString();
                    return vid === vendorId;
                  });
                  return conf?.status === 'confirmed' || conf?.status === 'ready_for_pickup';
                }).length}
              </Typography>
              <Typography variant="body2">Confirmed / Ready</Typography>
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
      <Paper sx={{ mb: 2, p: 1 }}>
        <Tabs
          value={orderView}
          onChange={(_, v) => setOrderView(v)}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab value="all" label={`All Orders (${orders.length})`} />
          <Tab value="custom" label={`Customized Dress Orders (${orders.filter(hasCustomizedForVendor).length})`} />
        </Tabs>
      </Paper>

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
              {visibleOrders.map((order) => {
                // Find vendor confirmation for this vendor
                const vendorConfirmation = vendorId ? order.vendorConfirmations?.find(v => {
                  const vid = v.vendor?._id ? v.vendor._id.toString() : v.vendor?.toString();
                  return vid === vendorId;
                }) : null;

                const customCount = vendorId ? (order.items?.filter(item => {
                  const itemVendorId = item.vendor?._id ? item.vendor._id.toString() : item.vendor?.toString();
                  return itemVendorId === vendorId && isCustomizedItem(item);
                }).length || 0) : 0;

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
                        {vendorId ? order.items?.filter(item => {
                          const itemVendorId = item.vendor?._id ? item.vendor._id.toString() : item.vendor?.toString();
                          return itemVendorId === vendorId;
                        }).length || 0 : 0} items
                      </Typography>
                      {customCount > 0 && (
                        <Chip size="small" color="secondary" label={`Customized: ${customCount}`} sx={{ mt: 0.5 }} />
                      )}
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
          {confirmationStatus === 'confirmed' ? 'Confirm Order' : 
           confirmationStatus === 'ready_for_pickup' ? 'Mark Ready for Pickup' :
           'Reject Order'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {confirmationStatus === 'confirmed'
              ? `Confirm that you can fulfill order ${selectedOrder?.orderNumber}? This will calculate commission and create delivery assignment.`
              : confirmationStatus === 'ready_for_pickup'
              ? `Mark order ${selectedOrder?.orderNumber} as ready for pickup? The delivery agent will be notified.`
              : `Reject order ${selectedOrder?.orderNumber}? Please provide a reason.`
            }
          </Typography>

          {(confirmationStatus === 'confirmed' || confirmationStatus === 'ready_for_pickup') && (
            <TextField
              fullWidth
              label="Notes (Optional)"
              value={vendorNotes}
              onChange={(e) => setVendorNotes(e.target.value)}
              sx={{ mb: 2 }}
              multiline
              rows={2}
              placeholder={confirmationStatus === 'ready_for_pickup' 
                ? "Any notes for the delivery agent..."
                : "Any notes for admin or customer..."}
            />
          )}

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

          {confirmationStatus === 'rejected' && (
            <TextField
              fullWidth
              label="Reason for Rejection"
              value={vendorNotes}
              onChange={(e) => setVendorNotes(e.target.value)}
              multiline
              rows={3}
              placeholder="Reason for rejection (required)"
              required
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color={confirmationStatus === 'confirmed' ? 'success' : 'error'}
            onClick={handleVendorConfirmation}
            disabled={confirmationStatus === 'rejected' && !vendorNotes.trim()}
          >
            {confirmationStatus === 'confirmed' ? 'Confirm Order' : 
             confirmationStatus === 'ready_for_pickup' ? 'Mark Ready for Pickup' :
             'Reject Order'}
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
                {vendorId ? selectedOrder.items?.filter(item => {
                  const itemVendorId = item.vendor?._id ? item.vendor._id.toString() : item.vendor?.toString();
                  return itemVendorId === vendorId;
                }).map((item, index) => (
                  <Box key={index} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>{item.name} (x{item.quantity})</Typography>
                      <Typography>₹{(item.price * item.quantity).toFixed(2)}</Typography>
                    </Box>
                    {item.customization && (
                      <Box sx={{ mt: 0.5, p: 1, bgcolor: '#f3e5f5', borderRadius: 1, border: '1px solid #ce93d8' }}>
                        <Typography variant="caption" color="secondary" fontWeight={700} display="block">🎨 Custom Design Request</Typography>
                        {item.customization.category && <Typography variant="caption" display="block">Category: {item.customization.category}</Typography>}
                        {item.customization.garmentType && <Typography variant="caption" display="block">Garment: {item.customization.garmentType}</Typography>}
                        {item.customization.baseColour && <Typography variant="caption" display="block">Colour: {item.customization.baseColour}</Typography>}
                        {item.customization.silhouette && <Typography variant="caption" display="block">Silhouette: {item.customization.silhouette}</Typography>}
                        {item.customization.sleeves && <Typography variant="caption" display="block">Sleeves: {item.customization.sleeves}</Typography>}
                        {item.customization.length && <Typography variant="caption" display="block">Length: {item.customization.length}</Typography>}
                        {item.customization.neckline && <Typography variant="caption" display="block">Neckline: {item.customization.neckline}</Typography>}
                        {item.customization.pattern && <Typography variant="caption" display="block">Pattern: {item.customization.pattern}</Typography>}
                        {item.customization.text && <Typography variant="caption" display="block">Text: "{item.customization.text}"</Typography>}
                        {item.customization.features?.length > 0 && <Typography variant="caption" display="block">Features: {item.customization.features.join(', ')}</Typography>}
                        {item.customization.previewDataUrl && (
                          <Box component="img" src={item.customization.previewDataUrl} alt="Custom preview"
                            sx={{ mt: 0.5, maxWidth: 80, maxHeight: 80, borderRadius: 1, border: '1px solid #ce93d8' }} />
                        )}
                      </Box>
                    )}
                  </Box>
                )) : null}

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
