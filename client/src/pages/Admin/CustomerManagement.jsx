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
  Alert,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Avatar,
  Stack,
  Divider,
  Badge,
  Tooltip
} from '@mui/material';
import { 
  Visibility, 
  Search, 
  FilterList, 
  Refresh, 
  PersonAdd,
  ShoppingCart,
  Payment,
  Receipt,
  TrendingUp,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  AttachMoney
} from '@mui/icons-material';
import api from '../../config/api';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [tabValue, setTabValue] = useState(0);
  
  // Statistics
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    newCustomersThisMonth: 0
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/customers');
      const customersData = response.data;
      setCustomers(customersData);
      
      // Calculate statistics
      const totalCustomers = customersData.length;
      const activeCustomers = customersData.filter(c => c.isActive).length;
      const totalRevenue = customersData.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
      const averageOrderValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
      const newCustomersThisMonth = customersData.filter(c => {
        const customerDate = new Date(c.createdAt);
        const currentDate = new Date();
        return customerDate.getMonth() === currentDate.getMonth() && 
               customerDate.getFullYear() === currentDate.getFullYear();
      }).length;
      
      setStats({
        totalCustomers,
        activeCustomers,
        totalRevenue,
        averageOrderValue,
        newCustomersThisMonth
      });
    } catch (err) {
      setError('Failed to load customers');
      console.error('Error loading customers:', err);
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
    return `₹${amount?.toFixed(2) || '0.00'}`;
  };

  // Filter and sort customers
  const getFilteredCustomers = () => {
    let filtered = customers.filter(customer => {
      const matchesSearch = !searchTerm || 
        `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && customer.isActive) ||
        (statusFilter === 'inactive' && !customer.isActive);
      
      return matchesSearch && matchesStatus;
    });

    // Sort customers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'name':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'spent':
          return (b.totalSpent || 0) - (a.totalSpent || 0);
        case 'orders':
          return (b.totalOrders || 0) - (a.totalOrders || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          🛒 E-commerce Customer Management
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadCustomers}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* Alerts */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {stats.totalCustomers}
                  </Typography>
                  <Typography variant="body2">Total Customers</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <PersonAdd />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'success.main', color: 'white', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {stats.activeCustomers}
                  </Typography>
                  <Typography variant="body2">Active Customers</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <TrendingUp />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'info.main', color: 'white', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(stats.totalRevenue)}
                  </Typography>
                  <Typography variant="body2">Total Revenue</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <AttachMoney />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'warning.main', color: 'white', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(stats.averageOrderValue)}
                  </Typography>
                  <Typography variant="body2">Avg Order Value</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <ShoppingCart />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ bgcolor: 'secondary.main', color: 'white', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {stats.newCustomersThisMonth}
                  </Typography>
                  <Typography variant="body2">New This Month</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <CalendarToday />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search customers by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Customers</MenuItem>
                <MenuItem value="active">Active Only</MenuItem>
                <MenuItem value="inactive">Inactive Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="oldest">Oldest First</MenuItem>
                <MenuItem value="name">Name A-Z</MenuItem>
                <MenuItem value="spent">Highest Spent</MenuItem>
                <MenuItem value="orders">Most Orders</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Showing {getFilteredCustomers().length} of {customers.length} customers
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Customer Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList />
            Customer List ({getFilteredCustomers().length})
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Customer</strong></TableCell>
                  <TableCell align="center"><strong>Contact</strong></TableCell>
                  <TableCell align="center"><strong>Orders</strong></TableCell>
                  <TableCell align="center"><strong>Total Spent</strong></TableCell>
                  <TableCell align="center"><strong>Status</strong></TableCell>
                  <TableCell align="center"><strong>Joined</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredCustomers().map((customer) => (
                  <TableRow key={customer._id} sx={{ '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            {customer.firstName} {customer.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {customer._id.slice(-8)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email fontSize="small" color="action" />
                          <Typography variant="body2">{customer.email}</Typography>
                        </Box>
                        {customer.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Phone fontSize="small" color="action" />
                            <Typography variant="caption">{customer.phone}</Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          {customer.totalOrders || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          orders
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {formatCurrency(customer.totalSpent || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={customer.isActive ? 'Active' : 'Inactive'}
                        color={getStatusColor(customer.isActive)}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {formatDate(customer.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => viewCustomerDetails(customer._id)}
                          sx={{ color: 'primary.main' }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {selectedCustomer?.customer?.firstName?.charAt(0)}{selectedCustomer?.customer?.lastName?.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h6">
              {selectedCustomer?.customer?.firstName} {selectedCustomer?.customer?.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Customer ID: {selectedCustomer?.customer?._id?.slice(-8)}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedCustomer && (
            <Box>
              {/* Customer Overview Stats */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'primary.light', color: 'white' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {selectedCustomer.customer.totalOrders || 0}
                      </Typography>
                      <Typography variant="body2">Total Orders</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'success.light', color: 'white' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(selectedCustomer.customer.totalSpent || 0)}
                      </Typography>
                      <Typography variant="body2">Total Spent</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: 'info.light', color: 'white' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency((selectedCustomer.customer.totalSpent || 0) / Math.max(selectedCustomer.customer.totalOrders || 1, 1))}
                      </Typography>
                      <Typography variant="body2">Avg Order Value</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: selectedCustomer.customer.isActive ? 'success.light' : 'error.light', color: 'white' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {selectedCustomer.customer.isActive ? 'Active' : 'Inactive'}
                      </Typography>
                      <Typography variant="body2">Account Status</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                {/* Personal Information */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonAdd />
                        Personal Information
                      </Typography>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Full Name</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            {selectedCustomer.customer.firstName} {selectedCustomer.customer.lastName}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Email</Typography>
                          <Typography variant="body1">{selectedCustomer.customer.email}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Phone</Typography>
                          <Typography variant="body1">{selectedCustomer.customer.phone || 'Not provided'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Gender</Typography>
                          <Typography variant="body1">
                            {selectedCustomer.customer.gender || 'Not specified'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
                          <Typography variant="body1">
                            {selectedCustomer.customer.dateOfBirth 
                              ? formatDate(selectedCustomer.customer.dateOfBirth)
                              : 'Not specified'
                            }
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Member Since</Typography>
                          <Typography variant="body1">
                            {formatDate(selectedCustomer.customer.createdAt)}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Address Information */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn />
                        Address Information
                      </Typography>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Street Address</Typography>
                          <Typography variant="body1">
                            {selectedCustomer.customer.address?.street || 'Not provided'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">City</Typography>
                          <Typography variant="body1">
                            {selectedCustomer.customer.address?.city || 'Not provided'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">State</Typography>
                          <Typography variant="body1">
                            {selectedCustomer.customer.address?.state || 'Not provided'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">ZIP Code</Typography>
                          <Typography variant="body1">
                            {selectedCustomer.customer.address?.zipCode || 'Not provided'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Country</Typography>
                          <Typography variant="body1">
                            {selectedCustomer.customer.address?.country || 'Not provided'}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Order History */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ShoppingCart />
                        Order History ({selectedCustomer.orders?.length || 0})
                      </Typography>
                      {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell><strong>Order #</strong></TableCell>
                                <TableCell><strong>Date</strong></TableCell>
                                <TableCell align="center"><strong>Items</strong></TableCell>
                                <TableCell align="center"><strong>Total</strong></TableCell>
                                <TableCell align="center"><strong>Status</strong></TableCell>
                                <TableCell align="center"><strong>Payment</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedCustomer.orders.map((order) => (
                                <TableRow key={order._id}>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      {order.orderNumber || order._id.slice(-8)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                                  <TableCell align="center">
                                    <Chip label={order.items?.length || 0} size="small" color="primary" />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                      {formatCurrency(order.total)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip
                                      label={order.status}
                                      color={order.status === 'delivered' ? 'success' : 
                                             order.status === 'pending' ? 'warning' : 'error'}
                                      size="small"
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip
                                      label={order.paymentStatus}
                                      color={order.paymentStatus === 'paid' ? 'success' : 'error'}
                                      size="small"
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <ShoppingCart sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                          <Typography color="text.secondary">No orders found</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerManagement;
