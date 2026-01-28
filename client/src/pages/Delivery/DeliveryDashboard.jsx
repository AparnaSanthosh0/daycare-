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
  Dialog,
  DialogTitle,
  DialogContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Link,
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
  KeyboardVoice,
  ExpandMore,
  Phone,
  Launch,
  Inventory2,
  Storefront,
  PersonPinCircle,
  Refresh,
} from '@mui/icons-material';
import { Avatar, IconButton, Tooltip } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';
import DaycareLocationMap from '../../components/Maps/DaycareLocationMap';
import VoiceAssistant from '../../VoiceAssistant';

const fmtINR = (v) => {
  const n = Number(v || 0);
  return `₹${n.toFixed(2)}`;
};

const humanStatus = (status) => {
  if (!status) return 'Unknown';
  return String(status).replace(/_/g, ' ');
};

const statusChipColor = (status) => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'assigned':
      return 'info';
    case 'accepted':
      return 'primary';
    case 'picked_up':
    case 'in_transit':
      return 'secondary';
    case 'delivered':
      return 'success';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
};

const mapLink = (address) => {
  if (!address) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

const formatAddress = (loc) => {
  if (!loc) return 'Address not available';
  if (typeof loc === 'string') return loc;

  const normalizeMaybeObjectLiteralString = (s) => {
    if (!s || typeof s !== 'string') return s;
    const trimmed = s.trim();
    // Handles strings like: "{ street: 'Kottayam', city: 'Kottayam', state: 'Kerala', zipCode: '' }"
    if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) return s;
    if (!trimmed.includes(':')) return s;

    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return '';

    const parts = inner
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const idx = p.indexOf(':');
        if (idx === -1) return '';
        let val = p.slice(idx + 1).trim();
        // Strip wrapping quotes (single/double/backtick)
        val = val.replace(/^['"`]/, '').replace(/['"`]$/, '');
        return val.trim();
      })
      .filter((v) => v && v.toLowerCase() !== 'undefined' && v.toLowerCase() !== 'null');

    return parts.join(', ');
  };

  const parts = [];
  const pushVal = (val) => {
    if (!val) return;
    if (typeof val === 'string') {
      const normalized = normalizeMaybeObjectLiteralString(val);
      if (normalized) parts.push(normalized);
    } else if (typeof val === 'object') {
      Object.values(val).forEach(pushVal);
    }
  };

  // Prioritize richer fields first
  pushVal(loc.fullAddress);
  pushVal(loc.address);
  pushVal(loc.street);
  pushVal(loc.city);
  pushVal(loc.state);
  pushVal(loc.zipCode);
  pushVal(loc.country);

  // De-duplicate while preserving order
  const unique = [];
  parts.forEach((p) => {
    if (!unique.includes(p)) unique.push(p);
  });

  return unique.length ? unique.join(', ') : 'Address not available';
};

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
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
      setLoading(true);
      console.log('🔍 Fetching available assignments...');
      console.log('🔧 API baseURL:', api.defaults.baseURL);
      console.log('👤 Current user ID:', user?.userId || user?._id);
      const response = await api.get('/delivery-assignments/available');
      console.log('✅ Response:', response.data);
      console.log('📦 Assignments received:', response.data.assignments?.length || 0);
      setOrders(response.data.assignments || []);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching available assignments:', err);
      console.error('❌ Error response:', err.response);
      setLoading(false);
      if (err.response?.status === 403) {
        setError('Access denied. Please login as a delivery agent.');
      } else {
        setError(err.response?.data?.message || 'Failed to load available assignments');
      }
    }
  }, [user]);

  // Fetch my active assignments
  const fetchMyAssignments = useCallback(async () => {
    try {
      const response = await api.get('/delivery-assignments/my-assignments');
      const assignments = response.data.assignments || [];

      console.log('📦 My assignments:', assignments.length, assignments.map(a => `${a._id}:${a.status}`).join(', '));

      // Find active delivery (prioritize picked_up/in_transit, then accepted/assigned)
      let active =
        assignments.find(a => a.status === 'picked_up' || a.status === 'in_transit') ||
        assignments.find(a => a.status === 'accepted' || a.status === 'assigned');

      // Fallback: if none found (e.g., backend not returning accepted by default), query explicitly for accepted
      if (!active) {
        try {
          const acceptedRes = await api.get('/delivery-assignments/my-assignments?status=accepted');
          const acceptedAssignments = acceptedRes.data.assignments || [];
          console.log('📦 Explicit accepted assignments:', acceptedAssignments.length);
          active =
            acceptedAssignments.find(a => a.status === 'picked_up' || a.status === 'in_transit') ||
            acceptedAssignments.find(a => a.status === 'accepted' || a.status === 'assigned') ||
            active;
        } catch (fallbackErr) {
          console.error('Fallback accepted fetch failed:', fallbackErr);
        }
      }

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

  // Load all data on mount (manual refresh button available instead of auto-interval)
  const loadData = useCallback(async () => {
    await Promise.all([
      fetchAvailableAssignments(),
      fetchMyAssignments(),
      fetchCompleted()
    ]);
  }, [fetchAvailableAssignments, fetchMyAssignments, fetchCompleted]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update stats when data changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleAccept = async (assignmentId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Session expired. Please login again to accept orders.');
        navigate('/login');
        return;
      }
      await api.put(`/delivery-assignments/${assignmentId}/accept`);
      setSuccess(`Assignment accepted successfully!`);
      await Promise.all([fetchAvailableAssignments(), fetchMyAssignments()]);
      setTab(1); // jump to Active Delivery tab after acceptance
    } catch (err) {
      console.error('Error accepting assignment:', err);
      setError(err.response?.data?.message || 'Failed to accept assignment');
      if (err.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleCompleteActive = async () => {
    if (!activeDelivery) return;
    try {
      // If the assignment is accepted but not yet picked up, mark it picked up first
      if (activeDelivery.status === 'accepted') {
        await api.put(`/delivery-assignments/${activeDelivery._id}/pickup`, {
          location: activeDelivery.pickupLocation?.coordinates || null,
        });
      }

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
          <Typography variant="body2" color="text.secondary">
            {user?.firstName} {user?.lastName} - Agent #{user?.staff?.agentId || user?._id?.slice(-6) || 'N/A'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip color="success" label="Online" icon={<DirectionsBike />} />
          <Button variant="outlined" startIcon={<ErrorOutline />} onClick={() => setError('Contact support: placeholder action')}>
            Report Issue
          </Button>
          {/* Voice Assistant */}
          <Tooltip title="Voice Assistant">
            <IconButton
              color="inherit"
              sx={{ color: 'text.secondary', p: 1 }}
              onClick={handleVaOpen}
              aria-label="Open voice assistant"
              size="large"
            >
              <KeyboardVoice fontSize="medium" />
            </IconButton>
          </Tooltip>
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
            <Typography variant="h4" sx={{ color: '#13b655' }}>{fmtINR(stats.todayEarnings)}</Typography>
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
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Chip label={`${ordersCount} Orders`} color="warning" variant="outlined" />
        </Stack>
      </Box>

      {/* Available Orders */}
      {tab === 0 && (
        <Stack spacing={2}>
          {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
          {!loading && orders.length === 0 && <Typography color="text.secondary">No available orders at the moment.</Typography>}
          {!loading && orders.map((assignment) => (
            <Accordion
              key={assignment._id}
              disableGutters
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 10px 24px rgba(0,0,0,0.05)',
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Grid container spacing={1.5} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Stack spacing={0.25}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle1" fontWeight={800}>
                          {assignment.orderNumber || assignment.order?.orderNumber || 'Order'}
                        </Typography>
                        <Chip
                          size="small"
                          label={humanStatus(assignment.status)}
                          color={statusChipColor(assignment.status)}
                          variant="outlined"
                        />
                        {assignment.assignmentType === 'auto' && (
                          <Chip size="small" label="Auto-assigned" color="success" />
                        )}
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip
                          size="small"
                          icon={<Inventory2 />}
                          label={`${assignment.items?.length || 0} items`}
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          icon={<Place />}
                          label={`${assignment.pickupLocation?.zone || 'Pickup'} → ${assignment.deliveryLocation?.zone || 'Drop'}`}
                          variant="outlined"
                        />
                      </Stack>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={5}>
                    <Stack spacing={0.25}>
                      <Typography variant="body2" color="text.secondary">
                        <Storefront sx={{ fontSize: 18, verticalAlign: 'text-bottom', mr: 0.75 }} />
                        {assignment.vendorName || assignment.vendor?.vendorName || 'Vendor'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        <PersonPinCircle sx={{ fontSize: 18, verticalAlign: 'text-bottom', mr: 0.75 }} />
                        {assignment.deliveryLocation?.contactPerson || assignment.customerName || assignment.customer?.firstName || 'Customer'}
                      </Typography>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} alignItems="center">
                      <Chip
                        label={fmtINR(assignment.agentShare)}
                        sx={{ backgroundColor: '#f3fff8', color: '#13b655', fontWeight: 800 }}
                      />
                      <Chip
                        size="small"
                        label={`Fee ${fmtINR(assignment.deliveryFee)}`}
                        color="info"
                        variant="outlined"
                      />
                    </Stack>
                  </Grid>
                </Grid>
              </AccordionSummary>

              <AccordionDetails sx={{ bgcolor: '#fff' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Storefront sx={{ color: 'text.secondary' }} />
                          <Typography fontWeight={800}>Pickup</Typography>
                        </Stack>
                        {assignment.pickupLocation?.contactPhone && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Phone />}
                            component={Link}
                            href={`tel:${assignment.pickupLocation.contactPhone}`}
                            underline="none"
                          >
                            Call
                          </Button>
                        )}
                      </Stack>

                      <Typography variant="body2" fontWeight={700} sx={{ mb: 0.25 }}>
                        {assignment.vendorName || assignment.vendor?.vendorName || 'Vendor'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {formatAddress(assignment.pickupLocation)}
                      </Typography>

                      {formatAddress(assignment.pickupLocation) && formatAddress(assignment.pickupLocation) !== 'Address not available' && (
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<Launch />}
                          component={Link}
                          href={mapLink(formatAddress(assignment.pickupLocation))}
                          target="_blank"
                          rel="noreferrer"
                          underline="none"
                        >
                          Open in Maps
                        </Button>
                      )}
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PersonPinCircle sx={{ color: 'text.secondary' }} />
                          <Typography fontWeight={800}>Drop</Typography>
                        </Stack>
                        {(assignment.deliveryLocation?.phone || assignment.customer?.phone) && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Phone />}
                            component={Link}
                            href={`tel:${assignment.deliveryLocation?.phone || assignment.customer?.phone}`}
                            underline="none"
                          >
                            Call
                          </Button>
                        )}
                      </Stack>

                      <Typography variant="body2" fontWeight={700} sx={{ mb: 0.25 }}>
                        {assignment.deliveryLocation?.contactPerson ||
                          assignment.customerName ||
                          assignment.customer?.firstName ||
                          'Customer'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {formatAddress(assignment.deliveryLocation)}
                      </Typography>

                      {formatAddress(assignment.deliveryLocation) && formatAddress(assignment.deliveryLocation) !== 'Address not available' && (
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<Launch />}
                          component={Link}
                          href={mapLink(formatAddress(assignment.deliveryLocation))}
                          target="_blank"
                          rel="noreferrer"
                          underline="none"
                        >
                          Open in Maps
                        </Button>
                      )}
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Inventory2 sx={{ color: 'text.secondary' }} />
                          <Typography fontWeight={800}>Products</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {assignment.items?.length || 0} items
                        </Typography>
                      </Stack>

                      {assignment.items?.length ? (
                        <Table size="small" aria-label="Products to deliver">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 800 }}>Item</TableCell>
                              <TableCell sx={{ fontWeight: 800 }} align="right">Qty</TableCell>
                              <TableCell sx={{ fontWeight: 800 }} align="right">Price</TableCell>
                              <TableCell sx={{ fontWeight: 800 }} align="right">Total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {assignment.items.map((item, idx) => {
                              const qty = Number(item.quantity || 1);
                              const price = Number(item.price || 0);
                              return (
                                <TableRow key={`${assignment._id}-item-${idx}`}>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={700}>
                                      {item.name || item.product?.name || `Item ${idx + 1}`}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">{qty}</TableCell>
                                  <TableCell align="right">{fmtINR(price)}</TableCell>
                                  <TableCell align="right">{fmtINR(price * qty)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Product details not available for this assignment.
                        </Typography>
                      )}
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 0.5 }} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
                      <Button
                        variant="contained"
                        onClick={() => {
                          if (assignment.status === 'accepted' || assignment.status === 'picked_up' || assignment.status === 'in_transit') {
                            setTab(1);
                            return;
                          }
                          handleAccept(assignment._id);
                        }}
                        disabled={!['pending', 'assigned', 'accepted', 'picked_up', 'in_transit'].includes(assignment.status)}
                        sx={{
                          fontWeight: 800,
                          backgroundColor: '#14B8A6',
                          '&:hover': { backgroundColor: '#0d9488' },
                        }}
                      >
                        {assignment.status === 'accepted' || assignment.status === 'picked_up' || assignment.status === 'in_transit'
                          ? 'Go to Active Delivery'
                          : (assignment.assignmentType === 'auto' ? 'Accept Auto-Assigned Order' : 'Accept Order')}
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
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
            Pickup: {activeDelivery.vendor?.businessName || 'Vendor'}, {formatAddress(activeDelivery.vendor?.warehouseLocation || activeDelivery.pickupLocation || activeDelivery.vendor?.address)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Drop: {activeDelivery.order?.customer?.name || activeDelivery.customerName || 'Customer'}, {formatAddress(activeDelivery.deliveryLocation || activeDelivery.order?.shippingAddress)}
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
                <Typography variant="h5">{fmtINR(stats.todayEarnings)}</Typography>
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
                        📍 {formatAddress(activeDelivery.vendor?.warehouseLocation || activeDelivery.pickupLocation || activeDelivery.vendor?.address)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Drop:</strong> {activeDelivery.order?.customer?.name || 'Customer'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        📍 {formatAddress(activeDelivery.deliveryLocation || activeDelivery.order?.shippingAddress)}
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
                        label={`Amount: ${fmtINR(activeDelivery.agentShare || 0)}`} 
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

      {/* Voice Assistant Dialog */}
      <Dialog open={vaOpen} onClose={handleVaClose} maxWidth="xs" fullWidth>
        <DialogTitle>Voice Assistant</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, bgcolor: '#f6f8fa' }}>
            <VoiceAssistant />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default DeliveryDashboard;

