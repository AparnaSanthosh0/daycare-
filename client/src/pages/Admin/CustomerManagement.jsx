import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton
} from '@mui/material';
import { Person, Visibility, Edit, Delete } from '@mui/icons-material';
import api from '../../config/api';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/customers');
      setCustomers(response.data);
    } catch (err) {
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const viewCustomerDetails = async (customerId) => {
    try {
      const response = await api.get(`/api/customers/${customerId}`);
      setSelectedCustomer(response.data);
      setDetailsOpen(true);
    } catch (err) {
      setError('Failed to load customer details');
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'success' : 'error';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return `$${amount?.toFixed(2) || '0.00'}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Customer Management
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            All Customers ({customers.length})
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Total Orders</TableCell>
                  <TableCell>Total Spent</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer._id}>
                    <TableCell>
                      {customer.firstName} {customer.lastName}
                    </TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.totalOrders}</TableCell>
                    <TableCell>{formatCurrency(customer.totalSpent)}</TableCell>
                    <TableCell>
                      <Chip
                        label={customer.isActive ? 'Active' : 'Inactive'}
                        color={getStatusColor(customer.isActive)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(customer.createdAt)}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => viewCustomerDetails(customer._id)}
                        title="View Details"
                      >
                        <Visibility />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Customer Details</DialogTitle>
        <DialogContent>
          {selectedCustomer && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Personal Information</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Name</Typography>
                  <Typography variant="body1">
                    {selectedCustomer.customer.firstName} {selectedCustomer.customer.lastName}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{selectedCustomer.customer.email}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Phone</Typography>
                  <Typography variant="body1">{selectedCustomer.customer.phone}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Gender</Typography>
                  <Typography variant="body1">
                    {selectedCustomer.customer.gender || 'Not specified'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
                  <Typography variant="body1">
                    {selectedCustomer.customer.dateOfBirth 
                      ? formatDate(selectedCustomer.customer.dateOfBirth)
                      : 'Not specified'
                    }
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Address</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Street</Typography>
                  <Typography variant="body1">
                    {selectedCustomer.customer.address?.street || 'Not provided'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">City</Typography>
                  <Typography variant="body1">
                    {selectedCustomer.customer.address?.city || 'Not provided'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">State</Typography>
                  <Typography variant="body1">
                    {selectedCustomer.customer.address?.state || 'Not provided'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">ZIP Code</Typography>
                  <Typography variant="body1">
                    {selectedCustomer.customer.address?.zipCode || 'Not provided'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Country</Typography>
                  <Typography variant="body1">
                    {selectedCustomer.customer.address?.country || 'Not provided'}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Order History</Typography>
                {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Order #</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Items</TableCell>
                          <TableCell>Total</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedCustomer.orders.map((order) => (
                          <TableRow key={order._id}>
                            <TableCell>{order.orderNumber}</TableCell>
                            <TableCell>{formatDate(order.createdAt)}</TableCell>
                            <TableCell>{order.items.length}</TableCell>
                            <TableCell>{formatCurrency(order.total)}</TableCell>
                            <TableCell>
                              <Chip
                                label={order.status}
                                color={getStatusColor(order.status === 'delivered')}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography color="text.secondary">No orders found</Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerManagement;
