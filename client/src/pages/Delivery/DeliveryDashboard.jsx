import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Stack,
  Chip,
  Button,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  LocalShipping,
  DirectionsBike,
  MonetizationOn,
  Schedule,
  Place,
  ErrorOutline,
  DoneAll,
  AccountCircle,
  ShoppingCart,
  Logout,
} from '@mui/icons-material';
import { Avatar, IconButton, Tooltip } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';
import DaycareLocationMap from '../../components/Maps/DaycareLocationMap';
import VoiceAssistant from '../../VoiceAssistant';
import Dialog from '@mui/material/Dialog';

const fmtCurrency = (v) => `$${v.toFixed(2)}`;

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    avgRating: 0,
    onTimeRate: 0,
    totalOrders: 0,
  });
  const [vaOpen, setVaOpen] = useState(false);

  // Fetch available assignments
  const fetchAvailableAssignments = useCallback(async () => {
    try {
      console.log('🔍 Fetching available assignments...');
      console.log('🔧 API baseURL:', api.defaults.baseURL);
      const response = await api.get('/delivery-assignments/available');
      console.log('✅ Response:', response.data);
      setOrders(response.data.assignments || []);
    } catch (err) {
      console.error('❌ Error fetching available assignments:', err);
      console.error('❌ Error response:', err.response);
      if (err.response?.status === 403) {
        setError('Access denied. Please login as a delivery agent.');
      } else {
        setError(err.response?.data?.message || 'Failed to load available assignments');
      }
    }
  }, []);

  // Fetch my active assignments
  const fetchMyAssignments = useCallback(async () => {
    try {
      const response = await api.get('/delivery-assignments/my-assignments');
      const assignments = response.data.assignments || [];
      
      // Find active delivery (picked up or in transit)
      const active = assignments.find(a => a.status === 'picked_up' || a.status === 'in_transit');
      setActiveDelivery(active || null);
      
    } catch (err) {
      console.error('Error fetching my assignments:', err);
      setError(err.response?.data?.message || 'Failed to load your assignments');
    }
  }, []);

  // Fetch completed deliveries
  const fetchCompleted = useCallback(async () => {
    try {
      const response = await api.get('/delivery-assignments/my-assignments?status=delivered');
      setCompleted(response.data.assignments || []);
    } catch (err) {
      console.error('Error fetching completed deliveries:', err);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      // Calculate stats from completed deliveries
      const today = new Date().toDateString();
      const todayDeliveries = completed.filter(d => 
        new Date(d.deliveredAt).toDateString() === today
      );
      
      const todayEarnings = todayDeliveries.reduce((sum, d) => sum + (d.agentShare || 0), 0);
      const avgRating = completed.length > 0 
        ? completed.reduce((sum, d) => sum + (d.rating || 0), 0) / completed.length 
        : 0;
      
      setStats({
        todayDeliveries: todayDeliveries.length,
        todayEarnings: todayEarnings,
        avgRating: avgRating,
        onTimeRate: 97, // TODO: Calculate from actual data
        totalOrders: orders.length + (activeDelivery ? 1 : 0)
      });
    } catch (err) {
      console.error('Error calculating stats:', err);
    }
  }, [completed, orders, activeDelivery]);

  // Load all data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAvailableAssignments(),
        fetchMyAssignments(),
        fetchCompleted()
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchAvailableAssignments, fetchMyAssignments, fetchCompleted]);

  // Update stats when data changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleAccept = async (assignmentId) => {
    try {
      await api.put(`/delivery-assignments/${assignmentId}/accept`);
      setSuccess(`Assignment accepted successfully!`);
      await Promise.all([fetchAvailableAssignments(), fetchMyAssignments()]);
    } catch (err) {
      console.error('Error accepting assignment:', err);
      setError(err.response?.data?.message || 'Failed to accept assignment');
    }
  };

  const handleCompleteActive = async () => {
    if (!activeDelivery) return;
    try {
      await api.put(`/delivery-assignments/${activeDelivery._id}/deliver`, {
        notes: 'Delivered successfully'
      });
      setSuccess('Delivery completed. Great job!');
      await Promise.all([fetchMyAssignments(), fetchCompleted()]);
      setActiveDelivery(null);
    } catch (err) {
      console.error('Error completing delivery:', err);
      setError(err.response?.data?.message || 'Failed to complete delivery');
    }
  };

  const ordersCount = orders.length;

  const handleVaOpen = () => setVaOpen(true);
  const handleVaClose = () => setVaOpen(false);

  return (
    <Box sx={{ p: 3, bgcolor: '#f7f8fb', minHeight: '100vh' }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Delivery Agent Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">Mike Rodriguez - Agent #DA-042</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip color="success" label="Online" icon={<DirectionsBike />} />
          <Button variant="outlined" startIcon={<ErrorOutline />} onClick={() => setError('Contact support: placeholder action')}>
            Report Issue
          </Button>
          <Tooltip title="Shop">
            <IconButton size="large" onClick={() => navigate('/shop')}>
              <ShoppingCart />
            </IconButton>
          </Tooltip>
          <Tooltip title="Profile">
            <IconButton size="large" sx={{ ml: 1 }} onClick={() => navigate('/profile')}>
              <Avatar sx={{ bgcolor: '#14B8A6' }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
          </Tooltip>
          <Button 
            variant="outlined" 
            startIcon={<Logout />}
            onClick={() => {
              logout();
              navigate('/');
            }}
            sx={{ 
              ml: 1,
              textTransform: 'none',
              borderColor: '#d32f2f',
              color: '#d32f2f',
              '&:hover': {
                borderColor: '#b71c1c',
                backgroundColor: 'rgba(211, 47, 47, 0.04)'
              }
            }}
          >
            Logout
          </Button>
        </Stack>
      </Paper>

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
            <Typography color="text.secondary">Today’s Deliveries</Typography>
            <Typography variant="h4">{stats.todayDeliveries}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
            <Typography color="text.secondary">Today’s Earnings</Typography>
            <Typography variant="h4" sx={{ color: '#13b655' }}>{fmtCurrency(stats.todayEarnings)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
            <Typography color="text.secondary">Average Rating</Typography>
            <Typography variant="h4" sx={{ color: '#f08a00' }}>{stats.avgRating}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
            <Typography color="text.secondary">On-Time Rate</Typography>
            <Typography variant="h4" sx={{ color: '#2f86ff' }}>{stats.onTimeRate}%</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ minHeight: 44 }}>
          <Tab label={`Available Orders`} icon={<LocalShipping />} iconPosition="start" sx={{ textTransform: 'none' }} />
          <Tab label="Active Delivery" icon={<Schedule />} iconPosition="start" sx={{ textTransform: 'none' }} />
          <Tab label="Completed" icon={<DoneAll />} iconPosition="start" sx={{ textTransform: 'none' }} />
          <Tab label="Earnings" icon={<MonetizationOn />} iconPosition="start" sx={{ textTransform: 'none' }} />
          <Tab label="Map & Routes" icon={<Place />} iconPosition="start" sx={{ textTransform: 'none' }} />
        </Tabs>
        <Chip label={`${ordersCount} Orders`} color="warning" variant="outlined" />
      </Box>

      {/* Available Orders */}
      {tab === 0 && (
        <Stack spacing={2}>
          {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
          {!loading && orders.length === 0 && <Typography color="text.secondary">No available orders at the moment.</Typography>}
          {!loading && orders.map((assignment) => (
            <Paper key={assignment._id} sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6">{assignment.orderNumber}</Typography>
                  <Chip size="small" label={`${assignment.items?.length || 0} items`} />
                </Stack>
                <Chip label={`₹${assignment.agentShare?.toFixed(2) || '0.00'}`} sx={{ backgroundColor: '#f3fff8', color: '#13b655', fontWeight: 600 }} />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Pickup from: <strong>{assignment.vendorName || 'Vendor'}</strong> — {assignment.pickupLocation?.address || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Deliver to: <strong>{assignment.customerName || 'Customer'}</strong> — {assignment.deliveryLocation?.address || 'N/A'}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip icon={<Place />} label={`${assignment.pickupLocation?.zone || 'N/A'} → ${assignment.deliveryLocation?.zone || 'N/A'}`} size="small" />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  fullWidth
                  variant="contained"
                  sx={{
                    backgroundColor: '#14B8A6',
                    '&:hover': { backgroundColor: '#0d9488' }
                  }}
                  onClick={() => handleAccept(assignment._id)}
                >
                  Accept Order
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Active Delivery */}
      {tab === 1 && !activeDelivery && (
        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
          <Typography variant="body1" color="text.secondary">
            No active delivery at the moment.
          </Typography>
        </Paper>
      )}

      {tab === 1 && activeDelivery && (
        <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6">Active Delivery</Typography>
            <Chip color="success" label={activeDelivery.status === 'delivered' ? 'Completed' : 'In Progress'} />
          </Stack>
          <Typography variant="body1" fontWeight={600}>
            {activeDelivery._id || activeDelivery.id} — {activeDelivery.order?.items?.length || 0} items
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Pickup: {activeDelivery.vendor?.businessName || 'Vendor'}, {activeDelivery.vendor?.address || 'Address'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Drop: {activeDelivery.order?.customer?.name || 'Customer'}, {activeDelivery.order?.shippingAddress?.street || 'Address'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip icon={<Place />} label={`${activeDelivery.distance?.toFixed(1) || 0} km`} />
            <Chip icon={<MonetizationOn />} label={`₹${activeDelivery.agentShare || 0}`} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {activeDelivery.status !== 'delivered' && (
              <Button variant="contained" color="primary" onClick={handleCompleteActive}>
                Mark as Delivered
              </Button>
            )}
            <Button variant="outlined" onClick={() => setSuccess('Contacted customer (placeholder)')}>
              Contact Customer
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Completed */}
      {tab === 2 && (
        <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Completed Deliveries</Typography>
          {completed.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No completed deliveries yet.
            </Typography>
          ) : (
            <List>
              {completed.map((c) => (
                <React.Fragment key={c._id}>
                  <ListItem
                    secondaryAction={<Chip label={`₹${c.agentShare || 0}`} color="secondary" />}
                  >
                    <ListItemText
                      primary={`Order #${c.order?.orderNumber || c._id} ${c.customerRating ? `• Rating: ${c.customerRating}⭐` : ''}`}
                      secondary={c.deliveredAt ? new Date(c.deliveredAt).toLocaleDateString() : 'N/A'}
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      )}

      {/* Earnings */}
      {tab === 3 && (
        <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Earnings Summary</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography color="text.secondary">Today</Typography>
                <Typography variant="h5">{fmtCurrency(stats.todayEarnings)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography color="text.secondary">On-Time Rate</Typography>
                <Typography variant="h5" color="primary.main">{stats.onTimeRate}%</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography color="text.secondary">Deliveries</Typography>
                <Typography variant="h5">{stats.todayDeliveries}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography color="text.secondary">Avg Rating</Typography>
                <Typography variant="h5" color="warning.main">{stats.avgRating}</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Map & Routes */}
      {tab === 4 && (
        <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              📍 Map & Delivery Routes
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              View store locations, get directions, and plan your delivery routes
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <DaycareLocationMap showDirections={true} showSearch={true} />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Delivery Navigation Tips:</strong>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    <li>Use "Get Directions" for optimal routes to pickup/drop locations</li>
                    <li>Switch between driving and walking modes based on your delivery method</li>
                    <li>Search for specific customer addresses</li>
                    <li>Plan multi-stop routes efficiently</li>
                    <li>View real-time traffic to avoid delays</li>
                  </ul>
                </Typography>
              </Alert>
            </Grid>

            {activeDelivery && activeDelivery.status !== 'delivered' && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    🚴 Active Delivery Route
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Pickup:</strong> {activeDelivery.vendor?.businessName || 'Vendor'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        📍 {activeDelivery.vendor?.address || 'Address not available'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Drop:</strong> {activeDelivery.order?.customer?.name || 'Customer'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        📍 {activeDelivery.order?.shippingAddress?.street || 'Address not available'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Chip 
                        label={`Distance: ${activeDelivery.distance?.toFixed(1) || 0} km`} 
                        icon={<Place />} 
                        color="primary" 
                        sx={{ mr: 1 }}
                      />
                      <Chip 
                        label={`Amount: ₹${activeDelivery.agentShare || 0}`} 
                        icon={<MonetizationOn />} 
                        color="success"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}

      {/* Voice Assistant Button */}
      <Box sx={{ position: 'fixed', top: 24, right: 24, zIndex: 9999 }}>
        <Button variant="contained" color="success" onClick={handleVaOpen} sx={{ borderRadius: '50%', minWidth: 56, minHeight: 56, boxShadow: 3 }}>
          <span role="img" aria-label="mic">🎤</span>
        </Button>
        <Dialog open={vaOpen} onClose={handleVaClose} maxWidth="xs" fullWidth>
          <Box sx={{ p: 2, bgcolor: '#f6f8fa' }}>
            <VoiceAssistant />
          </Box>
        </Dialog>
      </Box>
    </Box>
  );
};

export default DeliveryDashboard;

