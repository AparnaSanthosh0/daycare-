import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Stack,
  Chip,
  Button,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Rating,
  TextField,
  Alert,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import {
  Schedule,
  CheckCircle,
  Cancel,
  AccessTime,
  PlayArrow,
  Stop,
  Chat,
  Notes,
  Star,
  CalendarToday,
  Person,
  Description,
  Logout,
  Visibility,
  ShoppingCart,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const fmtDate = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const NannyDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requests, setRequests] = useState([
    {
      id: 'req1',
      parent: 'Jane Wilson',
      child: 'Emma',
      childAge: '3 yrs',
      date: '2025-12-10',
      time: '9:00 AM - 5:00 PM',
      hours: 8,
      rate: 15,
      status: 'pending',
      notes: 'Follow nap routine and no peanuts.',
    },
    {
      id: 'req2',
      parent: 'John Smith',
      child: 'Noah',
      childAge: '4 yrs',
      date: '2025-12-12',
      time: '10:00 AM - 2:00 PM',
      hours: 4,
      rate: 15,
      status: 'pending',
      notes: 'Prefers outdoor play and story time.',
    },
  ]);

  const [schedule] = useState([
    { id: 'sch1', parent: 'Maria Lopez', child: 'Ava', date: '2025-12-14', time: '8:00 AM - 1:00 PM', hours: 5 },
    { id: 'sch2', parent: 'David Lee', child: 'Mason', date: '2025-12-15', time: '12:00 PM - 6:00 PM', hours: 6 },
  ]);

  const [activeService, setActiveService] = useState({
    id: 'act1',
    parent: 'Emily Clark',
    child: 'Liam',
    date: '2025-12-08',
    time: '9:00 AM - 3:00 PM',
    started: false,
    startTime: null,
    endTime: null,
    notes: '',
  });

  const [history] = useState([
    { id: 'h1', parent: 'Sarah Green', child: 'Olivia', date: '2025-12-05', hours: 6, amount: 90, status: 'Completed' },
    { id: 'h2', parent: 'Michael Brown', child: 'Ethan', date: '2025-12-03', hours: 4, amount: 60, status: 'Completed' },
  ]);

  const [reviews] = useState([
    { id: 'r1', parent: 'Sarah Green', rating: 4.8, text: 'Great with routines and kept me updated.' },
    { id: 'r2', parent: 'Michael Brown', rating: 4.6, text: 'Kids loved the activities. Very punctual.' },
  ]);

  const totalPending = useMemo(() => requests.filter(r => r.status === 'pending').length, [requests]);

  const handleRequestAction = (id, status) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    setSuccess(`Request ${status === 'accepted' ? 'accepted' : 'declined'}.`);
  };

  const handleStartService = () => {
    setActiveService((prev) => ({ ...prev, started: true, startTime: new Date().toISOString() }));
    setSuccess('Service started. Time tracking in progress.');
  };

  const handleEndService = () => {
    setActiveService((prev) => ({ ...prev, endTime: new Date().toISOString() }));
    setSuccess('Service ended. Please confirm notes and submit.');
  };

  const handleSaveNotes = () => {
    setSuccess('Service notes saved for parents.');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {error && <Alert severity="error" sx={{ mb: 2, m: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, m: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0', px: 3, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                color: '#e91e63', 
                fontWeight: 'bold',
                mb: 0.5
              }}
            >
              Nanny Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.name || user?.firstName || 'Emily'} {user?.lastName || 'Davis'} - Certified Childcare Provider
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Star sx={{ color: '#ffc107', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={700}>4.8</Typography>
              <Typography variant="body2" color="text.secondary">(48 reviews)</Typography>
            </Stack>
            <IconButton 
              color="inherit" 
              sx={{ position: 'relative', color: 'text.secondary' }}
              onClick={() => navigate('/shop')}
            >
              <ShoppingCart />
              <Box sx={{ 
                position: 'absolute', 
                top: 5, 
                right: 5, 
                bgcolor: '#e91e63', 
                color: 'white', 
                borderRadius: '50%', 
                width: 18, 
                height: 18, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '0.7rem',
                fontWeight: 'bold'
              }}>
                3
              </Box>
            </IconButton>
            <Button 
              startIcon={<Logout />} 
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              sx={{ color: 'text.secondary', textTransform: 'none' }}
            >
              Logout
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0', px: 3 }}>
        <Tabs 
          value={tab} 
          onChange={(e, v) => setTab(v)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              color: 'text.secondary',
              minHeight: '64px',
              '&.Mui-selected': {
                color: '#e91e63'
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#e91e63',
              height: 3
            }
          }}
        >
          <Tab label="New Requests" icon={<CalendarToday />} iconPosition="start" />
          <Tab label="My Schedule" icon={<Schedule />} iconPosition="start" />
          <Tab label="Active Service" icon={<Person />} iconPosition="start" />
          <Tab label="Service History" icon={<Description />} iconPosition="start" />
          <Tab label="Reviews" icon={<Star />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Main Content */}
      <Box sx={{ p: 3 }}>

      {/* New Requests */}
      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              New Booking Requests
            </Typography>
            {totalPending > 0 && (
              <Chip 
                label={`${totalPending} Pending`}
                sx={{
                  bgcolor: '#e91e63',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  px: 1,
                  py: 2
                }}
              />
            )}
          </Box>
          
          {requests.length === 0 ? (
            <Typography color="text.secondary">No requests right now.</Typography>
          ) : (
            <Grid container spacing={3}>
              {requests.filter(r => r.status === 'pending').map((r) => (
                <Grid item xs={12} key={r.id}>
                  <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {r.parent}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Child: {r.child} ({r.childAge})
                          </Typography>
                          <Stack direction="row" spacing={2} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {fmtDate(r.date)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {r.time}
                              </Typography>
                            </Box>
                          </Stack>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {r.hours} hours @ ${r.rate}/hr
                            </Typography>
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                color: '#e91e63', 
                                fontWeight: 'bold',
                                ml: 'auto'
                              }}
                            >
                              ${r.hours * r.rate}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1}>
                            <Button
                              fullWidth
                              variant="contained"
                              sx={{
                                bgcolor: '#14B8A6',
                                color: 'white',
                                fontWeight: 'bold',
                                '&:hover': {
                                  bgcolor: '#0F766E'
                                }
                              }}
                              onClick={() => handleRequestAction(r.id, 'accepted')}
                              startIcon={<CheckCircle />}
                            >
                              Accept Booking
                            </Button>
                            <Button
                              fullWidth
                              variant="outlined"
                              sx={{
                                borderColor: '#14B8A6',
                                color: '#14B8A6',
                                bgcolor: '#f5f5f5',
                                '&:hover': {
                                  bgcolor: '#e8f5e9',
                                  borderColor: '#0F766E'
                                }
                              }}
                              onClick={() => handleRequestAction(r.id, 'declined')}
                              startIcon={<Cancel />}
                            >
                              Decline
                            </Button>
                            <Button
                              fullWidth
                              variant="outlined"
                              sx={{
                                borderColor: '#14B8A6',
                                color: '#14B8A6',
                                bgcolor: '#e8f5e9',
                                '&:hover': {
                                  bgcolor: '#c8e6c9',
                                  borderColor: '#0F766E'
                                }
                              }}
                              startIcon={<Visibility />}
                            >
                              View Details
                            </Button>
                          </Stack>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* My Schedule */}
      {tab === 1 && (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Upcoming Schedule</Typography>
          <List>
            {schedule.map((s) => (
              <React.Fragment key={s.id}>
                <ListItem
                  secondaryAction={<Chip label={`${s.hours} hrs`} color="primary" />}
                >
                  <ListItemText
                    primary={`${s.parent} — Child: ${s.child}`}
                    secondary={`${fmtDate(s.date)} • ${s.time}`}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Active Service */}
      {tab === 2 && (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Active Service</Typography>
          <Typography variant="body1" fontWeight={600}>{activeService.parent} — Child: {activeService.child}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {fmtDate(activeService.date)} • {activeService.time}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            {!activeService.started && (
              <Button variant="contained" startIcon={<PlayArrow />} onClick={handleStartService}>
                Start Service
              </Button>
            )}
            {activeService.started && !activeService.endTime && (
              <Button variant="contained" startIcon={<Stop />} onClick={handleEndService}>
                End Service
              </Button>
            )}
            <Button variant="outlined" startIcon={<Chat />} onClick={() => setSuccess('Message sent to admin (placeholder).')}>
              Contact Admin
            </Button>
          </Stack>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Service Notes & Child Activity Updates"
            placeholder="Add feeding, hygiene, play, basic education activities, incidents..."
            value={activeService.notes}
            onChange={(e) => setActiveService((p) => ({ ...p, notes: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <Button variant="outlined" startIcon={<Notes />} onClick={handleSaveNotes}>
            Upload / Save Notes
          </Button>
          {activeService.startTime && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Started at: {new Date(activeService.startTime).toLocaleTimeString()} {activeService.endTime ? `• Ended at: ${new Date(activeService.endTime).toLocaleTimeString()}` : ''}
            </Typography>
          )}
        </Paper>
      )}

      {/* Service History */}
      {tab === 3 && (
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Service History</Typography>
          <List>
            {history.map((h) => (
              <React.Fragment key={h.id}>
                <ListItem
                  secondaryAction={<Chip label={`$${h.amount}`} color="secondary" />}
                >
                  <ListItemText
                    primary={`${h.parent} — Child: ${h.child}`}
                    secondary={`${fmtDate(h.date)} • ${h.hours} hrs • ${h.status}`}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Reviews */}
      {tab === 4 && (
        <Stack spacing={2}>
          {reviews.map((r) => (
            <Paper key={r.id} sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle1" fontWeight={600}>{r.parent}</Typography>
                <Rating value={r.rating} precision={0.1} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">{r.rating.toFixed(1)}</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">{r.text}</Typography>
            </Paper>
          ))}
        </Stack>
      )}
      </Box>
    </Box>
  );
};

export default NannyDashboard;

