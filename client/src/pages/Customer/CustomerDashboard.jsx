import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material';
import {
  ShoppingCart,
  Receipt,
  Person,
  Add,
  Remove,
  Delete,
  Edit
} from '@mui/icons-material';
import api from '../../config/api';

const CustomerDashboard = () => {
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  });

  useEffect(() => {
    loadCustomerData();
    loadProducts();
  }, []);

  const loadCustomerData = async () => {
    try {
      const [profileRes, ordersRes] = await Promise.all([
        api.get('/api/customers/profile'),
        api.get('/api/customers/orders')
      ]);
      setCustomer(profileRes.data);
      setOrders(ordersRes.data);
      setShippingAddress(profileRes.data.address || shippingAddress);
    } catch (err) {
      setError('Failed to load customer data');
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get('/api/products');
      setProducts(response.data);
    } catch (err) {
      setError('Failed to load products');
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product === product._id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product: product._id,
        quantity: 1,
        price: product.price,
        name: product.name,
        image: product.image
      }]);
    }
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.product !== productId));
    } else {
      setCart(cart.map(item =>
        item.product === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product !== productId));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    setLoading(true);
    try {
      const orderData = {
        items: cart,
        shippingAddress,
        billingAddress: shippingAddress,
        paymentMethod: 'card'
      };
      
      await api.post('/api/customers/orders', orderData);
      setCart([]);
      setCheckoutOpen(false);
      loadCustomerData(); // Refresh orders
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      confirmed: 'info',
      processing: 'primary',
      shipped: 'secondary',
      delivered: 'success',
      cancelled: 'error',
      refunded: 'default'
    };
    return colors[status] || 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Customer Dashboard
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Customer Info */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                Profile
              </Typography>
              {customer && (
                <Box>
                  <Typography variant="body1">
                    <strong>Name:</strong> {customer.firstName} {customer.lastName}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Email:</strong> {customer.email}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Phone:</strong> {customer.phone}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Total Orders:</strong> {customer.totalOrders}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Total Spent:</strong> ${customer.totalSpent?.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Shopping Cart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ShoppingCart sx={{ mr: 1, verticalAlign: 'middle' }} />
                Shopping Cart ({cart.length} items)
              </Typography>
              
              {cart.length === 0 ? (
                <Typography color="text.secondary">Your cart is empty</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cart.map((item) => (
                        <TableRow key={item.product}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>${item.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <IconButton
                                size="small"
                                onClick={() => updateCartQuantity(item.product, item.quantity - 1)}
                              >
                                <Remove />
                              </IconButton>
                              <Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
                              <IconButton
                                size="small"
                                onClick={() => updateCartQuantity(item.product, item.quantity + 1)}
                              >
                                <Add />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell>${(item.price * item.quantity).toFixed(2)}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeFromCart(item.product)}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              {cart.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">
                    Total: ${getCartTotal().toFixed(2)}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => setCheckoutOpen(true)}
                    disabled={loading}
                  >
                    Checkout
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Products */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Available Products
              </Typography>
              <Grid container spacing={2}>
                {products.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product._id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {product.description}
                        </Typography>
                        <Typography variant="h6" color="primary">
                          ${product.price}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Stock: {product.stock}
                        </Typography>
                        <Button
                          variant="contained"
                          size="small"
                          sx={{ mt: 1 }}
                          onClick={() => addToCart(product)}
                          disabled={product.stock <= 0}
                        >
                          Add to Cart
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Order History */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
                Order History
              </Typography>
              
              {orders.length === 0 ? (
                <Typography color="text.secondary">No orders yet</Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Order #</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Items</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Payment</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order._id}>
                          <TableCell>{order.orderNumber}</TableCell>
                          <TableCell>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{order.items.length} items</TableCell>
                          <TableCell>${order.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip
                              label={order.status}
                              color={getStatusColor(order.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.paymentStatus}
                              color={getStatusColor(order.paymentStatus)}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Checkout</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Order Summary
          </Typography>
          {cart.map((item) => (
            <Box key={item.product} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>{item.name} x {item.quantity}</Typography>
              <Typography>${(item.price * item.quantity).toFixed(2)}</Typography>
            </Box>
          ))}
          <Typography variant="h6" sx={{ mt: 2 }}>
            Total: ${getCartTotal().toFixed(2)}
          </Typography>
          
          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            Shipping Address
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                value={shippingAddress.street}
                onChange={(e) => setShippingAddress({...shippingAddress, street: e.target.value})}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="City"
                value={shippingAddress.city}
                onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="State"
                value={shippingAddress.state}
                onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="ZIP Code"
                value={shippingAddress.zipCode}
                onChange={(e) => setShippingAddress({...shippingAddress, zipCode: e.target.value})}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Country"
                value={shippingAddress.country}
                onChange={(e) => setShippingAddress({...shippingAddress, country: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Place Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerDashboard;