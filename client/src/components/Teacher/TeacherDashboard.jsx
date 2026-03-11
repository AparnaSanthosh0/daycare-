import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  TextField,
  MenuItem,
  Divider,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  CircularProgress,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  Tooltip,
  Badge,
  ButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  MenuBook as MenuBookIcon,
  Message as MessageIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  ExitToApp as LogoutIcon,
  Menu as MenuIcon,
  ShoppingCart as ShoppingCartIcon,
  ChildCare as ChildCareIcon,
  School as SchoolIcon,
  Restaurant as RestaurantIcon,
  LocalHospital as LocalHospitalIcon,
  EmergencyShare as EmergencyIcon,
  DirectionsBus as TransportIcon,
  Chat as ChatIcon,
  Feedback as FeedbackIcon,
  AccountCircle as ProfileIcon,
  SportsEsports,
  AutoStories,
  PlayArrow,
  Stop,
  EmojiEvents,
  Star,
  CheckCircle,
  Groups,
  Timer,
  OpenInNew,
  History,
  TrendingUp,
  CameraAlt
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';
import SmartSearch from '../Common/SmartSearch';
import VoiceAssistant from '../../VoiceAssistant';
import BlockchainAttendanceCapture from '../BlockchainAttendanceCapture';
import BlockchainAttendanceHistory from '../BlockchainAttendanceHistory';
import VideoStoryUpload from '../../pages/Admin/VideoStoryUpload';

// (Removed duplicate Dialog import if present)

const TeacherDashboard = () => {
    // Voice Assistant dialog handlers
    const handleVaOpen = () => setVaOpen(true);
    const handleVaClose = () => setVaOpen(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState({});
  const [feedbackText, setFeedbackText] = useState('');
  const [serviceCategory, setServiceCategory] = useState('Meal & Nutrition');
  const [rating, setRating] = useState(5);
  const [classificationResult, setClassificationResult] = useState(null);
  const [vaOpen, setVaOpen] = useState(false);
  const [teacherHealthPlan, setTeacherHealthPlan] = useState([]);
  const [teacherHealthLoading, setTeacherHealthLoading] = useState(false);

  const fetchTeacherHealthPlan = async () => {
    try {
      setTeacherHealthLoading(true);
      const response = await api.get('/child-health/teacher/daily-plan');
      setTeacherHealthPlan(response.data?.dailyPlan || []);
    } catch (error) {
      console.warn('Teacher health daily plan unavailable, using empty fallback.');
      setTeacherHealthPlan([]);
    } finally {
      setTeacherHealthLoading(false);
    }
  };

  const updateTeacherMealCompletion = async (childId, patch) => {
    try {
      await api.patch(`/child-health/teacher/children/${childId}/meal-completion`, patch);
      fetchTeacherHealthPlan();
    } catch (error) {
      console.error('Failed to update teacher meal completion:', error);
    }
  };

  // Visitor Management States
  const [visitors, setVisitors] = useState([]);
  const [visitorStats, setVisitorStats] = useState({ total: 0, checkedIn: 0, checkedOut: 0 });
  const [visitorMessage, setVisitorMessage] = useState({ type: '', text: '' });
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [pickupForm, setPickupForm] = useState({
    childId: '',
    pickupPersonName: '',
    idProofType: '',
    idProofNumber: ''
  });
  const [pickupResult, setPickupResult] = useState(null);
  const [visitorForm, setVisitorForm] = useState({
    visitorName: '',
    purpose: 'Parent Meeting',
    purposeDetails: ''
  });
  
  // Blockchain attendance state
  const [blockchainCheckInOpen, setBlockchainCheckInOpen] = useState(false);
  const [blockchainCheckOutOpen, setBlockchainCheckOutOpen] = useState(false);
  const [viewBlockchainHistory, setViewBlockchainHistory] = useState(false);
  const [selectedChildForBlockchain, setSelectedChildForBlockchain] = useState(null);

  // ── Stories & Games tab state ──────────────────────────────────────────────
  const [gamesList, setGamesList] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gameAssignSuccess, setGameAssignSuccess] = useState('');
  const [gameAssignError, setGameAssignError] = useState('');
  const [selectedChildForGame, setSelectedChildForGame] = useState('');
  const [selectedGameForAssign, setSelectedGameForAssign] = useState('');
  const [teacherAssignments, setTeacherAssignments] = useState([]);

  // ── Classroom Control state ────────────────────────────────────────────────
  const [sessionMode, setSessionMode] = useState('assignment'); // 'assignment' | 'classroom'
  const [classroomSession, setClassroomSession] = useState(null);
  const [classroomAgeFilter, setClassroomAgeFilter] = useState('all');
  const [classroomParticipants, setClassroomParticipants] = useState(new Set());
  const [studentPerformances, setStudentPerformances] = useState({});
  const [sessionTimer, setSessionTimer] = useState(0);
  const [sessionIntervalId, setSessionIntervalId] = useState(null);
  const [classroomNote, setClassroomNote] = useState('');
  const [sessionHistory, setSessionHistory] = useState([]);
  const [sessionHistoryLoading, setSessionHistoryLoading] = useState(false);
  const [childProgress, setChildProgress] = useState([]);

  const menuItems = [
    { label: 'Dashboard', icon: <SchoolIcon />, path: '/teacher' },
    { label: 'Attendance', icon: <CalendarIcon />, path: '/attendance' },
    { label: 'Staff', icon: <PeopleIcon />, path: '/staff' },
    { label: 'Story Management', icon: <span>🎬</span>, path: '/teacher/stories' },
    { label: 'Profile', icon: <ProfileIcon />, path: '/profile' }
  ];

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Reuse the same endpoint used elsewhere for staff-assigned children.
      if (user?._id) {
        const res = await api.get(`/api/children/staff/${user._id}`);
        setStudents(res.data?.children || []);
        return;
      }
      setStudents([]);
    } catch (error) {
      console.error('Error fetching students:', error);
      // Best-effort fallback for older routes (if any).
      try {
        const res = await api.get('/children');
        setStudents(Array.isArray(res.data) ? res.data : (res.data?.children || []));
      } catch (e) {
        setStudents([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      // Use unified attendance report so parents and teachers see the same data
      const res = await api.get('/attendance/report', {
        params: { entityType: 'child', from: today, to: today }
      });
      const records = res.data?.records || [];

      // Build map of latest entry per child id
      const map = {};
      for (const rec of records) {
        if (!rec?.entityId) continue;
        map[rec.entityId] = rec;
      }
      setAttendanceData(map);
    } catch (e) {
      console.error('Error fetching attendance:', e);
      setAttendanceData({});
    }
  };

  // Load today's attendance once we have students (and on change)
  useEffect(() => {
    if (!students?.length) {
      setAttendanceData({});
      return;
    }
    fetchTodayAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.length]);
  // ...existing code...

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    // Fetch visitors when visitor tab is selected
    if (newValue === 6) {
      fetchVisitors();
    }
    // Fetch games when games tab is selected
    if (newValue === 11) {
      fetchGames();
      fetchSessionHistory();
    }
    if (newValue === 1) {
      fetchTeacherHealthPlan();
    }
  };

  const fetchGames = async () => {
    try {
      setGamesLoading(true);
      const [gamesRes, assignRes] = await Promise.allSettled([
        api.get('/games'),
        api.get('/games/assignments')
      ]);
      if (gamesRes.status === 'fulfilled' && gamesRes.value.data.success) {
        setGamesList(gamesRes.value.data.games);
      }
      if (assignRes.status === 'fulfilled' && assignRes.value.data.success) {
        setTeacherAssignments(assignRes.value.data.assignments);
      }
    } catch (err) {
      // silent
    } finally {
      setGamesLoading(false);
    }
  };

  const handleAssignGame = async () => {
    if (!selectedChildForGame || !selectedGameForAssign) return;
    try {
      const child = students.find(s => s._id === selectedChildForGame);
      await api.post('/games/assign', {
        gameId: selectedGameForAssign,
        childId: selectedChildForGame,
        childName: child ? `${child.firstName} ${child.lastName}` : ''
      });
      setGameAssignSuccess('Game assigned successfully!');
      setSelectedChildForGame('');
      setSelectedGameForAssign('');
      fetchGames();
    } catch (err) {
      setGameAssignError(err.response?.data?.message || 'Assignment failed');
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await api.delete(`/games/assign/${assignmentId}`);
      setTeacherAssignments(prev => prev.filter(a => a._id !== assignmentId));
      setGameAssignSuccess('Assignment removed');
    } catch (err) {
      setGameAssignError('Remove failed');
    }
  };

  // ── Classroom Control Functions ────────────────────────────────────────────
  const handleStartClassroom = (game) => {
    setClassroomSession({
      gameId: game._id,
      gameName: game.title,
      gameEmoji: game.emoji,
      gameRoute: game.gameRoute,
      ageGroup: classroomAgeFilter,
      startTime: new Date()
    });
    setStudentPerformances({});
    setClassroomParticipants(new Set());
    setSessionTimer(0);
    const id = setInterval(() => setSessionTimer(prev => prev + 1), 1000);
    setSessionIntervalId(id);
  };

  const handleToggleParticipant = (studentId) => {
    setClassroomParticipants(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId); else next.add(studentId);
      return next;
    });
  };

  const handleSetPerformance = (studentId, perf) => {
    setStudentPerformances(prev => ({
      ...prev,
      [studentId]: prev[studentId] === perf ? '' : perf
    }));
  };

  const handleEndSession = async () => {
    if (sessionIntervalId) { clearInterval(sessionIntervalId); setSessionIntervalId(null); }
    try {
      const participantList = Array.from(classroomParticipants).map(id => {
        const student = students.find(s => s._id === id);
        return { childId: id, childName: student ? `${student.firstName} ${student.lastName}` : '', performance: studentPerformances[id] || '' };
      });
      await api.post('/games/classroom/start', {
        gameId: classroomSession.gameId,
        gameName: classroomSession.gameName,
        gameEmoji: classroomSession.gameEmoji,
        gameRoute: classroomSession.gameRoute,
        ageGroup: classroomSession.ageGroup,
        participants: participantList,
        duration: sessionTimer,
        notes: classroomNote
      });
      setGameAssignSuccess(`✅ Session saved! ${participantList.length} children participated.`);
      fetchSessionHistory();
    } catch (err) { /* silent */ }
    setClassroomSession(null);
    setSessionTimer(0);
    setClassroomNote('');
    setClassroomParticipants(new Set());
    setStudentPerformances({});
  };

  const formatSessionTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}` ;

  const fetchSessionHistory = async () => {
    try {
      setSessionHistoryLoading(true);
      const [histRes, progRes] = await Promise.allSettled([
        api.get('/games/classroom/history'),
        api.get('/games/classroom/child-progress')
      ]);
      if (histRes.status === 'fulfilled' && histRes.value.data.success) setSessionHistory(histRes.value.data.sessions || []);
      if (progRes.status === 'fulfilled' && progRes.value.data.success) setChildProgress(progRes.value.data.progress || []);
    } catch (err) { /* silent */ }
    finally { setSessionHistoryLoading(false); }
  };

  // cleanup session interval on unmount
  React.useEffect(() => () => { if (sessionIntervalId) clearInterval(sessionIntervalId); }, [sessionIntervalId]);

  const AGE_FILTERS = [
    { value: 'all', label: 'All Ages', color: '#607d8b' },
    { value: 'Toddlers (3-5)', label: 'Toddlers 3-5', color: '#ff6b6b' },
    { value: 'Preschool (4-6)', label: 'Preschool 4-6', color: '#ffa726' },
    { value: 'All Ages (3-7)', label: 'Kinder 5-7', color: '#66bb6a' }
  ];

  const filteredGames = classroomAgeFilter === 'all'
    ? gamesList
    : gamesList.filter(g => g.ageGroup === classroomAgeFilter);

  // Visitor Management Functions
  const fetchVisitors = async () => {
    try {
      const response = await api.get('/visitors/today');
      setVisitors(response.data.visitors || []);
      setVisitorStats(response.data.stats || { total: 0, checkedIn: 0, checkedOut: 0 });
    } catch (error) {
      console.error('Error fetching visitors:', error);
      setVisitorMessage({ type: 'error', text: 'Failed to load visitors' });
    }
  };

  const handleVisitorInputChange = (e) => {
    const { name, value } = e.target;
    setVisitorForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckIn = async () => {
    try {
      if (!visitorForm.visitorName || !visitorForm.purpose) {
        setVisitorMessage({ type: 'error', text: 'Please enter visitor name and purpose' });
        return;
      }

      await api.post('/visitors/check-in', visitorForm);
      setVisitorMessage({ type: 'success', text: 'Visitor checked in successfully!' });
      
      // Reset form
      setVisitorForm({
        visitorName: '',
        purpose: 'Parent Meeting',
        purposeDetails: '',
        contactNumber: '',
        idProofType: '',
        idProofNumber: '',
        relatedChild: '',
        temperature: '',
        notes: ''
      });

      // Refresh visitor list
      fetchVisitors();
    } catch (error) {
      console.error('Error checking in visitor:', error);
      setVisitorMessage({ type: 'error', text: error.response?.data?.message || 'Failed to check in visitor' });
    }
  };

  const handleOpenCheckoutDialog = (visitor) => {
    setSelectedVisitor(visitor);
    setCheckoutNotes('');
    setCheckoutDialogOpen(true);
  };

  const handleCheckOut = async () => {
    try {
      if (!selectedVisitor) return;

      await api.put(`/api/visitors/${selectedVisitor._id}/check-out`, {
        notes: checkoutNotes
      });

      setVisitorMessage({ type: 'success', text: 'Visitor checked out successfully!' });
      setCheckoutDialogOpen(false);
      setSelectedVisitor(null);
      setCheckoutNotes('');

      // Refresh visitor list
      fetchVisitors();
    } catch (error) {
      console.error('Error checking out visitor:', error);
      setVisitorMessage({ type: 'error', text: error.response?.data?.message || 'Failed to check out visitor' });
    }
  };

  const handlePickupInputChange = (e) => {
    const { name, value } = e.target;
    setPickupForm(prev => ({ ...prev, [name]: value }));
  };

  const handleVerifyPickup = async () => {
    try {
      if (!pickupForm.childId || !pickupForm.pickupPersonName) {
        setVisitorMessage({ type: 'error', text: 'Please select child and enter pickup person name' });
        return;
      }

      const response = await api.post('/visitors/verify-pickup', pickupForm);
      setPickupResult(response.data);
      
      if (response.data.authorized) {
        setVisitorMessage({ type: 'success', text: 'Pickup verified - Authorized person ✓' });
      } else {
        setVisitorMessage({ type: 'warning', text: 'WARNING: NOT in authorized pickup list!' });
      }

      // Reset form
      setPickupForm({
        childId: '',
        pickupPersonName: '',
        idProofType: '',
        idProofNumber: ''
      });

      // Refresh visitor list
      fetchVisitors();
    } catch (error) {
      console.error('Error verifying pickup:', error);
      setVisitorMessage({ type: 'error', text: error.response?.data?.message || 'Failed to verify pickup' });
      setPickupResult(null);
    }
  };

  const formatTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '-';
    const duration = Math.round((new Date(checkOut) - new Date(checkIn)) / 1000 / 60);
    return `${duration} min`;
  };

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const handleOpenAttendanceDialog = (student) => {
    setSelectedStudent(student);
    setAttendanceDialogOpen(true);
  };

  const handleCloseAttendanceDialog = () => {
    setAttendanceDialogOpen(false);
    setSelectedStudent(null);
  };

  const handleMarkPresent = async () => {
    if (selectedStudent) {
      try {
        const today = new Date();
        const checkInTime =
          document.querySelector('input[type="time"]')?.value || today.toTimeString().slice(0, 5);

        // Build a local Date for the chosen time (avoid UTC shifts)
        const checkInDateTime = new Date();
        const [h, m] = checkInTime.split(':').map(Number);
        if (!Number.isNaN(h) && !Number.isNaN(m)) {
          checkInDateTime.setHours(h, m, 0, 0);
        }

        // Use unified attendance check-in endpoint so data appears in parent dashboard
        await api.post('/attendance/check-in', {
          entityType: 'child',
          entityId: selectedStudent._id,
          when: checkInDateTime.toISOString(),
          notes: 'Marked present by teacher'
        });
        
        alert(`${selectedStudent.firstName} ${selectedStudent.lastName} marked as present!`);
        handleCloseAttendanceDialog();
        await fetchTodayAttendance(); // Refresh present count/status
      } catch (error) {
        console.error('Error marking attendance:', error);
        alert('Failed to mark attendance. Please try again.');
      }
    }
  };

  const handleMarkAbsent = async () => {
    if (selectedStudent) {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Use unified attendance absence endpoint so data appears in parent dashboard
        await api.post('/attendance/mark-absence', {
          entityType: 'child',
          entityId: selectedStudent._id,
          date: startOfDay.toISOString(),
          notes: 'Marked absent by teacher'
        });
        
        alert(`${selectedStudent.firstName} ${selectedStudent.lastName} marked as absent!`);
        handleCloseAttendanceDialog();
        await fetchTodayAttendance(); // Refresh present count/status
      } catch (error) {
        console.error('Error marking attendance:', error);
        alert('Failed to mark attendance. Please try again.');
      }
    }
  };

  const handleClassifyFeedback = async () => {
    // Call ML API for classification
    console.log('Classifying feedback:', { feedbackText, serviceCategory, rating });
    setClassificationResult({
      category: serviceCategory,
      sentiment: 'Positive',
      confidence: 0.92,
      keywords: ['excellent', 'nutritious', 'healthy']
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const renderAttendanceTab = () => {
    const presentCount = students.filter(s => attendanceData[s._id]?.status === 'present').length;
    const absentCount = students.length - presentCount;
    const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;

    return (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Workflow: Today's Children List, Assigned Meal Plan, Allergy-Safe Meals,
              Serve Recommended Foods, Update Meal Completion.
            </Typography>
            <Typography variant="h4" sx={{ color: '#1abc9c', fontWeight: 600 }}>
              {students.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Present Today
            </Typography>
            <Typography variant="h4" sx={{ color: '#34C759', fontWeight: 600 }}>
              {presentCount}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Absent
            </Typography>
            <Typography variant="h4" sx={{ color: '#FF3B30', fontWeight: 600 }}>
              {absentCount}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Attendance Rate
            </Typography>
            <Typography variant="h4" sx={{ color: '#1abc9c', fontWeight: 600 }}>
              {attendanceRate}%
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            onClick={() => navigate('/teacher/stories')}
            sx={{
              p: 3, border: '2px solid #764ba2', borderRadius: 2,
              cursor: 'pointer', transition: 'all 0.2s',
              '&:hover': { bgcolor: '#764ba211', transform: 'translateY(-2px)', boxShadow: 3 }
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Story Management
            </Typography>
            <Typography variant="h4" sx={{ color: '#764ba2', fontWeight: 600 }}>
              🎬
            </Typography>
            <Typography variant="caption" sx={{ color: '#764ba2', fontWeight: 500 }}>
              Upload &amp; manage videos
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Today's Attendance */}
      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Today's Attendance - {new Date().toLocaleDateString()}
            </Typography>
          </Box>
          
          {/* Smart Search Component */}
          <Box sx={{ mb: 2 }}>
            <SmartSearch
              data={students}
              searchKeys={['firstName', 'lastName', 'parents.firstName', 'parents.lastName', 'program']}
              onSelect={(student) => {
                setSelectedStudent(student);
                setAttendanceDialogOpen(true);
              }}
              placeholder="Search by child name, parent name, or program..."
              label="Quick Search Student"
              maxResults={8}
              renderItem={(result) => {
                const student = result.item;
                const matchScore = Math.round((1 - result.score) * 100);
                const age = calculateAge(student.dateOfBirth);
                const attendance = attendanceData[student._id];
                const isPresent = attendance?.status === 'present';

                return (
                  <ListItem
                    button
                    onClick={() => {
                      setSelectedStudent(student);
                      setAttendanceDialogOpen(true);
                    }}
                    sx={{
                      '&:hover': {
                        bgcolor: 'rgba(26, 188, 156, 0.1)'
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#1abc9c' }}>
                        <ChildCareIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            {student.firstName} {student.lastName}
                          </Typography>
                          <Chip 
                            label={`${matchScore}% match`} 
                            size="small" 
                            color="success"
                            sx={{ height: 20 }}
                          />
                          <Chip 
                            label={isPresent ? 'Present' : 'Absent'} 
                            size="small" 
                            sx={{ 
                              height: 20,
                              backgroundColor: isPresent ? '#E8F5E9' : '#FFEBEE', 
                              color: isPresent ? '#2E7D32' : '#C62828'
                            }} 
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            Age: {age} years | Program: {student.program || 'Not assigned'}
                          </Typography>
                          {student.parents && student.parents[0] && (
                            <Typography variant="caption" display="block">
                              Parent: {student.parents[0].firstName} {student.parents[0].lastName}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                );
              }}
            />
          </Box>
        </Box>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography>Loading students...</Typography>
          </Box>
        ) : students.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography>No students registered in the system</Typography>
          </Box>
        ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 900, p: 3 }}>
            <Grid container sx={{ mb: 2, pb: 2, borderBottom: '2px solid #f5f5f5' }}>
              <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Child Name</Typography></Grid>
              <Grid item xs={1.5}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Age</Typography></Grid>
              <Grid item xs={1.5}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Status</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Check-in Time</Typography></Grid>
              <Grid item xs={1}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Program</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Parent</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Actions</Typography></Grid>
            </Grid>

            {students.map((student, index) => {
              const attendance = attendanceData[student._id];
              const isPresent = attendance?.status === 'present';
              const age = calculateAge(student.dateOfBirth);
              
              return (
                <Grid key={student._id} container sx={{ py: 2, borderBottom: index === students.length - 1 ? 'none' : '1px solid #f5f5f5', alignItems: 'center' }}>
                  <Grid item xs={2}><Typography variant="body2">{student.firstName} {student.lastName}</Typography></Grid>
                  <Grid item xs={1.5}><Typography variant="body2">{age} years</Typography></Grid>
                  <Grid item xs={1.5}>
                    <Chip 
                      label={isPresent ? 'Present' : 'Absent'} 
                      size="small" 
                      sx={{ 
                        backgroundColor: isPresent ? '#E8F5E9' : '#FFEBEE', 
                        color: isPresent ? '#2E7D32' : '#C62828', 
                        fontWeight: 500 
                      }} 
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <Typography variant="body2">
                      {attendance?.checkInAt ? new Date(attendance.checkInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={1}><Typography variant="body2">{student.program || '-'}</Typography></Grid>
                  <Grid item xs={2}>
                    <Typography variant="body2">
                      {student.parents && student.parents[0] ? 
                        `${student.parents[0].firstName || ''} ${student.parents[0].lastName || ''}`.trim() : 
                        'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={2}>
                    {attendance ? (
                      <Button size="small" sx={{ color: '#1abc9c', textTransform: 'none', fontWeight: 500 }}>Add Note</Button>
                    ) : (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button 
                          size="small" 
                          variant="contained"
                          sx={{ 
                            backgroundColor: '#1abc9c',
                            color: '#ffffff',
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                            px: 1,
                            '&:hover': { backgroundColor: '#16a085' }
                          }}
                          onClick={() => handleOpenAttendanceDialog(student)}
                        >
                          Present
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            borderColor: '#FF3B30',
                            color: '#FF3B30',
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                            px: 1,
                            '&:hover': { 
                              borderColor: '#FF3B30',
                              backgroundColor: 'rgba(255, 59, 48, 0.04)'
                            }
                          }}
                          onClick={async () => {
                            setSelectedStudent(student);
                            await handleMarkAbsent();
                          }}
                        >
                          Absent
                        </Button>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              );
            })}
          </Box>
        </Box>
        )}
      </Paper>

      {/* Staff Attendance Section */}
      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden', mt: 4 }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0', backgroundColor: '#f8f9fa' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            👥 Staff Attendance
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Staff Name"
                defaultValue={user?.firstName || ''} 
                disabled
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Check-in Time"
                type="time"
                size="small"
                defaultValue={new Date().toTimeString().slice(0, 5)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="Status"
                size="small"
                defaultValue="present"
              >
                <MenuItem value="present">Present</MenuItem>
                <MenuItem value="late">Late</MenuItem>
                <MenuItem value="absent">Absent</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                sx={{
                  backgroundColor: '#1abc9c',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#16a085' }
                }}
              >
                Mark My Attendance
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Blockchain Attendance for Teachers */}
      <Paper elevation={0} sx={{ border: '2px solid #3b82f6', borderRadius: 2, overflow: 'hidden', mt: 4, bgcolor: '#f0f9ff' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #3b82f6', backgroundColor: '#dbeafe' }}>
          <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            🔒 Blockchain Attendance
            <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
              (Immutable GPS & Photo Verified Records)
            </Typography>
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Blockchain attendance</strong> creates immutable records with GPS location and photo verification. 
              These records cannot be altered or deleted, providing legal protection for staff and facility.
            </Typography>
          </Alert>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              {students.length > 0 ? (
                <TextField
                  select
                  label="Select Child for Blockchain"
                  fullWidth
                  value={selectedChildForBlockchain?._id || ''}
                  onChange={(e) => {
                    const child = students.find(c => c._id === e.target.value);
                    setSelectedChildForBlockchain(child);
                  }}
                  disabled={loading}
                >
                  <MenuItem value="">
                    <em>Select a child</em>
                  </MenuItem>
                  {students.map((child) => (
                    <MenuItem key={child._id} value={child._id}>
                      {child.firstName} {child.lastName}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  label="Loading children..."
                  fullWidth
                  disabled
                  value=""
                />
              )}
            </Grid>
            
            <Grid item xs={12} md={8} sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                color="success"
                onClick={() => {
                  if (selectedChildForBlockchain) {
                    setBlockchainCheckInOpen(true);
                  }
                }}
                disabled={!selectedChildForBlockchain}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  minWidth: '180px'
                }}
              >
                🔒 Blockchain Check-In
              </Button>
              
              <Button
                variant="contained"
                size="large"
                color="error"
                onClick={() => {
                  if (selectedChildForBlockchain) {
                    setBlockchainCheckOutOpen(true);
                  }
                }}
                disabled={!selectedChildForBlockchain}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  minWidth: '180px'
                }}
              >
                🔒 Blockchain Check-Out
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                color="primary"
                onClick={() => {
                  if (selectedChildForBlockchain) {
                    setViewBlockchainHistory(true);
                  }
                }}
                disabled={!selectedChildForBlockchain}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  minWidth: '180px'
                }}
              >
                📊 View History
              </Button>
            </Grid>
          </Grid>
          
          {!selectedChildForBlockchain && students.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Please select a child to enable blockchain attendance actions.
            </Alert>
          )}
          
          {students.length === 0 && !loading && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No children found in the system. Add children to use blockchain attendance.
            </Alert>
          )}
        </Box>
      </Paper>

      {/* Voice Assistant Button moved to header */}
    </Box>
    );
  };

  const renderMealPlanTab = () => (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Weekly Meal Planning
      </Typography>

      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Daily Child Nutrition Workflow
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Today's workflow: Children List, Assigned Meal Plan, Allergy-Safe Meals,
          Serve Recommended Foods, Update Meal Completion.
        </Typography>

        {teacherHealthLoading ? (
          <CircularProgress size={24} />
        ) : teacherHealthPlan.length === 0 ? (
          <Alert severity="info">No AI meal plans found yet. Doctor must run clinical analysis first.</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Child</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Breakfast</TableCell>
                  <TableCell>Lunch</TableCell>
                  <TableCell>Snack</TableCell>
                  <TableCell>Dinner</TableCell>
                  <TableCell>Foods to Avoid</TableCell>
                  <TableCell>Completion</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {teacherHealthPlan.map((row) => (
                  <TableRow key={row.childId}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Chip size="small" label={row.status || 'N/A'} color="warning" variant="outlined" />
                    </TableCell>
                    <TableCell>{row.breakfast || '-'}</TableCell>
                    <TableCell>{row.lunch || '-'}</TableCell>
                    <TableCell>{row.snack || '-'}</TableCell>
                    <TableCell>{row.dinner || '-'}</TableCell>
                    <TableCell>
                      {(row.foodsToAvoid || []).length ? (row.foodsToAvoid || []).join(', ') : '-'}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                          size="small"
                          variant={row.completion?.breakfastDone ? 'contained' : 'outlined'}
                          onClick={() => updateTeacherMealCompletion(row.childId, { breakfastDone: !row.completion?.breakfastDone })}
                        >
                          B
                        </Button>
                        <Button
                          size="small"
                          variant={row.completion?.lunchDone ? 'contained' : 'outlined'}
                          onClick={() => updateTeacherMealCompletion(row.childId, { lunchDone: !row.completion?.lunchDone })}
                        >
                          L
                        </Button>
                        <Button
                          size="small"
                          variant={row.completion?.snackDone ? 'contained' : 'outlined'}
                          onClick={() => updateTeacherMealCompletion(row.childId, { snackDone: !row.completion?.snackDone })}
                        >
                          S
                        </Button>
                        <Button
                          size="small"
                          variant={row.completion?.dinnerDone ? 'contained' : 'outlined'}
                          onClick={() => updateTeacherMealCompletion(row.childId, { dinnerDone: !row.completion?.dinnerDone })}
                        >
                          D
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      
      {/* Meal Planning Grid */}
      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
        <Paper key={day} elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1abc9c' }}>
            {day}
          </Typography>
          
          <Grid container spacing={3}>
            {/* Breakfast */}
            <Grid item xs={12} md={6} lg={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Breakfast
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<span>+</span>}
                  sx={{
                    borderColor: '#1abc9c',
                    color: '#1abc9c',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: '#16a085',
                      backgroundColor: 'rgba(26, 188, 156, 0.04)'
                    }
                  }}
                >
                  Add Item
                </Button>
              </Box>
            </Grid>
            
            {/* Morning Snack */}
            <Grid item xs={12} md={6} lg={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Morning Snack
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<span>+</span>}
                  sx={{
                    borderColor: '#1abc9c',
                    color: '#1abc9c',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: '#16a085',
                      backgroundColor: 'rgba(26, 188, 156, 0.04)'
                    }
                  }}
                >
                  Add Item
                </Button>
              </Box>
            </Grid>
            
            {/* Lunch */}
            <Grid item xs={12} md={6} lg={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Lunch
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<span>+</span>}
                  sx={{
                    borderColor: '#1abc9c',
                    color: '#1abc9c',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: '#16a085',
                      backgroundColor: 'rgba(26, 188, 156, 0.04)'
                    }
                  }}
                >
                  Add Item
                </Button>
              </Box>
            </Grid>
            
            {/* Afternoon Snack */}
            <Grid item xs={12} md={6} lg={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Afternoon Snack
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<span>+</span>}
                  sx={{
                    borderColor: '#1abc9c',
                    color: '#1abc9c',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: '#16a085',
                      backgroundColor: 'rgba(26, 188, 156, 0.04)'
                    }
                  }}
                >
                  Add Item
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      ))}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<span>💾</span>}
          sx={{
            borderColor: '#1abc9c',
            color: '#1abc9c',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1,
            '&:hover': {
              borderColor: '#16a085',
              backgroundColor: 'rgba(26, 188, 156, 0.04)'
            }
          }}
        >
          Save Draft
        </Button>
        <Button
          variant="contained"
          startIcon={<span>▶</span>}
          sx={{
            backgroundColor: '#1abc9c',
            color: '#ffffff',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1,
            '&:hover': {
              backgroundColor: '#16a085'
            }
          }}
        >
          Submit for Approval
        </Button>
      </Box>

      {/* My Meal Plans Table */}
      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            My Meal Plans
          </Typography>
          <Button
            size="small"
            startIcon={<span>🔄</span>}
            sx={{
              color: '#1abc9c',
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Refresh
          </Button>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 900, p: 3 }}>
            <Grid container sx={{ mb: 2, pb: 2, borderBottom: '2px solid #f5f5f5' }}>
              <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Title</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Week Of</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Program</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Status</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Created</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Actions</Typography></Grid>
            </Grid>

            {/* Sample row - replace with actual data */}
            <Grid container sx={{ py: 2, borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
              <Grid item xs={2}><Typography variant="body2">Week 1 Menu</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2">{new Date().toLocaleDateString()}</Typography></Grid>
              <Grid item xs={2}>
                <Chip label="ALL" size="small" sx={{ backgroundColor: '#f5f5f5' }} />
              </Grid>
              <Grid item xs={2}>
                <Chip label="PENDING" size="small" sx={{ backgroundColor: '#FFF3E0', color: '#F57C00', fontWeight: 500 }} />
              </Grid>
              <Grid item xs={2}><Typography variant="body2">{new Date().toLocaleDateString()}</Typography></Grid>
              <Grid item xs={2}>
                <Button size="small" sx={{ color: '#1abc9c', textTransform: 'none', fontWeight: 500 }}>View</Button>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>
    </Box>
  );

  const renderActivitiesTab = () => (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Activities Management
      </Typography>
      
      {/* Activity Management */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <SchoolIcon sx={{ color: '#1abc9c' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Activity Management
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Conduct daily learning activities and track progress in skill development.
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#1abc9c', fontWeight: 600, mb: 1 }}>
                  Learning Activities
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Plan and conduct educational sessions
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => alert('Start Activity feature - Coming soon!')}
                  sx={{
                    backgroundColor: '#1abc9c',
                    color: '#ffffff',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { backgroundColor: '#16a085' }
                  }}
                >
                  Start Activity
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#1abc9c', fontWeight: 600, mb: 1 }}>
                  Progress Tracking
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Record learning milestones and achievements
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => alert('Track Progress feature - Coming soon!')}
                  sx={{
                    borderColor: '#1abc9c',
                    color: '#1abc9c',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#16a085',
                      backgroundColor: 'rgba(26, 188, 156, 0.1)'
                    }
                  }}
                >
                  Track Progress
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#1abc9c', fontWeight: 600, mb: 1 }}>
                  Special Events
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Organize games and special activities
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => alert('Plan Event feature - Coming soon!')}
                  sx={{
                    borderColor: '#1abc9c',
                    color: '#1abc9c',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#16a085',
                      backgroundColor: 'rgba(26, 188, 156, 0.1)'
                    }
                  }}
                >
                  Plan Event
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#1abc9c', fontWeight: 600, mb: 1 }}>
                  Participation
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Track attendance in activities
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => alert('Record Participation feature - Coming soon!')}
                  sx={{
                    borderColor: '#1abc9c',
                    color: '#1abc9c',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#16a085',
                      backgroundColor: 'rgba(26, 188, 156, 0.1)'
                    }
                  }}
                >
                  Record Participation
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Daily Reports & Observations */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1abc9c' }}>
          Daily Reports & Observations
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Activity Report"
              placeholder="Describe today's activities, child behavior, and observations..."
              variant="outlined"
              sx={{ mb: 2 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ border: '2px dashed #e0e0e0', borderRadius: 2, p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Upload Photos/Videos
              </Typography>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: '#1abc9c',
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#16a085' }
                }}
              >
                Choose Files
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Meal Consumption & Nap Time */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1abc9c' }}>
          Meal Consumption & Nap Time Tracking
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                🍽️ Meal Consumption
              </Typography>
              <TextField
                select
                fullWidth
                label="Child Name"
                size="small"
                sx={{ mb: 2 }}
                defaultValue=""
              >
                <MenuItem value="">Select Child</MenuItem>
                {students.map((s) => (
                  <MenuItem key={s._id} value={s._id}>{s.firstName} {s.lastName}</MenuItem>
                ))}
              </TextField>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    select
                    fullWidth
                    label="Meal Type"
                    size="small"
                    defaultValue=""
                  >
                    <MenuItem value="breakfast">Breakfast</MenuItem>
                    <MenuItem value="morning-snack">Morning Snack</MenuItem>
                    <MenuItem value="lunch">Lunch</MenuItem>
                    <MenuItem value="afternoon-snack">Afternoon Snack</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    fullWidth
                    label="Amount Eaten"
                    size="small"
                    defaultValue=""
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="most">Most</MenuItem>
                    <MenuItem value="half">Half</MenuItem>
                    <MenuItem value="little">Little</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
              <Button
                fullWidth
                variant="contained"
                sx={{
                  mt: 2,
                  backgroundColor: '#1abc9c',
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#16a085' }
                }}
              >
                Record Meal
              </Button>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                😴 Nap Time Tracking
              </Typography>
              <TextField
                select
                fullWidth
                label="Child Name"
                size="small"
                sx={{ mb: 2 }}
                defaultValue=""
              >
                <MenuItem value="">Select Child</MenuItem>
                {students.map((s) => (
                  <MenuItem key={s._id} value={s._id}>{s.firstName} {s.lastName}</MenuItem>
                ))}
              </TextField>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Sleep Start"
                    type="time"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Wake Up"
                    type="time"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
              <TextField
                fullWidth
                label="Notes"
                size="small"
                sx={{ mt: 2 }}
                placeholder="Sleep quality, behavior..."
              />
              <Button
                fullWidth
                variant="contained"
                sx={{
                  mt: 2,
                  backgroundColor: '#1abc9c',
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#16a085' }
                }}
              >
                Record Nap Time
              </Button>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* After-School Programs */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1abc9c' }}>
          📚 After-School Programs & Homework Help
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Homework Help
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Assist children with their homework
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  borderColor: '#1abc9c',
                  color: '#1abc9c',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#16a085' }
                }}
              >
                Start Session
              </Button>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Extra Learning
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Conduct additional learning activities
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  borderColor: '#1abc9c',
                  color: '#1abc9c',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#16a085' }
                }}
              >
                Plan Activity
              </Button>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Skills Development
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Track progress in special skills
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  borderColor: '#1abc9c',
                  color: '#1abc9c',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#16a085' }
                }}
              >
                Record Progress
              </Button>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  const renderCurriculumTab = () => (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Curriculum & Learning
      </Typography>
      <Paper elevation={0} sx={{ p: 4, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Typography variant="body1" color="text.secondary">
          Curriculum management content coming soon...
        </Typography>
      </Paper>
    </Box>
  );

  const renderMessagesTab = () => (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Messages & Communication
      </Typography>
      
      {/* Childcare & Supervision */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <ChildCareIcon sx={{ color: '#FFB800' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Childcare & Supervision
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Monitor and care for children throughout the day. Maintain proper hygiene, safety, and comfort.
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#66BB6A', fontWeight: 600, mb: 1 }}>
                  Safety Check
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Ensure all children are safe and accounted for
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#90EE90',
                    color: '#66BB6A',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#66BB6A',
                      backgroundColor: 'rgba(144, 238, 144, 0.1)'
                    }
                  }}
                >
                  Conduct Safety Check
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#81C784', fontWeight: 600, mb: 1 }}>
                  Hygiene Monitor
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Track hand washing, bathroom breaks, and cleanliness
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#90EE90',
                    color: '#66BB6A',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#66BB6A',
                      backgroundColor: 'rgba(144, 238, 144, 0.1)'
                    }
                  }}
                >
                  Log Hygiene Activity
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#A5D6A7', fontWeight: 600, mb: 1 }}>
                  Health Alerts
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Report unusual behavior, illness, or injuries
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#90EE90',
                    color: '#66BB6A',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#66BB6A',
                      backgroundColor: 'rgba(144, 238, 144, 0.1)'
                    }
                  }}
                >
                  Report Health Issue
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Meal & Health Monitoring */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1abc9c' }}>
          Meal & Health Monitoring
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#66BB6A', fontWeight: 600, mb: 1 }}>
                  Meal Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Ensure children receive correct meals according to plan
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#90EE90',
                    color: '#66BB6A',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#66BB6A',
                      backgroundColor: 'rgba(144, 238, 144, 0.1)'
                    }
                  }}
                >
                  View Meal Plan
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#81C784', fontWeight: 600, mb: 1 }}>
                  Allergy Tracking
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Monitor food allergies and dietary restrictions
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#90EE90',
                    color: '#66BB6A',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#66BB6A',
                      backgroundColor: 'rgba(144, 238, 144, 0.1)'
                    }
                  }}
                >
                  Check Allergies
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#A5D6A7', fontWeight: 600, mb: 1 }}>
                  Health Records
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Record minor health issues and first aid
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#90EE90',
                    color: '#66BB6A',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#66BB6A',
                      backgroundColor: 'rgba(144, 238, 144, 0.1)'
                    }
                  }}
                >
                  Log Health Issue
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  const renderReportsTab = () => (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Reports & Insights
      </Typography>

      {/* Filters Section */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              select
              label="Entity Type"
              defaultValue="Child"
              variant="outlined"
            >
              <MenuItem value="Child">Child</MenuItem>
              <MenuItem value="Staff">Staff</MenuItem>
              <MenuItem value="Class">Class</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Entity ID"
              placeholder="Enter ID"
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              defaultValue="2024-01-01"
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              defaultValue="2024-12-31"
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" sx={{ backgroundColor: '#1abc9c', '&:hover': { backgroundColor: '#16a085' } }}>Attendance</Button>
          <Button variant="outlined" sx={{ borderColor: '#1abc9c', color: '#1abc9c' }}>Enrollment</Button>
          <Button variant="outlined" sx={{ borderColor: '#1abc9c', color: '#1abc9c' }}>Financial</Button>
          <Button variant="outlined" sx={{ borderColor: '#1abc9c', color: '#1abc9c' }}>Staff Performance</Button>
        </Box>
      </Paper>

      {/* Attendance Table */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Attendance Records
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Child ID</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Check-In</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Check-Out</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={{ padding: '12px' }}>CH001</td>
                <td style={{ padding: '12px' }}>Emma Wilson</td>
                <td style={{ padding: '12px' }}>2024-01-08</td>
                <td style={{ padding: '12px' }}>08:30 AM</td>
                <td style={{ padding: '12px' }}>03:45 PM</td>
                <td style={{ padding: '12px' }}>
                  <Chip label="Present" size="small" sx={{ backgroundColor: '#34C759', color: 'white' }} />
                </td>
              </tr>
            </tbody>
          </table>
        </Box>
      </Paper>

      {/* Enrollment Section */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Enrollment Statistics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip label="Infant: 5" sx={{ backgroundColor: '#FFB2C6', color: 'white' }} />
          <Chip label="Preschool: 8" sx={{ backgroundColor: '#5DCCBD', color: 'white' }} />
          <Chip label="Toddler: 5" sx={{ backgroundColor: '#03A9F4', color: 'white' }} />
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Group</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Total</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Active</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Capacity</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={{ padding: '12px' }}>Infant</td>
                <td style={{ padding: '12px' }}>5</td>
                <td style={{ padding: '12px' }}>5</td>
                <td style={{ padding: '12px' }}>8</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={{ padding: '12px' }}>Preschool</td>
                <td style={{ padding: '12px' }}>8</td>
                <td style={{ padding: '12px' }}>8</td>
                <td style={{ padding: '12px' }}>12</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={{ padding: '12px' }}>Toddler</td>
                <td style={{ padding: '12px' }}>5</td>
                <td style={{ padding: '12px' }}>5</td>
                <td style={{ padding: '12px' }}>10</td>
              </tr>
            </tbody>
          </table>
        </Box>
      </Paper>
    </Box>
  );

  const renderVisitorTab = () => (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Visitor Management & Authorized Pickups
      </Typography>

      {/* Message Alert */}
      {visitorMessage.text && (
        <Alert 
          severity={visitorMessage.type} 
          sx={{ mb: 3 }}
          onClose={() => setVisitorMessage({ type: '', text: '' })}
        >
          {visitorMessage.text}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid #e0e0e0', bgcolor: '#f8f9fa' }}>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 600, color: '#1abc9c' }}>
                {visitorStats.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Visitors Today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid #e0e0e0', bgcolor: '#fff3cd' }}>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 600, color: '#ff9800' }}>
                {visitorStats.checkedIn}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Currently Inside
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid #e0e0e0', bgcolor: '#d4edda' }}>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 600, color: '#28a745' }}>
                {visitorStats.checkedOut}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Checked Out
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Visitor Check-in */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1abc9c' }}>
          👤 Visitor Check-in
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField 
              fullWidth 
              label="Visitor Name *" 
              name="visitorName"
              value={visitorForm.visitorName}
              onChange={handleVisitorInputChange}
              size="small" 
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField 
              select 
              fullWidth 
              label="Purpose *" 
              name="purpose"
              value={visitorForm.purpose}
              onChange={handleVisitorInputChange}
              size="small"
            >
              <MenuItem value="Parent Meeting">Parent Meeting</MenuItem>
              <MenuItem value="Delivery">Delivery</MenuItem>
              <MenuItem value="Maintenance">Maintenance</MenuItem>
              <MenuItem value="Inspection">Inspection</MenuItem>
              <MenuItem value="Guest Speaker">Guest Speaker</MenuItem>
              <MenuItem value="Authorized Pickup">Authorized Pickup</MenuItem>
              <MenuItem value="Interview">Interview</MenuItem>
              <MenuItem value="Tour">Tour</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField 
              fullWidth 
              label="Contact Number" 
              name="contactNumber"
              value={visitorForm.contactNumber}
              onChange={handleVisitorInputChange}
              size="small" 
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField 
              select 
              fullWidth 
              label="ID Proof Type" 
              name="idProofType"
              value={visitorForm.idProofType}
              onChange={handleVisitorInputChange}
              size="small"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="Aadhar">Aadhar Card</MenuItem>
              <MenuItem value="Passport">Passport</MenuItem>
              <MenuItem value="Driving License">Driving License</MenuItem>
              <MenuItem value="Voter ID">Voter ID</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField 
              fullWidth 
              label="ID Number" 
              name="idProofNumber"
              value={visitorForm.idProofNumber}
              onChange={handleVisitorInputChange}
              size="small" 
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField 
              select 
              fullWidth 
              label="Related to Child" 
              name="relatedChild"
              value={visitorForm.relatedChild}
              onChange={handleVisitorInputChange}
              size="small"
            >
              <MenuItem value="">None</MenuItem>
              {students.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField 
              fullWidth 
              label="Temperature (°F)" 
              name="temperature"
              type="number"
              value={visitorForm.temperature}
              onChange={handleVisitorInputChange}
              size="small"
              inputProps={{ step: 0.1 }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField 
              fullWidth 
              label="Purpose Details / Notes" 
              name="purposeDetails"
              value={visitorForm.purposeDetails}
              onChange={handleVisitorInputChange}
              multiline
              rows={2}
              size="small" 
            />
          </Grid>
          <Grid item xs={12}>
            <Button 
              fullWidth 
              variant="contained" 
              onClick={handleCheckIn}
              sx={{ 
                backgroundColor: '#1abc9c', 
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { backgroundColor: '#16a085' } 
              }}
            >
              Check In Visitor
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Authorized Pickup Verification */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1abc9c' }}>
          🔐 Verify Authorized Pickup
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField 
              select 
              fullWidth 
              label="Child *" 
              name="childId"
              value={pickupForm.childId}
              onChange={handlePickupInputChange}
              size="small"
            >
              <MenuItem value="">Select Child</MenuItem>
              {students.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField 
              fullWidth 
              label="Pickup Person Name *" 
              name="pickupPersonName"
              value={pickupForm.pickupPersonName}
              onChange={handlePickupInputChange}
              size="small" 
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField 
              select 
              fullWidth 
              label="ID Proof Type" 
              name="idProofType"
              value={pickupForm.idProofType}
              onChange={handlePickupInputChange}
              size="small"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="Aadhar">Aadhar Card</MenuItem>
              <MenuItem value="Passport">Passport</MenuItem>
              <MenuItem value="Driving License">Driving License</MenuItem>
              <MenuItem value="Voter ID">Voter ID</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField 
              fullWidth 
              label="ID Proof Number" 
              name="idProofNumber"
              value={pickupForm.idProofNumber}
              onChange={handlePickupInputChange}
              size="small" 
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button 
              fullWidth 
              variant="contained" 
              onClick={handleVerifyPickup}
              sx={{ 
                backgroundColor: '#34C759', 
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { backgroundColor: '#2DA84C' } 
              }}
            >
              Verify Pickup
            </Button>
          </Grid>
        </Grid>

        {/* Pickup Verification Result */}
        {pickupResult && (
          <Box sx={{ mt: 3, p: 2, border: '2px solid', borderColor: pickupResult.authorized ? '#34C759' : '#FF3B30', borderRadius: 2, bgcolor: pickupResult.authorized ? '#f0fdf4' : '#fef2f2' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: pickupResult.authorized ? '#16a34a' : '#dc2626' }}>
              {pickupResult.authorized ? '✓ Authorized Person' : '⚠️ UNAUTHORIZED PERSON'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Child:</strong> {pickupResult.childInfo?.name} 
              {pickupResult.childInfo?.program && ` (${typeof pickupResult.childInfo.program === 'object' ? pickupResult.childInfo.program.name || pickupResult.childInfo.program.programName || 'N/A' : pickupResult.childInfo.program})`}
            </Typography>
            <Typography variant="body2">
              <strong>Authorized Pickup List:</strong>
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 3 }}>
              {pickupResult.childInfo?.authorizedPickups.map((person, idx) => (
                <Typography component="li" variant="body2" key={idx}>
                  {person}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Visitor Log */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1abc9c' }}>
            📋 Today's Visitor Log
          </Typography>
          <Button
            size="small"
            onClick={fetchVisitors}
            sx={{ color: '#1abc9c', textTransform: 'none' }}
          >
            🔄 Refresh
          </Button>
        </Box>

        {visitors.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No visitors today
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Purpose</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Contact</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Check-in</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Check-out</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Duration</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((visitor) => (
                  <tr key={visitor._id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '12px' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {visitor.visitorName}
                      </Typography>
                      {visitor.relatedChild && (
                        <Typography variant="caption" color="text.secondary">
                          Child: {visitor.relatedChild.firstName} {visitor.relatedChild.lastName}
                        </Typography>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Chip 
                        label={visitor.purpose} 
                        size="small" 
                        sx={{ 
                          bgcolor: visitor.authorizedPickup ? '#dcfce7' : '#e0e0e0',
                          color: visitor.authorizedPickup ? '#16a34a' : '#666'
                        }} 
                      />
                      {visitor.purposeDetails && (
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                          {visitor.purposeDetails}
                        </Typography>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Typography variant="body2">
                        {visitor.contactNumber || '-'}
                      </Typography>
                      {visitor.idProofType && (
                        <Typography variant="caption" color="text.secondary">
                          {visitor.idProofType}
                        </Typography>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Typography variant="body2">{formatTime(visitor.checkInTime)}</Typography>
                      {visitor.temperature && (
                        <Typography variant="caption" color="text.secondary">
                          Temp: {visitor.temperature}°F
                        </Typography>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Typography variant="body2">{formatTime(visitor.checkOutTime)}</Typography>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Typography variant="body2">
                        {calculateDuration(visitor.checkInTime, visitor.checkOutTime)}
                      </Typography>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Chip 
                        label={visitor.status === 'checked-in' ? 'Inside' : 'Left'} 
                        size="small"
                        color={visitor.status === 'checked-in' ? 'warning' : 'success'}
                      />
                      {visitor.authorizedPickup && visitor.pickupVerified === false && (
                        <Chip 
                          label="UNVERIFIED" 
                          size="small" 
                          color="error"
                          sx={{ ml: 0.5 }}
                        />
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {visitor.status === 'checked-in' && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenCheckoutDialog(visitor)}
                          sx={{ 
                            color: '#1abc9c', 
                            borderColor: '#1abc9c',
                            textTransform: 'none',
                            '&:hover': { 
                              borderColor: '#16a085',
                              bgcolor: 'rgba(26, 188, 156, 0.1)'
                            }
                          }}
                        >
                          Check Out
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Paper>

      {/* Check Out Dialog */}
      <Dialog open={checkoutDialogOpen} onClose={() => setCheckoutDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Check Out Visitor</DialogTitle>
        <DialogContent>
          {selectedVisitor && (
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Visitor:</strong> {selectedVisitor.visitorName}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Purpose:</strong> {selectedVisitor.purpose}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Check-in Time:</strong> {formatTime(selectedVisitor.checkInTime)}
              </Typography>
              <TextField
                fullWidth
                label="Exit Notes (Optional)"
                multiline
                rows={3}
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                placeholder="Any observations or notes..."
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutDialogOpen(false)} sx={{ color: '#666' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleCheckOut} 
            variant="contained"
            sx={{ 
              bgcolor: '#1abc9c',
              '&:hover': { bgcolor: '#16a085' }
            }}
          >
            Confirm Check Out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  const renderEmergencyTab = () => (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        🚨 Emergency Response
      </Typography>
      
      {/* Emergency Alert */}
      <Paper elevation={0} sx={{ p: 4, mb: 3, border: '2px solid #FF3B30', borderRadius: 2, backgroundColor: '#FFF5F5' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#FF3B30' }}>
          ⚠️ Initiate Emergency Alert
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField select fullWidth label="Emergency Type" size="small" defaultValue="">
              <MenuItem value="medical">Medical Emergency</MenuItem>
              <MenuItem value="fire">Fire</MenuItem>
              <MenuItem value="injury">Child Injury</MenuItem>
              <MenuItem value="security">Security Threat</MenuItem>
              <MenuItem value="evacuation">Evacuation</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField fullWidth label="Description" size="small" placeholder="Describe the emergency..." />
          </Grid>
          <Grid item xs={12}>
            <Button fullWidth variant="contained" sx={{ backgroundColor: '#FF3B30', fontSize: '1.1rem', py: 2, textTransform: 'none', fontWeight: 700, '&:hover': { backgroundColor: '#DC2626' } }}>
              🚨 SEND EMERGENCY ALERT
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Notify Nurse/Admin */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1abc9c' }}>
          🏥 Notify Nurse / Admin
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField select fullWidth label="Notify" size="small" defaultValue="">
              <MenuItem value="nurse">School Nurse</MenuItem>
              <MenuItem value="admin">Administrator</MenuItem>
              <MenuItem value="both">Both</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField select fullWidth label="Priority" size="small" defaultValue="">
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button fullWidth variant="contained" sx={{ backgroundColor: '#FF9500', textTransform: 'none', '&:hover': { backgroundColor: '#E88600' } }}>
              Send Notification
            </Button>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={3} label="Message" size="small" placeholder="Describe the situation..." />
          </Grid>
        </Grid>
      </Paper>

      {/* Emergency Contacts */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1abc9c' }}>
          📞 Quick Emergency Contacts
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', textAlign: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>911</Typography>
              <Typography variant="body2" color="text.secondary">Emergency Services</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', textAlign: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>School Nurse</Typography>
              <Typography variant="body2" color="text.secondary">Ext: 123</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', textAlign: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Administrator</Typography>
              <Typography variant="body2" color="text.secondary">Ext: 100</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', textAlign: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Security</Typography>
              <Typography variant="body2" color="text.secondary">Ext: 999</Typography>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  const renderTransportTab = () => (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        🚌 Transport & Pickup Management
      </Typography>
      
      {/* Daily Pickup Log */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1abc9c' }}>
          📝 Record Child Pickup
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField select fullWidth label="Child Name" size="small" defaultValue="">
              <MenuItem value="">Select Child</MenuItem>
              {students.map((s) => (
                <MenuItem key={s._id} value={s._id}>{s.firstName} {s.lastName}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Picked Up By" size="small" />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth label="Time" type="time" size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField select fullWidth label="Transport Mode" size="small" defaultValue="">
              <MenuItem value="parent">Parent</MenuItem>
              <MenuItem value="bus">School Bus</MenuItem>
              <MenuItem value="carpool">Carpool</MenuItem>
              <MenuItem value="walk">Walk</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="contained" sx={{ backgroundColor: '#1abc9c', textTransform: 'none', '&:hover': { backgroundColor: '#16a085' } }}>
              Log Pickup
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Today's Pickup Schedule */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1abc9c' }}>
          📅 Today's Pickup Schedule
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Grid container sx={{ mb: 2, pb: 2, borderBottom: '2px solid #f5f5f5' }}>
            <Grid item xs={3}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Child Name</Typography></Grid>
            <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Pickup Time</Typography></Grid>
            <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Transport</Typography></Grid>
            <Grid item xs={3}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Authorized Person</Typography></Grid>
            <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Status</Typography></Grid>
          </Grid>
          {students.slice(0, 5).map((student) => (
            <Grid key={student._id} container sx={{ py: 2, borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
              <Grid item xs={3}><Typography variant="body2">{student.firstName} {student.lastName}</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2">3:30 PM</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2">Parent</Typography></Grid>
              <Grid item xs={3}><Typography variant="body2">Parent Name</Typography></Grid>
              <Grid item xs={2}>
                <Chip label="Pending" size="small" sx={{ backgroundColor: '#FFF3E0', color: '#F57C00' }} />
              </Grid>
            </Grid>
          ))}
        </Box>
      </Paper>
    </Box>
  );

  const renderFeedbackTab = () => (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Parent Feedback Classification
      </Typography>
      
      {/* Parent Feedback Classification */}
      <Paper elevation={0} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
            <LocalHospitalIcon sx={{ fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Parent Feedback Classification
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            AI-Powered Bayesian Classifier for Feedback Analysis
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Classify Feedback
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Feedback Text"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                variant="outlined"
                sx={{ mb: 3 }}
              />
              
              <TextField
                fullWidth
                select
                label="Service Category"
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                variant="outlined"
                sx={{ mb: 3 }}
              >
                <MenuItem value="Meal & Nutrition">Meal & Nutrition</MenuItem>
                <MenuItem value="Safety & Security">Safety & Security</MenuItem>
                <MenuItem value="Learning Activities">Learning Activities</MenuItem>
                <MenuItem value="Health & Hygiene">Health & Hygiene</MenuItem>
                <MenuItem value="Communication">Communication</MenuItem>
                <MenuItem value="Facilities">Facilities</MenuItem>
              </TextField>
              
              <TextField
                fullWidth
                type="number"
                label="Rating (1-5)"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                variant="outlined"
                inputProps={{ min: 1, max: 5 }}
                sx={{ mb: 3 }}
              />
              
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleClassifyFeedback}
                sx={{
                  backgroundColor: '#1abc9c',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 2,
                  '&:hover': { backgroundColor: '#16a085' }
                }}
              >
                🧠 Classify Feedback
              </Button>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0', p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                Classification Results
              </Typography>
              
              {!classificationResult ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <LocalHospitalIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Enter feedback text and click "Classify Feedback" to see results
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ width: '100%' }}>
                  <Paper elevation={0} sx={{ p: 3, backgroundColor: '#f8f9fa', borderRadius: 2, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Category
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#1abc9c' }}>
                      {classificationResult.category}
                    </Typography>
                  </Paper>
                  
                  <Paper elevation={0} sx={{ p: 3, backgroundColor: '#f8f9fa', borderRadius: 2, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Sentiment
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {classificationResult.sentiment}
                    </Typography>
                  </Paper>
                  
                  <Paper elevation={0} sx={{ p: 3, backgroundColor: '#f8f9fa', borderRadius: 2, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Confidence
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {(classificationResult.confidence * 100).toFixed(0)}%
                    </Typography>
                  </Paper>
                  
                  <Paper elevation={0} sx={{ p: 3, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Keywords
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      {classificationResult.keywords.map((keyword, index) => (
                        <Chip 
                          key={index}
                          label={keyword}
                          size="small"
                          sx={{ backgroundColor: '#1abc9c', color: '#ffffff' }}
                        />
                      ))}
                    </Box>
                  </Paper>
                </Box>
              )}
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );

  // ── Tab 10: Stories (inline VideoStoryUpload) ────────────────────────
  const renderStoriesTab = () => (
    <VideoStoryUpload embedded={true} />
  );

  // ── Tab 11: Games (manage + assign) ─────────────────────────────
  const renderGamesTab = () => (
    <Box>
      {/* ── Header ── */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SportsEsports sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">🎮 Games & Classroom Control</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Assign games for home practice or run interactive classroom activities on projector/smart screen</Typography>
            </Box>
          </Box>
          {/* Stats row */}
          <Stack direction="row" spacing={2}>
            <Paper sx={{ px: 2, py: 1, bgcolor: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold">{teacherAssignments.length}</Typography>
              <Typography variant="caption">Assigned</Typography>
            </Paper>
            <Paper sx={{ px: 2, py: 1, bgcolor: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold">{teacherAssignments.filter(a => a.playCount > 0).length}</Typography>
              <Typography variant="caption">Played</Typography>
            </Paper>
            <Paper sx={{ px: 2, py: 1, bgcolor: classroomSession ? 'rgba(76,175,80,0.5)' : 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold">{classroomSession ? '🔴 LIVE' : '—'}</Typography>
              <Typography variant="caption">Session</Typography>
            </Paper>
          </Stack>
        </Box>
      </Paper>

      {/* ── Mode Toggle ── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant={sessionMode === 'assignment' ? 'contained' : 'outlined'}
          startIcon={<Groups />}
          onClick={() => setSessionMode('assignment')}
          sx={{
            bgcolor: sessionMode === 'assignment' ? '#667eea' : 'transparent',
            borderColor: '#667eea', color: sessionMode === 'assignment' ? 'white' : '#667eea',
            fontWeight: 600, px: 3, '&:hover': { bgcolor: '#5a6fd6', color: 'white' }
          }}
        >
          📋 Assignment Mode
        </Button>
        <Button
          variant={sessionMode === 'classroom' ? 'contained' : 'outlined'}
          startIcon={<PlayArrow />}
          onClick={() => { setSessionMode('classroom'); if (!sessionHistory.length) fetchSessionHistory(); }}
          sx={{
            bgcolor: sessionMode === 'classroom' ? '#e91e63' : 'transparent',
            borderColor: '#e91e63', color: sessionMode === 'classroom' ? 'white' : '#e91e63',
            fontWeight: 600, px: 3, '&:hover': { bgcolor: '#c2185b', color: 'white' }
          }}
        >
          🎯 Classroom Mode
        </Button>
      </Box>

      {gameAssignSuccess && <Alert severity="success" onClose={() => setGameAssignSuccess('')} sx={{ mb: 2 }}>{gameAssignSuccess}</Alert>}
      {gameAssignError   && <Alert severity="error"   onClose={() => setGameAssignError('')}   sx={{ mb: 2 }}>{gameAssignError}</Alert>}

      {/* ══════════════════ CLASSROOM MODE ══════════════════ */}
      {sessionMode === 'classroom' && (
        <Box>
          {/* Active Session Banner */}
          {classroomSession && (
            <Paper sx={{ p: 3, mb: 3, border: '3px solid #4caf50', borderRadius: 2, bgcolor: '#f1f8e9' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5">{classroomSession.gameEmoji}</Typography>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" color="#2e7d32">🔴 LIVE: {classroomSession.gameName}</Typography>
                    <Typography variant="caption" color="text.secondary">Started {new Date(classroomSession.startTime).toLocaleTimeString()}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip icon={<Timer />} label={formatSessionTime(sessionTimer)} color="success" sx={{ fontWeight: 'bold', fontSize: '1.1rem', px: 1 }} />
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Stop />}
                    onClick={handleEndSession}
                    sx={{ fontWeight: 700 }}
                  >
                    End Session
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<OpenInNew />}
                    onClick={() => window.open(classroomSession.gameRoute, '_blank')}
                    sx={{ borderColor: '#2e7d32', color: '#2e7d32' }}
                  >
                    Open Game
                  </Button>
                </Box>
              </Box>

              <Grid container spacing={3}>
                {/* Participation Tracker */}
                <Grid item xs={12} md={7}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Groups fontSize="small" /> Participation Tracker ({classroomParticipants.size}/{students.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {students.map(s => {
                      const id = s._id;
                      const isParticipating = classroomParticipants.has(id);
                      return (
                        <Chip
                          key={id}
                          label={`${s.firstName} ${s.lastName}`}
                          icon={isParticipating ? <CheckCircle /> : undefined}
                          onClick={() => handleToggleParticipant(id)}
                          color={isParticipating ? 'success' : 'default'}
                          variant={isParticipating ? 'filled' : 'outlined'}
                          sx={{ cursor: 'pointer', fontWeight: isParticipating ? 600 : 400 }}
                        />
                      );
                    })}
                  </Box>
                  {students.length === 0 && <Typography variant="body2" color="text.secondary">No students loaded yet.</Typography>}
                </Grid>

                {/* Performance Marking */}
                <Grid item xs={12} md={5}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>📊 Mark Performance</Typography>
                  {classroomParticipants.size === 0 ? (
                    <Typography variant="body2" color="text.secondary">Check students above to mark their performance.</Typography>
                  ) : (
                    <Box sx={{ maxHeight: 220, overflowY: 'auto' }}>
                      {Array.from(classroomParticipants).map(id => {
                        const student = students.find(s => s._id === id);
                        if (!student) return null;
                        const perf = studentPerformances[id] || '';
                        return (
                          <Box key={id} sx={{ mb: 1.5, p: 1.5, bgcolor: 'white', borderRadius: 1.5, border: '1px solid #e0e0e0' }}>
                            <Typography variant="body2" fontWeight="bold" mb={0.5}>{student.firstName} {student.lastName}</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {[
                                { val: 'excellent', label: '🌟 Excellent', color: '#4caf50' },
                                { val: 'good', label: '👍 Good', color: '#2196f3' },
                                { val: 'needs_practice', label: '💪 Practice', color: '#ff9800' }
                              ].map(opt => (
                                <Button
                                  key={opt.val}
                                  size="small"
                                  variant={perf === opt.val ? 'contained' : 'outlined'}
                                  onClick={() => handleSetPerformance(id, opt.val)}
                                  sx={{
                                    fontSize: '0.7rem', py: 0.3, px: 0.8,
                                    bgcolor: perf === opt.val ? opt.color : 'transparent',
                                    borderColor: opt.color, color: perf === opt.val ? 'white' : opt.color,
                                    '&:hover': { bgcolor: opt.color, color: 'white' }
                                  }}
                                >
                                  {opt.label}
                                </Button>
                              ))}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Grid>

                {/* Session Notes */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Session Notes (optional)"
                    placeholder="e.g. Children engaged well with shapes category..."
                    value={classroomNote}
                    onChange={e => setClassroomNote(e.target.value)}
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Age Filter Buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">AGE GROUP:</Typography>
            {AGE_FILTERS.map(f => (
              <Button
                key={f.value}
                size="small"
                variant={classroomAgeFilter === f.value ? 'contained' : 'outlined'}
                onClick={() => setClassroomAgeFilter(f.value)}
                sx={{
                  bgcolor: classroomAgeFilter === f.value ? f.color : 'transparent',
                  borderColor: f.color, color: classroomAgeFilter === f.value ? 'white' : f.color,
                  fontWeight: 600, '&:hover': { bgcolor: f.color, color: 'white' }
                }}
              >
                {f.label}
              </Button>
            ))}
          </Box>

          {/* Game Grid — Classroom Launch Cards */}
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            🎲 Select Activity to Start {filteredGames.length !== gamesList.length && `(${filteredGames.length} games)`}
          </Typography>
          {gamesLoading ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : filteredGames.length === 0 ? (
            <Typography color="text.secondary" py={3}>No games for the selected age group.</Typography>
          ) : (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {filteredGames.map(game => (
                <Grid item xs={12} sm={6} md={3} key={game._id}>
                  <Card sx={{
                    height: '100%', cursor: 'pointer', border: '2px solid transparent',
                    transition: 'all 0.2s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 6, borderColor: '#667eea' }
                  }}>
                    <Box sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      p: 3, textAlign: 'center', color: 'white'
                    }}>
                      <Typography variant="h2" mb={0.5}>{game.emoji}</Typography>
                      <Chip label={game.ageGroup} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontSize: '0.7rem' }} />
                    </Box>
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>{game.title}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>{game.description}</Typography>
                      <Chip label={game.category} size="small" variant="outlined" sx={{ mb: 1 }} />
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<PlayArrow />}
                        disabled={!!classroomSession}
                        onClick={() => handleStartClassroom(game)}
                        sx={{
                          bgcolor: '#e91e63', '&:hover': { bgcolor: '#c2185b' },
                          fontWeight: 700, fontSize: '0.9rem'
                        }}
                      >
                        Start Activity
                      </Button>
                      <Tooltip title="Open game in new tab (projection mode)">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => window.open(game.gameRoute, '_blank')}
                          sx={{ minWidth: 40, px: 1, borderColor: '#667eea', color: '#667eea' }}
                        >
                          <OpenInNew fontSize="small" />
                        </Button>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Child Progress Overview */}
          {childProgress.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp /> Class Performance Overview
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      {['Child', 'Sessions', '🌟 Excellent', '👍 Good', '💪 Needs Practice'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e0e0e0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {childProgress.map((cp, i) => (
                      <tr key={cp.childId || i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{cp.childName || '—'}</td>
                        <td style={{ padding: '10px 12px' }}><Chip label={cp.sessions} size="small" color="primary" /></td>
                        <td style={{ padding: '10px 12px' }}><Chip label={cp.excellent || 0} size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32' }} /></td>
                        <td style={{ padding: '10px 12px' }}><Chip label={cp.good || 0} size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0' }} /></td>
                        <td style={{ padding: '10px 12px' }}><Chip label={cp.needs_practice || 0} size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          )}

          {/* Session History */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <History /> Recent Sessions ({sessionHistory.length})
              </Typography>
              <Button size="small" onClick={fetchSessionHistory} disabled={sessionHistoryLoading}>Refresh</Button>
            </Box>
            {sessionHistoryLoading ? (
              <Box textAlign="center" py={2}><CircularProgress size={24} /></Box>
            ) : sessionHistory.length === 0 ? (
              <Box textAlign="center" py={3}>
                <Typography color="text.secondary">No classroom sessions yet. Click "Start Activity" to begin!</Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {sessionHistory.slice(0, 6).map((s, i) => (
                  <Grid item xs={12} sm={6} md={4} key={s._id || i}>
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h5">{s.gameEmoji || '🎮'}</Typography>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">{s.gameName}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(s.startTime).toLocaleDateString()}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={`${s.participants?.length || 0} children`} size="small" icon={<Groups />} />
                        <Chip label={s.ageGroup || 'All'} size="small" variant="outlined" />
                        {s.duration > 0 && <Chip label={formatSessionTime(s.duration)} size="small" icon={<Timer />} variant="outlined" />}
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Box>
      )}

      {/* ══════════════════ ASSIGNMENT MODE ══════════════════ */}
      {sessionMode === 'assignment' && (
        <Grid container spacing={3}>
          {/* Quick Assign Panel */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>➕ Assign Game for Home Practice</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Assign educational games to specific children so parents can practice at home!
              </Typography>
              <Stack spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Child</InputLabel>
                  <Select value={selectedChildForGame} label="Select Child" onChange={e => setSelectedChildForGame(e.target.value)}>
                    {students.map(s => (
                      <MenuItem key={s._id} value={s._id}>{s.firstName} {s.lastName}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Game</InputLabel>
                  <Select value={selectedGameForAssign} label="Select Game" onChange={e => setSelectedGameForAssign(e.target.value)}>
                    {gamesList.map(g => (
                      <MenuItem key={g._id} value={g._id}>{g.emoji} {g.title} — {g.ageGroup}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  disabled={!selectedChildForGame || !selectedGameForAssign}
                  onClick={handleAssignGame}
                  startIcon={<PlayArrow />}
                  sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' }, fontWeight: 700 }}
                >
                  Assign for Home Practice
                </Button>
              </Stack>
            </Paper>
          </Grid>

          {/* Game Library Preview */}
          <Grid item xs={12} md={7}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              📚 Game Library ({gamesList.length} games)
            </Typography>
            {gamesLoading ? (
              <Box textAlign="center" py={3}><CircularProgress /></Box>
            ) : (
              <Grid container spacing={2}>
                {gamesList.map(game => (
                  <Grid item xs={12} sm={6} key={game._id}>
                    <Card sx={{ border: '1px solid #e0e0e0', height: '100%', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}>
                      <CardContent sx={{ pb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <Typography variant="h3">{game.emoji}</Typography>
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">{game.title}</Typography>
                            <Chip label={game.ageGroup} size="small" color="primary" sx={{ fontSize: '0.7rem' }} />
                          </Box>
                        </Box>
                        <Typography variant="caption" color="text.secondary">{game.description}</Typography>
                      </CardContent>
                      <CardActions sx={{ pt: 0, pb: 1, px: 2, gap: 0.5 }}>
                        <Chip label={game.isBuiltIn ? '✅ Built-in' : 'Custom'} size="small" variant="outlined" color={game.isBuiltIn ? 'success' : 'secondary'} />
                        <Chip label={game.category} size="small" variant="outlined" />
                        <Box sx={{ flex: 1 }} />
                        <Button size="small" startIcon={<OpenInNew />} onClick={() => window.open(game.gameRoute, '_blank')} sx={{ color: '#667eea' }}>
                          Preview
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>

          {/* Assignments Table */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  📋 Home Practice Assignments ({teacherAssignments.length})
                </Typography>
                <Button size="small" onClick={fetchGames} disabled={gamesLoading}>Refresh</Button>
              </Box>
              {teacherAssignments.length === 0 ? (
                <Box textAlign="center" py={4} sx={{ bgcolor: '#f9f9f9', borderRadius: 2 }}>
                  <Typography variant="h4" mb={1}>🎮</Typography>
                  <Typography color="text.secondary">No assignments yet. Use the panel above to assign games!</Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        {['Game', 'Child', 'Assigned', 'Last Played', 'Played', 'Best Score', 'Stars', 'Action'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e0e0e0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teacherAssignments.map((a, i) => (
                        <tr key={a._id || i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '10px 12px' }}>{a.gameId?.emoji} {a.gameId?.title || '—'}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 500 }}>{a.childName || '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13 }}>{a.assignedAt ? new Date(a.assignedAt).toLocaleDateString() : '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: 13 }}>{a.lastPlayedAt ? new Date(a.lastPlayedAt).toLocaleDateString() : <em style={{ color: '#999' }}>Not yet</em>}</td>
                          <td style={{ padding: '10px 12px' }}><Chip label={a.playCount || 0} size="small" color={a.playCount > 0 ? 'success' : 'default'} /></td>
                          <td style={{ padding: '10px 12px' }}>
                            {a.bestScore > 0
                              ? <Chip label={`${a.bestScore} pts`} size="small" sx={{ bgcolor: '#fff3e0', color: '#e65100' }} icon={<EmojiEvents style={{ fontSize: 14 }} />} />
                              : <span style={{ color: '#bbb' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {'⭐'.repeat(a.stars || 0) || <span style={{ color: '#ccc' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Button size="small" color="error" onClick={() => handleRemoveAssignment(a._id)}>Remove</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  // ── AR Tools Tab ──────────────────────────────────────────────────────────
  const renderARToolsTab = () => (
    <Box>
      <Paper sx={{ p: 4, mb: 3, borderRadius: 3, background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CameraAlt sx={{ fontSize: 48 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">🎯 AR Teaching Tools</Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Use augmented reality to make lessons interactive and engaging
            </Typography>
          </Box>
        </Box>
      </Paper>
      <Grid container spacing={3}>
        {/* AR Alphabet Scanner */}
        <Grid item xs={12} sm={6}>
          <Card sx={{ borderRadius: 3, overflow: 'hidden', border: '2px solid #667eea', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
            <Box sx={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', p: 3, color: 'white', textAlign: 'center' }}>
              <Typography variant="h2">🔤</Typography>
              <Typography variant="h6" fontWeight="bold" mt={1}>AR Alphabet Scanner</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>Classroom-Ready</Typography>
            </Box>
            <CardContent>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Print the 26 flashcards and conduct an AR letter-recognition activity. 
                The camera detects each card's QR code and overlays the emoji + pronunciation.
                Great for group or individual learning!
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {['Ages 2-6', '26 Letters', 'Printable Cards', 'Audio Pronunciation'].map(tag => (
                  <Chip key={tag} label={tag} size="small" sx={{ bgcolor: '#667eea22', color: '#667eea', fontWeight: 600 }} />
                ))}
              </Box>
              <Button fullWidth variant="contained" onClick={() => navigate('/alphabet-ar')}
                sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' }, borderRadius: 2, fontWeight: 700 }}>
                🚀 Open AR Alphabet
              </Button>
            </CardContent>
          </Card>
        </Grid>
        {/* Face Accessories AR */}
        <Grid item xs={12} sm={6}>
          <Card sx={{ borderRadius: 3, overflow: 'hidden', border: '2px solid #f06292', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
            <Box sx={{ background: 'linear-gradient(135deg,#f06292,#ce93d8)', p: 3, color: 'white', textAlign: 'center' }}>
              <Typography variant="h2">👒</Typography>
              <Typography variant="h6" fontWeight="bold" mt={1}>Face Accessories AR</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>For Dress-Up & Drama</Typography>
            </Box>
            <CardContent>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Use face AR for drama, dress-up activities, and creative expression. 
                Kids can try on crowns, cat ears, hats and more — then capture the photo!
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {['All Ages', '24 Accessories', 'Photo Capture', 'Camera Required'].map(tag => (
                  <Chip key={tag} label={tag} size="small" sx={{ bgcolor: '#f0629222', color: '#c2185b', fontWeight: 600 }} />
                ))}
              </Box>
              <Button fullWidth variant="contained" onClick={() => navigate('/face-ar')}
                sx={{ bgcolor: '#f06292', '&:hover': { bgcolor: '#e91e8c' }, borderRadius: 2, fontWeight: 700 }}>
                🎭 Open Face AR
              </Button>
            </CardContent>
          </Card>
        </Grid>
        {/* Tips card */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2, bgcolor: '#fff8e1', border: '1px solid #ffe082' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>💡 Classroom Tips</Typography>
            <Grid container spacing={2}>
              {[
                { icon: '1️⃣', tip: 'Print the A-Z flashcards from the Alphabet AR "Print Flashcards" tab. Laminate for re-use.' },
                { icon: '2️⃣', tip: 'Assign each child a letter to find. The child who scans it first reads the word aloud.' },
                { icon: '3️⃣', tip: 'For Face AR, use it during creative play, costume day or as a reward activity.' },
                { icon: '4️⃣', tip: 'Works best on Chrome or Edge browser. Ensure camera permission is granted.' },
              ].map(({ icon, tip }) => (
                <Grid item xs={12} sm={6} key={icon}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <Typography variant="h6">{icon}</Typography>
                    <Typography variant="body2" color="text.secondary">{tip}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Attendance Marking Dialog */}
      <Dialog open={attendanceDialogOpen} onClose={handleCloseAttendanceDialog}>
        <DialogTitle sx={{ backgroundColor: '#1abc9c', color: 'white' }}>
          Mark Attendance
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to mark{' '}
            <strong>
              {selectedStudent
                ? `${selectedStudent.firstName || ''} ${selectedStudent.lastName || ''}`.trim() || selectedStudent._id || 'this student'
                : 'this student'}
            </strong>{' '}
            as present?
          </Typography>
          <TextField
            fullWidth
            label="Check-in Time"
            type="time"
            defaultValue={new Date().toTimeString().slice(0, 5)}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            select
            label="Mood"
            defaultValue="happy"
          >
            <MenuItem value="happy">😊 Happy</MenuItem>
            <MenuItem value="excited">😁 Excited</MenuItem>
            <MenuItem value="calm">😌 Calm</MenuItem>
            <MenuItem value="tired">😴 Tired</MenuItem>
            <MenuItem value="upset">😢 Upset</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseAttendanceDialog}>Cancel</Button>
          <Button 
            onClick={handleMarkAbsent}
            variant="outlined"
            sx={{
              borderColor: '#FF3B30',
              color: '#FF3B30',
              '&:hover': { 
                borderColor: '#FF3B30',
                backgroundColor: 'rgba(255, 59, 48, 0.04)'
              }
            }}
          >
            Mark Absent
          </Button>
          <Button 
            onClick={handleMarkPresent}
            variant="contained"
            sx={{
              backgroundColor: '#1abc9c',
              '&:hover': { backgroundColor: '#16a085' }
            }}
          >
            Mark Present
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sidebar Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        <Box
          sx={{ width: 280 }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <Box sx={{ p: 3, backgroundColor: '#1abc9c', color: '#ffffff' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Welcome Akhil
            </Typography>
          </Box>
          <Divider />
          <List>
            {menuItems.map((item, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton onClick={() => navigate(item.path)}>
                  <ListItemIcon sx={{ color: '#1abc9c' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Voice Assistant Dialog */}
      <Dialog open={vaOpen} onClose={handleVaClose} maxWidth="sm" fullWidth>
        <DialogTitle>Voice Assistant</DialogTitle>
        <DialogContent>
          <VoiceAssistant themeColor="#1abc9c" />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleVaClose} sx={{ color: '#666' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#ffffff'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              onClick={toggleDrawer(true)}
              sx={{ color: '#1abc9c' }}
            >
              <MenuIcon />
            </IconButton>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1abc9c' }}>
                Teacher Dashboard
              </Typography>
              <Typography variant="body2" sx={{ color: '#1abc9c', fontWeight: 500 }}>
                Welcome Akhil
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <IconButton 
              onClick={handleVaOpen}
              sx={{ color: '#1abc9c' }}
              aria-label="Open voice assistant"
            >
              <ChatIcon />
            </IconButton>
            <IconButton 
              onClick={() => navigate('/shop')}
              sx={{ 
                color: '#1abc9c'
              }}
              aria-label="Shop"
            >
              <ShoppingCartIcon />
            </IconButton>
            <IconButton 
              onClick={() => navigate('/profile')}
              sx={{ 
                color: '#1abc9c'
              }}
            >
              <ProfileIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<WarningIcon />}
              sx={{
                backgroundColor: '#FF3B30',
                color: '#ffffff',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: '#DC2626'
                }
              }}
            >
              Emergency Alert
            </Button>
            <IconButton 
              onClick={handleLogout}
              sx={{ 
                color: '#666'
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Tabs Navigation */}
        <Tabs 
          value={currentTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '1rem',
              minHeight: 48,
              color: '#6B7280'
            },
            '& .Mui-selected': {
              color: '#1abc9c !important',
              fontWeight: 600
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#1abc9c',
              height: 3
            }
          }}
        >
          <Tab icon={<PeopleIcon />} iconPosition="start" label="Attendance" />
          <Tab icon={<RestaurantIcon />} iconPosition="start" label="Meal Planning" />
          <Tab icon={<CalendarIcon />} iconPosition="start" label="Activities" />
          <Tab icon={<MenuBookIcon />} iconPosition="start" label="Curriculum" />
          <Tab icon={<MessageIcon />} iconPosition="start" label="Messages" />
          <Tab icon={<AssessmentIcon />} iconPosition="start" label="Reports" />
          <Tab icon={<PeopleIcon />} iconPosition="start" label="Visitors" />
          <Tab icon={<EmergencyIcon />} iconPosition="start" label="Emergency" />
          <Tab icon={<TransportIcon />} iconPosition="start" label="Transport" />
          <Tab icon={<FeedbackIcon />} iconPosition="start" label="Feedback" />
          <Tab icon={<AutoStories />} iconPosition="start" label="Stories" />
          <Tab icon={<SportsEsports />} iconPosition="start" label="Games" />
        </Tabs>
      </Paper>

      {/* Main Content */}
      <Box sx={{ p: 4 }}>
        {currentTab === 0 && renderAttendanceTab()}
        {currentTab === 1 && renderMealPlanTab()}
        {currentTab === 2 && renderActivitiesTab()}
        {currentTab === 3 && renderCurriculumTab()}
        {currentTab === 4 && renderMessagesTab()}
        {currentTab === 5 && renderReportsTab()}
        {currentTab === 6 && renderVisitorTab()}
        {currentTab === 7 && renderEmergencyTab()}
        {currentTab === 8 && renderTransportTab()}
        {currentTab === 9 && renderFeedbackTab()}
        {currentTab === 10 && renderStoriesTab()}
        {currentTab === 11 && renderGamesTab()}
      </Box>
      
      {/* Voice Assistant */}
      <VoiceAssistant open={vaOpen} onClose={handleVaClose} />
      
      {/* Blockchain Attendance Dialogs */}
      {selectedChildForBlockchain && (
        <>
          <BlockchainAttendanceCapture
            open={blockchainCheckInOpen}
            onClose={() => setBlockchainCheckInOpen(false)}
            entityType="child"
            entityId={selectedChildForBlockchain._id}
            entityName={`${selectedChildForBlockchain.firstName} ${selectedChildForBlockchain.lastName}`}
            actionType="check-in"
            onSuccess={(result) => {
              console.log('Blockchain check-in recorded:', result);
              setBlockchainCheckInOpen(false);
              fetchTodayAttendance(); // Refresh attendance data
            }}
          />
          
          <BlockchainAttendanceCapture
            open={blockchainCheckOutOpen}
            onClose={() => setBlockchainCheckOutOpen(false)}
            entityType="child"
            entityId={selectedChildForBlockchain._id}
            entityName={`${selectedChildForBlockchain.firstName} ${selectedChildForBlockchain.lastName}`}
            actionType="check-out"
            onSuccess={(result) => {
              console.log('Blockchain check-out recorded:', result);
              setBlockchainCheckOutOpen(false);
              fetchTodayAttendance();
            }}
          />
          
          <Dialog 
            open={viewBlockchainHistory} 
            onClose={() => setViewBlockchainHistory(false)} 
            maxWidth="lg" 
            fullWidth
          >
            <DialogTitle>
              🔒 Blockchain Attendance History
              <Typography variant="body2" color="text.secondary">
                Immutable records with GPS & photo verification for {selectedChildForBlockchain.firstName} {selectedChildForBlockchain.lastName}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <BlockchainAttendanceHistory
                entityType="child"
                entityId={selectedChildForBlockchain._id}
                entityName={`${selectedChildForBlockchain.firstName} ${selectedChildForBlockchain.lastName}`}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewBlockchainHistory(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default TeacherDashboard;
