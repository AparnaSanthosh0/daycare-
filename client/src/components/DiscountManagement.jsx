import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  LocalOffer,
  Check,
  Close,
  Visibility
} from '@mui/icons-material';
import api from '../config/api';

const DiscountManagement = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [pendingDiscounts, setPendingDiscounts] = useState([]);
  const [activeDiscounts, setActiveDiscounts] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog states
  const [viewDialog, setViewDialog] = useState({ open: false, product: null });
  const [approveDialog, setApproveDialog] = useState({ open: false, product: null });
  const [rejectDialog, setRejectDialog] = useState({ open: false, product: null });
  
  // Form states
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (userRole === 'admin') {
      loadDiscounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  const loadDiscounts = async () => {
    try {
      const [pendingRes, productsRes] = await Promise.all([
        api.get('/api/admin/discounts/pending'),
        api.get('/api/products?all=true')
      ]);
      
      setPendingDiscounts(pendingRes.data || []);
      
      // Filter products with active discounts
      const active = (productsRes.data?.products || productsRes.data || []).filter(
        p => p.discountStatus === 'active' && p.activeDiscount > 0
      );
      setActiveDiscounts(active);
    } catch (err) {
      console.error('Error loading discounts:', err);
      setError('Failed to load discounts');
    }
  };

  const handleApprove = async () => {
    try {
      await api.post(`/api/products/${approveDialog.product._id}/discount-approval`, {
        action: 'approve'
      });
      setSuccess('Discount approved successfully');
      setApproveDialog({ open: false, product: null });
      loadDiscounts();
    } catch (err) {
      setError('Failed to approve discount: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReject = async () => {
    try {
      await api.post(`/api/products/${rejectDialog.product._id}/discount-approval`, {
        action: 'reject',
        reason: rejectionReason
      });
      setSuccess('Discount rejected');
      setRejectDialog({ open: false, product: null });
      setRejectionReason('');
      loadDiscounts();
    } catch (err) {
      setError('Failed to reject discount: ' + (err.response?.data?.message || err.message));
    }
  };



  if (userRole !== 'admin' && userRole !== 'vendor') {
    return (
      <Alert severity="warning">Access denied. Admin or Vendor privileges required.</Alert>
    );
  }

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocalOffer color="primary" />
              <Typography variant="h6">Discount Management</Typography>
            </Box>
          }
          subheader={userRole === 'admin' ? 'Approve/reject vendor discounts and apply your own' : 'Suggest discounts for your products'}
        />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {userRole === 'admin' && (
            <Box>
              <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
                <Tab label="Pending Approvals" />
                <Tab label="Active Discounts" />
              </Tabs>

              {/* Pending Approvals Tab */}
              {activeTab === 0 && (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell>Vendor</TableCell>
                        <TableCell>Current Price</TableCell>
                        <TableCell>Suggested Discount</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingDiscounts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <Typography color="text.secondary">No pending discounts</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingDiscounts.map((product) => (
                          <TableRow key={product._id}>
                            <TableCell>
                              <Typography variant="subtitle2">{product.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {product.category}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {product.suggestedBy?.vendorName || product.vendor?.vendorName || 'N/A'}
                            </TableCell>
                            <TableCell>₹{product.price}</TableCell>
                            <TableCell>
                              <Chip label={`${product.suggestedDiscount}%`} color="primary" size="small" />
                            </TableCell>
                            <TableCell>{product.discountReason || 'No reason provided'}</TableCell>
                            <TableCell>
                              <Chip label={product.discountStatus} color="warning" size="small" />
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => setViewDialog({ open: true, product })}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Approve">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => setApproveDialog({ open: true, product })}
                                >
                                  <Check />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setRejectDialog({ open: true, product })}
                                >
                                  <Close />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Active Discounts Tab */}
              {activeTab === 1 && (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell>Original Price</TableCell>
                        <TableCell>Discount</TableCell>
                        <TableCell>Discounted Price</TableCell>
                        <TableCell>Savings</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeDiscounts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            <Typography color="text.secondary">No active discounts</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeDiscounts.map((product) => (
                          <TableRow key={product._id}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>₹{product.price}</TableCell>
                            <TableCell>
                              <Chip label={`${product.activeDiscount}%`} color="success" size="small" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="subtitle2" color="success.main">
                                ₹{Math.round(product.price * (1 - product.activeDiscount / 100))}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography color="error">
                                Save ₹{Math.round((product.price * product.activeDiscount) / 100)}
                              </Typography>
                            </TableCell>
                            <TableCell>{product.discountReason || 'N/A'}</TableCell>
                            <TableCell align="right">
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => setViewDialog({ open: true, product })}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, product: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Discount Details</DialogTitle>
        <DialogContent>
          {viewDialog.product && (
            <Box>
              <Typography variant="h6" gutterBottom>{viewDialog.product.name}</Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Category</Typography>
                  <Typography variant="body1">{viewDialog.product.category}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Price</Typography>
                  <Typography variant="body1">₹{viewDialog.product.price}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Suggested Discount</Typography>
                  <Typography variant="body1">{viewDialog.product.suggestedDiscount}%</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Status</Typography>
                  <Chip
                    label={viewDialog.product.discountStatus}
                    color={
                      viewDialog.product.discountStatus === 'active' ? 'success' :
                      viewDialog.product.discountStatus === 'suggested' ? 'warning' : 'default'
                    }
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Reason</Typography>
                  <Typography variant="body1">
                    {viewDialog.product.discountReason || 'No reason provided'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, product: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog
        open={approveDialog.open}
        onClose={() => setApproveDialog({ open: false, product: null })}
      >
        <DialogTitle>Approve Discount</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Approving this discount will activate {approveDialog.product?.suggestedDiscount}% off on {approveDialog.product?.name}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog({ open: false, product: null })}>Cancel</Button>
          <Button onClick={handleApprove} variant="contained" color="success">
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ open: false, product: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Discount</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Explain why this discount is being rejected..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, product: null })}>Cancel</Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiscountManagement;
