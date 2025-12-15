import React, { useMemo, useState } from 'react';
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
} from '@mui/material';
import {
  LocalShipping,
  DirectionsBike,
  CheckCircle,
  MonetizationOn,
  Schedule,
  Place,
  AccessTime,
  ErrorOutline,
  DoneAll,
} from '@mui/icons-material';

const fmtCurrency = (v) => `$${v.toFixed(2)}`;

const DeliveryDashboard = () => {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [orders, setOrders] = useState([
    {
      id: 'ORD-1234',
      items: 2,
      pickup: 'Baby Essentials',
      pickupAddr: '45 Commerce St',
      drop: 'Jane W.',
      dropAddr: '123 Oak Street',
      distanceKm: 2.5,
      pay: 8.5,
      status: 'available',
      eta: 'Today 2:30 PM',
    },
    {
      id: 'ORD-5678',
      items: 1,
      pickup: 'Pharmacy Hub',
      pickupAddr: '18 Main Ave',
      drop: 'Liam D.',
      dropAddr: '5 Park Lane',
      distanceKm: 3.2,
      pay: 9.75,
      status: 'available',
      eta: 'Today 3:10 PM',
    },
  ]);

  const [activeDelivery, setActiveDelivery] = useState({
    id: 'ORD-9012',
    items: 3,
    pickup: 'Grocery Mart',
    pickupAddr: '210 Market St',
    drop: 'Noah S.',
    dropAddr: '88 Maple Ave',
    distanceKm: 4.1,
    pay: 12.25,
    status: 'enroute',
    eta: 'Today 4:05 PM',
    onTimeRate: 97,
  });

  const [completed] = useState([
    { id: 'ORD-4455', pay: 7.5, rating: 4.9, date: '2025-12-05' },
    { id: 'ORD-3322', pay: 9.1, rating: 4.8, date: '2025-12-04' },
  ]);

  const stats = useMemo(() => ({
    todayDeliveries: 5,
    todayEarnings: 42.5,
    avgRating: 4.9,
    onTimeRate: 97,
    totalOrders: orders.length,
  }), [orders.length]);

  const handleAccept = (id) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setSuccess(`Order ${id} accepted.`);
  };

  const handleCompleteActive = () => {
    setSuccess('Delivery completed. Great job!');
    setActiveDelivery((prev) => ({ ...prev, status: 'delivered' }));
  };

  return (
    <Box sx={{ p: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Delivery Agent Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">Mike Rodriguez - Agent #DA-042</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip color="success" label="Online" icon={<DirectionsBike />} />
          <Button variant="outlined" startIcon={<ErrorOutline />} onClick={() => setError('Contact support: placeholder action')}>
            Report Issue
          </Button>
        </Stack>
      </Paper>

      {/* Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography color="text.secondary">Today's Deliveries</Typography>
            <Typography variant="h4">{stats.todayDeliveries}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography color="text.secondary">Today's Earnings</Typography>
            <Typography variant="h4" color="success.main">{fmtCurrency(stats.todayEarnings)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography color="text.secondary">Average Rating</Typography>
            <Typography variant="h4" color="warning.main">{stats.avgRating}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Typography color="text.secondary">On-Time Rate</Typography>
            <Typography variant="h4" color="primary.main">{stats.onTimeRate}%</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Available Orders (${orders.length})`} icon={<LocalShipping />} />
        <Tab label="Active Delivery" icon={<Schedule />} />
        <Tab label="Completed" icon={<DoneAll />} />
        <Tab label="Earnings" icon={<MonetizationOn />} />
      </Tabs>

      {/* Available Orders */}
      {tab === 0 && (
        <Stack spacing={2}>
          {orders.length === 0 && <Typography color="text.secondary">No available orders.</Typography>}
          {orders.map((o) => (
            <Paper key={o.id} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6">{o.id}</Typography>
                  <Chip size="small" label={`${o.items} items`} />
                </Stack>
                <Chip label={`$${o.pay}`} color="secondary" />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Pickup from: <strong>{o.pickup}</strong> — {o.pickupAddr}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Deliver to: <strong>{o.drop}</strong> — {o.dropAddr}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip icon={<Place />} label={`Distance: ${o.distanceKm} km`} />
                <Chip icon={<AccessTime />} label={`ETA: ${o.eta}`} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  fullWidth
                  variant="contained"
                  color="warning"
                  onClick={() => handleAccept(o.id)}
                >
                  Accept Order
                </Button>
                <Button fullWidth variant="outlined" color="inherit" onClick={() => setSuccess(`Viewing details for ${o.id} (placeholder)`)} >
                  View Details
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Active Delivery */}
      {tab === 1 && (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6">Active Delivery</Typography>
            <Chip color="success" label={activeDelivery.status === 'delivered' ? 'Completed' : 'In Progress'} />
          </Stack>
          <Typography variant="body1" fontWeight={600}>{activeDelivery.id} — {activeDelivery.items} items</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Pickup: {activeDelivery.pickup}, {activeDelivery.pickupAddr}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Drop: {activeDelivery.drop}, {activeDelivery.dropAddr}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip icon={<Place />} label={`${activeDelivery.distanceKm} km`} />
            <Chip icon={<AccessTime />} label={`ETA: ${activeDelivery.eta}`} />
            <Chip icon={<CheckCircle />} label={`On-Time: ${activeDelivery.onTimeRate}%`} />
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
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Completed Deliveries</Typography>
          <List>
            {completed.map((c) => (
              <React.Fragment key={c.id}>
                <ListItem
                  secondaryAction={<Chip label={fmtCurrency(c.pay)} color="secondary" />}
                >
                  <ListItemText
                    primary={`${c.id} • Rating: ${c.rating}`}
                    secondary={c.date}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Earnings */}
      {tab === 3 && (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
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
    </Box>
  );
};

export default DeliveryDashboard;

