import React, { useMemo, useRef, useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Schedule,
  CheckCircle,
  Cancel,
  PlayArrow,
  Stop,
  Notes,
  Star,
  CalendarToday,
  Person,
  Description,
  Logout,
  Visibility,
  ShoppingCart,
  KeyboardVoice
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../config/api';
import VoiceAssistant from '../../VoiceAssistant';

const fmtDate = (d) => {
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const NannyDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const themeColor = '#1abc9c';
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requests, setRequests] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [history, setHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [noteDialog, setNoteDialog] = useState(false);
  const [activityDialog, setActivityDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [serviceNote, setServiceNote] = useState('');
  const [activityUpdate, setActivityUpdate] = useState('');
  const [summaryDialog, setSummaryDialog] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [dictatingField, setDictatingField] = useState(null); // 'note' | 'activity'
  const [routineSuggestions, setRoutineSuggestions] = useState(null);
  const [routineLoading, setRoutineLoading] = useState(false);
  const [routineReminders, setRoutineReminders] = useState([]);
  const [vaOpen, setVaOpen] = useState(false);

  const recognitionRef = useRef(null);
  const isDictatingRef = useRef(false);

  const NOTE_TEMPLATES = [
    'Meals: Ate well.',
    'Meals: Refused food.',
    'Sleep: Slept peacefully.',
    'Sleep: Difficulty sleeping.',
    'Hygiene: Bath completed.',
    'Hygiene: Diaper change done.',
    'Medication: Given as per instruction.',
    'Safety: No issues observed.'
  ];

  const ACTIVITY_TEMPLATES = [
    'Play: Indoor play (blocks/puzzles).',
    'Play: Outdoor play.',
    'Learning: Reading/story time.',
    'Learning: Writing/drawing activity.',
    'Motor skills: Fine motor practice.',
    'Motor skills: Physical activity.'
  ];

  useEffect(() => {
    fetchPendingRequests();
    fetchSchedule();
    fetchHistory();
    fetchPayments();
    fetchRoutineSuggestions();
  }, []);

  // Update reminder countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setRoutineReminders(prev => {
        const now = Date.now();
        return prev.map(r => {
          if (r.fired) return r;
          if (now >= r.dueAt) {
            // Fire the reminder
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Reminder: ${r.label}`, {
                body: `Time for ${r.label.toLowerCase()}!`,
                icon: '/favicon.ico',
                tag: r.id
              });
            }
            setSuccess(`⏰ Reminder: ${r.label}!`);
            return { ...r, fired: true };
          }
          return r;
        });
      });
    }, 1000); // Update every second for smooth countdown

    return () => clearInterval(interval);
  }, []);

  const fetchRoutineSuggestions = async (bookingId = null) => {
    try {
      setRoutineLoading(true);
      let url = '/nanny/bookings/nanny/routine-suggestions?days=30&limit=80';
      if (bookingId) {
        url += `&currentBookingId=${bookingId}`;
      }
      const res = await api.get(url);
      setRoutineSuggestions(res.data || null);
    } catch (e) {
      console.error('Error fetching routine suggestions:', e);
      setRoutineSuggestions(null);
    } finally {
      setRoutineLoading(false);
    }
  };

  const fmtTimeFromMinutes = (mins) => {
    if (mins === null || mins === undefined) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hh = String(((h + 11) % 12) + 1).padStart(1, '0');
    const mm = String(m).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${hh}:${mm} ${ampm}`;
  };

  const addReminder = (label, minutesFromNow) => {
    const dueAt = Date.now() + Math.max(1, minutesFromNow) * 60 * 1000;
    const id = `${label}-${Date.now()}`;
    const reminder = { id, label, dueAt, createdAt: Date.now(), fired: false };
    
    setRoutineReminders((prev) => [...prev, reminder]);
    setSuccess(`✅ Reminder set: ${label} in ${minutesFromNow} minute${minutesFromNow !== 1 ? 's' : ''}`);
    
    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const startDictation = (field) => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError('Speech recognition is not supported in this browser. Please use Chrome.');
        return;
      }

      if (isDictatingRef.current && recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const rec = new SpeechRecognition();
      recognitionRef.current = rec;
      isDictatingRef.current = true;
      setDictatingField(field);

      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        const transcript = Array.from(event.results).map(r => r[0]?.transcript || '').join(' ').trim();
        if (!transcript) return;
        if (field === 'note') {
          setServiceNote(prev => (prev ? `${prev}\n${transcript}` : transcript));
        } else if (field === 'activity') {
          setActivityUpdate(prev => (prev ? `${prev}\n${transcript}` : transcript));
        }
      };

      rec.onerror = (e) => {
        console.error('Dictation error:', e);
        setError('Voice input failed. Please try again.');
      };

      rec.onend = () => {
        isDictatingRef.current = false;
        setDictatingField(null);
      };

      rec.start();
    } catch (e) {
      console.error('Failed to start dictation:', e);
      setError('Failed to start voice input.');
      isDictatingRef.current = false;
      setDictatingField(null);
    }
  };

  const stopDictation = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } finally {
      isDictatingRef.current = false;
      setDictatingField(null);
    }
  };

  const bucketLine = (line) => {
    const t = (line || '').toLowerCase();
    if (t.includes('meal') || t.includes('ate') || t.includes('food') || t.includes('milk') || t.includes('snack')) return 'meals';
    if (t.includes('sleep') || t.includes('nap')) return 'sleep';
    if (t.includes('bath') || t.includes('hygiene') || t.includes('diaper') || t.includes('toilet')) return 'hygiene';
    if (t.includes('medicine') || t.includes('medication') || t.includes('tablet') || t.includes('syrup')) return 'medication';
    if (t.includes('read') || t.includes('homework') || t.includes('learn') || t.includes('study') || t.includes('story')) return 'learning';
    if (t.includes('play') || t.includes('game') || t.includes('toy') || t.includes('outdoor') || t.includes('park')) return 'play';
    if (t.includes('safe') || t.includes('injury') || t.includes('hurt') || t.includes('emergency') || t.includes('first aid')) return 'safety';
    return 'other';
  };

  const generateSummaryFromBooking = (booking) => {
    const notes = (booking?.serviceNotes || []).map(n => n.note).filter(Boolean);
    const activities = (booking?.activityUpdates || []).map(a => a.activity).filter(Boolean);
    const lines = [...notes, ...activities].flatMap(t => t.split('\n')).map(s => s.trim()).filter(Boolean);

    const categories = {
      meals: [],
      sleep: [],
      hygiene: [],
      medication: [],
      learning: [],
      play: [],
      safety: [],
      other: []
    };

    for (const line of lines) {
      const k = bucketLine(line);
      categories[k].push(line);
    }

    const highlights = [];
    if (categories.meals[0]) highlights.push(categories.meals[0]);
    if (categories.sleep[0]) highlights.push(categories.sleep[0]);
    if (categories.play[0]) highlights.push(categories.play[0]);
    if (categories.learning[0]) highlights.push(categories.learning[0]);
    if (categories.safety[0]) highlights.push(categories.safety[0]);

    const parts = [];
    parts.push(`Child: ${booking?.child?.name || 'N/A'}`);
    parts.push(`Date: ${booking?.serviceDate ? fmtDate(booking.serviceDate) : 'N/A'} (${booking?.startTime || ''} - ${booking?.endTime || ''})`);
    if (booking?.status) parts.push(`Status: ${booking.status}`);
    parts.push('');
    parts.push('Summary:');
    parts.push(highlights.length ? `- ${highlights.join('\n- ')}` : '- No highlights recorded yet.');

    const summaryText = parts.join('\n');
    return {
      title: 'Daily Summary',
      summaryText,
      highlights,
      categories
    };
  };

  const openSummary = async (bookingId) => {
    try {
      setSummaryLoading(true);
      const booking = schedule.find(b => b._id === bookingId) || null;
      if (!booking) {
        setError('Booking not found in schedule.');
        return;
      }
      const summary = generateSummaryFromBooking(booking);
      setGeneratedSummary({ bookingId, ...summary });
      setSummaryDialog(true);
    } catch (e) {
      console.error(e);
      setError('Failed to generate summary.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const saveSummary = async () => {
    try {
      if (!generatedSummary?.bookingId || !generatedSummary?.summaryText) return;
      setSummaryLoading(true);
      await api.post(`/nanny/bookings/${generatedSummary.bookingId}/summary`, {
        title: generatedSummary.title,
        summaryText: generatedSummary.summaryText,
        highlights: generatedSummary.highlights,
        categories: generatedSummary.categories
      });
      setSuccess('Summary saved and shared to the booking.');
      setSummaryDialog(false);
      setGeneratedSummary(null);
      await Promise.all([fetchSchedule(), fetchHistory()]);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || 'Failed to save summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await api.get('/nanny/payments/nanny/history');
      setPayments(response.data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await api.get('/nanny/bookings/nanny/pending');
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchSchedule = async () => {
    try {
      // Fetch all bookings (accepted and in-progress) for the nanny
      const response = await api.get('/nanny/bookings/nanny');
      // Filter to only show accepted and in-progress bookings
      const filtered = (response.data || []).filter(b => 
        b.status === 'accepted' || b.status === 'in-progress'
      );
      setSchedule(filtered);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setSchedule([]);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get('/nanny/bookings/nanny?status=completed');
      setHistory(response.data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const totalPending = useMemo(() => requests.length, [requests]);

  const handleRequestAction = async (id, status) => {
    try {
      const endpoint = status === 'accepted' ? 'accept' : 'reject';
      await api.put(`/nanny/bookings/${id}/${endpoint}`);
      setSuccess(`Request ${status === 'accepted' ? 'accepted' : 'rejected'}.`);
      fetchPendingRequests();
      fetchSchedule();
    } catch (error) {
      setError('Failed to update request');
      console.error(error);
    }
  };

  const handleStartService = async (bookingId) => {
    try {
      await api.put(`/nanny/bookings/${bookingId}/start`);
      setSuccess('Service started. Time tracking in progress.');
      // Refresh all data to show the updated booking
      await Promise.all([
        fetchSchedule(),
        fetchPendingRequests()
      ]);
      // Switch to Active Service tab to show the started service
      setTab(2);
    } catch (error) {
      setError('Failed to start service');
      console.error(error);
    }
  };

  const handleEndService = async (bookingId) => {
    try {
      await api.put(`/nanny/bookings/${bookingId}/end`);
      setSuccess('Service ended successfully.');
      fetchSchedule();
      fetchHistory();
    } catch (error) {
      setError('Failed to end service');
      console.error(error);
    }
  };

  const handleSaveNote = async () => {
    try {
      await api.post(`/nanny/bookings/${selectedBooking}/notes`, { note: serviceNote });
      setSuccess('Service note saved for parents.');
      setNoteDialog(false);
      setServiceNote('');
      fetchSchedule();
    } catch (error) {
      setError('Failed to save note');
      console.error(error);
    }
  };

  const handleSaveActivity = async () => {
    try {
      await api.post(`/nanny/bookings/${selectedBooking}/activity`, { activity: activityUpdate });
      setSuccess('Activity update added.');
      setActivityDialog(false);
      setActivityUpdate('');
      fetchSchedule();
    } catch (error) {
      setError('Failed to save activity');
      console.error(error);
    }
  };

  const handleVaOpen = () => setVaOpen(true);
  const handleVaClose = () => setVaOpen(false);

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
                color: themeColor, 
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
              sx={{ position: 'relative', color: 'text.secondary', p: 1 }}
              onClick={handleVaOpen}
              aria-label="Open voice assistant"
            >
              <KeyboardVoice sx={{ color: themeColor }} />
            </IconButton>
            <IconButton 
              color="inherit" 
              sx={{ position: 'relative', color: 'text.secondary', p: 1 }}
              onClick={() => navigate('/shop')}
              aria-label="Shop"
            >
              <ShoppingCart />
              <Box sx={{ 
                position: 'absolute', 
                top: 5, 
                right: 5, 
                bgcolor: themeColor, 
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
                color: themeColor
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: themeColor,
              height: 3
            }
          }}
        >
          <Tab label="New Requests" icon={<CalendarToday />} iconPosition="start" />
          <Tab label="My Schedule" icon={<Schedule />} iconPosition="start" />
          <Tab label="Active Service" icon={<Person />} iconPosition="start" />
          <Tab label="Service History" icon={<Description />} iconPosition="start" />
          <Tab label="Payment History" icon={<Star />} iconPosition="start" />
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
                  bgcolor: themeColor,
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
              {requests.map((r) => (
                <Grid item xs={12} key={r._id}>
                  <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                          <Stack spacing={1}>
                            <Typography variant="h6" fontWeight={700}>
                              {r.parentName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Child:</strong> {r.child.name} ({r.child.age} yrs)
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Date:</strong> {fmtDate(r.serviceDate)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Time:</strong> {r.startTime} - {r.endTime}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Hours:</strong> {r.hours} hrs | <strong>Rate:</strong> ${r.hourlyRate}/hr | <strong>Total:</strong> ${r.totalAmount}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Service Address:</strong> {r.parentAddress || (r.parent?.address ? 
                                (typeof r.parent.address === 'string' ? r.parent.address :
                                  `${r.parent.address.street || ''}, ${r.parent.address.city || ''}, ${r.parent.address.state || ''} ${r.parent.address.zipCode || ''}`.trim())
                                : 'Not provided')}
                            </Typography>
                            {r.child.allergies && (
                              <Alert severity="warning" sx={{ mt: 1 }}>
                                <strong>Allergy:</strong> {r.child.allergies}
                              </Alert>
                            )}
                            {r.parentInstructions && (
                              <Typography variant="body2" color="text.secondary">
                                <strong>Notes:</strong> {r.parentInstructions}
                              </Typography>
                            )}
                          </Stack>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Stack spacing={2}>
                            <Button
                              variant="contained"
                              fullWidth
                              sx={{ bgcolor: themeColor, '&:hover': { bgcolor: '#169b83' } }}
                              startIcon={<CheckCircle />}
                              onClick={() => handleRequestAction(r._id, 'accepted')}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="outlined"
                              fullWidth
                              color="error"
                              startIcon={<Cancel />}
                              onClick={() => handleRequestAction(r._id, 'rejected')}
                            >
                              Decline
                            </Button>
                            <Button
                              variant="text"
                              fullWidth
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
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
            My Schedule
          </Typography>
          {schedule.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'white' }}>
              <Typography color="text.secondary" variant="h6">
                No scheduled bookings.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {schedule.map((s) => (
                <Grid item xs={12} md={6} key={s._id}>
                  <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                        <Typography variant="h6" fontWeight={700}>
                          {s.parentName}
                        </Typography>
                        <Chip
                          label={s.status === 'accepted' ? 'Confirmed' : 'In Progress'}
                          color={s.status === 'accepted' ? 'success' : 'info'}
                          size="small"
                        />
                      </Box>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={1}>
                        <Typography variant="body2"><strong>Child:</strong> {s.child.name}</Typography>
                        <Typography variant="body2"><strong>Date:</strong> {fmtDate(s.serviceDate)}</Typography>
                        <Typography variant="body2"><strong>Time:</strong> {s.startTime} - {s.endTime}</Typography>
                        <Typography variant="body2"><strong>Hours:</strong> {s.hours} hrs</Typography>
                        <Typography variant="body2"><strong>Amount:</strong> ${s.totalAmount}</Typography>
                        <Typography variant="body2"><strong>Service Address:</strong> {s.parentAddress || (s.parent?.address ? 
                          (typeof s.parent.address === 'string' ? s.parent.address :
                            `${s.parent.address.street || ''}, ${s.parent.address.city || ''}, ${s.parent.address.state || ''} ${s.parent.address.zipCode || ''}`.trim())
                          : 'Not provided')}</Typography>
                      </Stack>
                      {s.status === 'accepted' && (
                        <Button
                          variant="contained"
                          fullWidth
                          sx={{ mt: 2, bgcolor: themeColor, '&:hover': { bgcolor: '#169b83' } }}
                          startIcon={<PlayArrow />}
                          onClick={() => handleStartService(s._id)}
                        >
                          Start Service
                        </Button>
                      )}
                      {s.status === 'in-progress' && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          Service in progress - Go to "Active Service" tab to manage
                        </Alert>
                      )}
                      <Button
                        variant="outlined"
                        fullWidth
                        sx={{ mt: 2 }}
                        startIcon={<Notes />}
                        onClick={() => {
                          setSelectedBooking(s._id);
                          setNoteDialog(true);
                        }}
                      >
                        Add Service Note
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Active Service */}
      {tab === 2 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
            Active Service
          </Typography>
          {schedule.filter(s => s.status === 'in-progress').length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'white' }}>
              <Typography color="text.secondary" variant="h6" gutterBottom>
                No active service at the moment.
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Start a service from "My Schedule" tab to begin tracking time.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {schedule.filter(s => s.status === 'in-progress').map((s) => (
                <Grid item xs={12} key={s._id}>
                  <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        {s.parentName} — Child: {s.child.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {fmtDate(s.serviceDate)} • {s.startTime} - {s.endTime}
                      </Typography>
                      {s.actualStartTime && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Started at: {new Date(s.actualStartTime).toLocaleTimeString()}
                        </Alert>
                      )}
                      {/* Routine Assistant */}
                      <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#f6fffd', border: `1px solid ${themeColor}33` }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight={700} sx={{ color: themeColor }}>
                            AI Task Reminder & Routine Assistant
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => fetchRoutineSuggestions(s._id)}
                            sx={{ textTransform: 'none' }}
                          >
                            Refresh
                          </Button>
                        </Box>
                        {routineLoading ? (
                          <Typography variant="body2" color="text.secondary">Loading routine suggestions…</Typography>
                        ) : (
                          <>
                            {routineSuggestions?.hasHistoricalData ? (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                ✅ Suggestions based on your recent logs ({routineSuggestions.bookingsUsed} bookings analyzed).
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                💡 Showing smart defaults. Add notes with "Meals:", "Sleep:", or "Learning:" to improve suggestions.
                              </Typography>
                            )}
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
                              <Paper sx={{ p: 1.5, flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary">Feeding time</Typography>
                                  {routineSuggestions?.feeding?.isFromData && (
                                    <Chip label="AI" size="small" sx={{ height: 16, fontSize: '0.65rem', bgcolor: themeColor, color: 'white' }} />
                                  )}
                                </Box>
                                <Typography variant="body1" fontWeight={700}>
                                  {routineSuggestions?.feeding ? fmtTimeFromMinutes(routineSuggestions.feeding.typicalMinutes) : '9:00 AM'}
                                </Typography>
                                {routineSuggestions?.feeding?.samples > 0 && (
                                  <Typography variant="caption" color="text.secondary">
                                    Based on {routineSuggestions.feeding.samples} logs
                                  </Typography>
                                )}
                                <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    sx={{ flex: 1, bgcolor: themeColor, '&:hover': { bgcolor: '#169b83' }, textTransform: 'none' }}
                                    onClick={() => addReminder('Feeding time', 30)}
                                  >
                                    Remind in 30 min
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    sx={{ textTransform: 'none' }}
                                    onClick={() => addReminder('Feeding time', 1)}
                                    title="Test reminder (1 minute)"
                                  >
                                    Test
                                  </Button>
                                </Stack>
                              </Paper>
                              <Paper sx={{ p: 1.5, flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary">Nap time</Typography>
                                  {routineSuggestions?.nap?.isFromData && (
                                    <Chip label="AI" size="small" sx={{ height: 16, fontSize: '0.65rem', bgcolor: themeColor, color: 'white' }} />
                                  )}
                                </Box>
                                <Typography variant="body1" fontWeight={700}>
                                  {routineSuggestions?.nap ? fmtTimeFromMinutes(routineSuggestions.nap.typicalMinutes) : '1:00 PM'}
                                </Typography>
                                {routineSuggestions?.nap?.samples > 0 && (
                                  <Typography variant="caption" color="text.secondary">
                                    Based on {routineSuggestions.nap.samples} logs
                                  </Typography>
                                )}
                                <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    sx={{ flex: 1, bgcolor: themeColor, '&:hover': { bgcolor: '#169b83' }, textTransform: 'none' }}
                                    onClick={() => addReminder('Nap time', 45)}
                                  >
                                    Remind in 45 min
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    sx={{ textTransform: 'none' }}
                                    onClick={() => addReminder('Nap time', 1)}
                                    title="Test reminder (1 minute)"
                                  >
                                    Test
                                  </Button>
                                </Stack>
                              </Paper>
                              <Paper sx={{ p: 1.5, flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary">Homework time</Typography>
                                  {routineSuggestions?.homework?.isFromData && (
                                    <Chip label="AI" size="small" sx={{ height: 16, fontSize: '0.65rem', bgcolor: themeColor, color: 'white' }} />
                                  )}
                                </Box>
                                <Typography variant="body1" fontWeight={700}>
                                  {routineSuggestions?.homework ? fmtTimeFromMinutes(routineSuggestions.homework.typicalMinutes) : '4:00 PM'}
                                </Typography>
                                {routineSuggestions?.homework?.samples > 0 && (
                                  <Typography variant="caption" color="text.secondary">
                                    Based on {routineSuggestions.homework.samples} logs
                                  </Typography>
                                )}
                                <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    sx={{ flex: 1, bgcolor: themeColor, '&:hover': { bgcolor: '#169b83' }, textTransform: 'none' }}
                                    onClick={() => addReminder('Homework time', 60)}
                                  >
                                    Remind in 60 min
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    sx={{ textTransform: 'none' }}
                                    onClick={() => addReminder('Homework time', 1)}
                                    title="Test reminder (1 minute)"
                                  >
                                    Test
                                  </Button>
                                </Stack>
                              </Paper>
                            </Stack>

                            {routineReminders.length > 0 && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                  Active Reminders:
                                </Typography>
                                {routineReminders.map((r) => {
                                  const minutesLeft = Math.max(0, Math.round((r.dueAt - Date.now()) / 60000));
                                  return (
                                    <Alert 
                                      key={r.id} 
                                      severity={r.fired ? 'warning' : 'info'} 
                                      sx={{ mt: 1 }}
                                      action={
                                        <Button
                                          size="small"
                                          onClick={() => {
                                            setRoutineReminders(prev => prev.filter(rem => rem.id !== r.id));
                                          }}
                                        >
                                          Dismiss
                                        </Button>
                                      }
                                    >
                                      {r.fired ? (
                                        <>⏰ <strong>{r.label}</strong> - Time's up!</>
                                      ) : (
                                        <>⏳ <strong>{r.label}</strong> in {minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}</>
                                      )}
                                    </Alert>
                                  );
                                })}
                              </Box>
                            )}
                          </>
                        )}
                      </Paper>

                      <Alert severity="success" sx={{ mb: 2 }}>
                        Tip: Add notes/activities during the service, then generate an AI summary for the parent.
                      </Alert>
                      <Stack spacing={2}>
                        <Button
                          variant="contained"
                          fullWidth
                          color="error"
                          startIcon={<Stop />}
                          onClick={() => handleEndService(s._id)}
                        >
                          End Service
                        </Button>
                        <Button
                          variant="contained"
                          fullWidth
                          sx={{ bgcolor: themeColor, '&:hover': { bgcolor: '#169b83' } }}
                          startIcon={<Description />}
                          disabled={summaryLoading}
                          onClick={() => openSummary(s._id)}
                        >
                          {summaryLoading ? 'Generating Summary...' : 'Generate AI Summary'}
                        </Button>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<Notes />}
                          onClick={() => {
                            setSelectedBooking(s._id);
                            setNoteDialog(true);
                          }}
                        >
                          Add Service Note
                        </Button>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<Description />}
                          onClick={() => {
                            setSelectedBooking(s._id);
                            setActivityDialog(true);
                          }}
                        >
                          Add Activity Update
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Service History */}
      {tab === 3 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
            Service History
          </Typography>
          {history.length === 0 ? (
            <Typography color="text.secondary">No completed services yet.</Typography>
          ) : (
            <List>
              {history.map((h) => (
                <React.Fragment key={h._id}>
                  <ListItem
                    sx={{ bgcolor: 'white', borderRadius: 1, mb: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                    secondaryAction={
                      <Stack alignItems="flex-end">
                        <Chip label={`$${h.totalAmount}`} color="success" />
                        <Typography variant="caption" color="text.secondary">
                          {h.actualHours || h.hours} hrs
                        </Typography>
                      </Stack>
                    }
                  >
                    <ListItemText
                      primary={`${h.parentName} — Child: {h.child.name}`}
                      secondary={`${fmtDate(h.serviceDate)} • Completed`}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      )}

      {/* Payment History */}
      {tab === 4 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
            Payment History
          </Typography>
          {payments.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'white' }}>
              <Typography color="text.secondary" variant="h6">
                No payments yet.
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Your completed services will appear here once payments are processed.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {payments.map((payment) => (
                <Grid item xs={12} md={6} key={payment._id}>
                  <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                        <Typography variant="h6" fontWeight={700}>
                          {payment.parent?.firstName} {payment.parent?.lastName}
                        </Typography>
                        <Chip
                          label={
                            payment.status === 'paid' ? 'Paid' :
                            payment.status === 'admin_approved' ? 'Approved' :
                            payment.status === 'parent_confirmed' ? 'Pending Approval' :
                            payment.status
                          }
                          color={
                            payment.status === 'paid' ? 'success' :
                            payment.status === 'admin_approved' ? 'info' :
                            payment.status === 'parent_confirmed' ? 'warning' :
                            'default'
                          }
                          size="small"
                        />
                      </Box>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={1}>
                        <Typography variant="body2">
                          <strong>Child:</strong> {payment.booking?.child?.name || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Service Date:</strong> {payment.booking?.serviceDate ? fmtDate(payment.booking.serviceDate) : 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Hours:</strong> {payment.booking?.hours || 0} hrs
                        </Typography>
                        <Divider />
                        <Typography variant="h6" color="success.main">
                          <strong>Total Amount:</strong> ${payment.totalAmount}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Platform Commission:</strong> ${payment.commissionAmount} ({payment.commissionRate}%)
                        </Typography>
                        <Typography variant="h6" color="primary.main">
                          <strong>Your Payout:</strong> ${payment.payoutAmount}
                        </Typography>
                        {payment.paidAt && (
                          <Typography variant="caption" color="text.secondary">
                            Paid on: {new Date(payment.paidAt).toLocaleDateString()}
                          </Typography>
                        )}
                        {payment.payoutTransactionId && (
                          <Typography variant="caption" color="text.secondary">
                            Transaction ID: {payment.payoutTransactionId}
                          </Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Reviews */}
      {tab === 5 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
            Reviews & Ratings
          </Typography>
          {history.filter(h => h.rating).length === 0 ? (
            <Typography color="text.secondary">No reviews yet.</Typography>
          ) : (
            <Stack spacing={2}>
              {history.filter(h => h.rating).map((h) => (
                <Paper key={h._id} sx={{ p: 3, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{h.parentName}</Typography>
                    <Rating value={h.rating} precision={0.1} readOnly size="small" />
                    <Typography variant="body2" color="text.secondary">{h.rating.toFixed(1)}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {fmtDate(h.reviewDate || h.serviceDate)}
                  </Typography>
                  <Typography variant="body2">{h.review}</Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* Service Note Dialog */}
      <Dialog open={noteDialog} onClose={() => setNoteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Service Note</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
            {NOTE_TEMPLATES.map((t) => (
              <Button
                key={t}
                size="small"
                variant="outlined"
                sx={{ mb: 1, textTransform: 'none' }}
                onClick={() => setServiceNote(prev => (prev ? `${prev}\n${t}` : t))}
              >
                {t}
              </Button>
            ))}
          </Stack>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Service Notes"
            placeholder="Add notes about feeding, hygiene, activities, etc..."
            value={serviceNote}
            onChange={(e) => setServiceNote(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => (dictatingField === 'note' ? stopDictation() : startDictation('note'))}
            sx={{ textTransform: 'none' }}
          >
            {dictatingField === 'note' ? 'Stop Voice' : 'Voice Input'}
          </Button>
          <Button onClick={() => setNoteDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveNote} variant="contained" sx={{ bgcolor: themeColor, '&:hover': { bgcolor: '#169b83' } }}>
            Save Note
          </Button>
        </DialogActions>
      </Dialog>

      {/* Activity Update Dialog */}
      <Dialog open={activityDialog} onClose={() => setActivityDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Activity Update</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
            {ACTIVITY_TEMPLATES.map((t) => (
              <Button
                key={t}
                size="small"
                variant="outlined"
                sx={{ mb: 1, textTransform: 'none' }}
                onClick={() => setActivityUpdate(prev => (prev ? `${prev}\n${t}` : t))}
              >
                {t}
              </Button>
            ))}
          </Stack>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Activity Description"
            placeholder="Describe the child's activities, play time, learning moments..."
            value={activityUpdate}
            onChange={(e) => setActivityUpdate(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => (dictatingField === 'activity' ? stopDictation() : startDictation('activity'))}
            sx={{ textTransform: 'none' }}
          >
            {dictatingField === 'activity' ? 'Stop Voice' : 'Voice Input'}
          </Button>
          <Button onClick={() => setActivityDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveActivity} variant="contained" sx={{ bgcolor: themeColor, '&:hover': { bgcolor: '#169b83' } }}>
            Save Activity
          </Button>
        </DialogActions>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={summaryDialog} onClose={() => setSummaryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>AI Daily Summary</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This summary is generated from service notes and activity updates. Edit if needed, then save to share with parents/admin.
          </Alert>
          <TextField
            fullWidth
            label="Title"
            value={generatedSummary?.title || ''}
            onChange={(e) => setGeneratedSummary(prev => ({ ...prev, title: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={10}
            label="Summary"
            value={generatedSummary?.summaryText || ''}
            onChange={(e) => setGeneratedSummary(prev => ({ ...prev, summaryText: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSummaryDialog(false)}>Close</Button>
          <Button
            onClick={saveSummary}
            variant="contained"
            disabled={summaryLoading || !generatedSummary?.summaryText}
            sx={{ bgcolor: themeColor, '&:hover': { bgcolor: '#169b83' } }}
          >
            Save Summary
          </Button>
        </DialogActions>
      </Dialog>

      {/* Voice Assistant Dialog */}
      <Dialog open={vaOpen} onClose={handleVaClose} maxWidth="xs" fullWidth>
        <Box sx={{ p: 2, bgcolor: '#f6f8fa' }}>
          <VoiceAssistant themeColor={themeColor} />
        </Box>
      </Dialog>

      </Box>
    </Box>
  );
};

export default NannyDashboard;
