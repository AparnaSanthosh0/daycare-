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
  ThumbUp,
  ReportProblem,
  Star,
} from '@mui/icons-material';

const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const NannyDashboard = () => {
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
    <Box sx={{ p: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Nanny Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">Emily Davis - Certified Childcare Provider</Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Star color="warning" />
            <Typography variant="h6" fontWeight={700}>4.8</Typography>
            <Typography variant="body2" color="text.secondary">(48 reviews)</Typography>
          </Stack>
          <Button variant="outlined" color="error" startIcon={<ReportProblem />} onClick={() => setError('Please contact admin: scheduling issue placeholder.')}>
            Report Issue
          </Button>
        </Stack>
      </Paper>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`New Requests${totalPending ? ` (${totalPending})` : ''}`} icon={<CheckCircle />} />
        <Tab label="My Schedule" icon={<Schedule />} />
        <Tab label="Active Service" icon={<AccessTime />} />
        <Tab label="Service History" icon={<Notes />} />
        <Tab label="Reviews" icon={<ThumbUp />} />
      </Tabs>

      {/* New Requests */}
      {tab === 0 && (
        <Stack spacing={2}>
          {requests.length === 0 && <Typography color="text.secondary">No requests right now.</Typography>}
          {requests.map((r) => (
            <Paper key={r.id} sx={{ p: 2, borderRadius: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography variant="h6">{r.parent}</Typography>
                  <Typography variant="body2" color="text.secondary">Child: {r.child} ({r.childAge})</Typography>
                  <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                    <Chip label={fmtDate(r.date)} />
                    <Chip label={r.time} />
                    <Chip label={`${r.hours} hours @ $${r.rate}/hr`} />
                    <Chip color="secondary" label={`$${r.hours * r.rate}`} />
                  </Stack>
                  {r.notes && <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">{r.notes}</Typography>}
                </Grid>
                <Grid item xs={12} md={4}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="secondary"
                      onClick={() => handleRequestAction(r.id, 'accepted')}
                      startIcon={<CheckCircle />}
                    >
                      Accept Booking
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="inherit"
                      onClick={() => handleRequestAction(r.id, 'declined')}
                      startIcon={<Cancel />}
                    >
                      Decline
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Stack>
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
              <Button variant="contained" color="secondary" startIcon={<Stop />} onClick={handleEndService}>
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
  );
};

export default NannyDashboard;

