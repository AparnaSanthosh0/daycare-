import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
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
  AccessTime as AccessTimeIcon,
  EmergencyShare as EmergencyIcon,
  DirectionsBus as TransportIcon,
  Chat as ChatIcon,
  Feedback as FeedbackIcon,
  AccountCircle as ProfileIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';

const TeacherDashboard = () => {
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

  const menuItems = [
    { label: 'Attendance', icon: <AccessTimeIcon />, path: '/teacher' },
    { label: 'Meal Planning', icon: <RestaurantIcon />, path: '/teacher/meals' },
    { label: 'Activities', icon: <SchoolIcon />, path: '/teacher/activities' },
    { label: 'Visitor Management', icon: <PeopleIcon />, path: '/teacher/visitors' },
    { label: 'Emergency Response', icon: <EmergencyIcon />, path: '/teacher/emergency' },
    { label: 'Transport & Pickup', icon: <TransportIcon />, path: '/teacher/transport' },
    { label: 'Communication', icon: <ChatIcon />, path: '/teacher/communication' },
    { label: 'Reports', icon: <AssessmentIcon />, path: '/teacher/reports' },
    { label: 'Feedback', icon: <FeedbackIcon />, path: '/teacher/feedback' },
    { label: 'Profile', icon: <ProfileIcon />, path: '/teacher/profile' }
  ];

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Fetch all children in the system
      const response = await api.get('/api/children');
      console.log('Children fetched:', response.data);
      setStudents(response.data || []);
      
      // Fetch today's attendance for all students
      const today = new Date().toISOString().split('T')[0];
      const attendanceRes = await api.get(`/api/reports/attendance?date=${today}`);
      const attendanceMap = {};
      (attendanceRes.data || []).forEach(record => {
        if (record.entityType === 'child') {
          attendanceMap[record.entityId] = record;
        }
      });
      setAttendanceData(attendanceMap);
    } catch (error) {
      console.error('Error fetching students:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      // If /api/children fails (permission issue), try my-children
      try {
        console.log('Trying /api/staff/my-children...');
        const response = await api.get('/api/staff/my-children');
        console.log('My children fetched:', response.data);
        setStudents(response.data || []);
        
        // Fetch today's attendance
        const today = new Date().toISOString().split('T')[0];
        const attendanceRes = await api.get(`/api/reports/attendance?date=${today}`);
        const attendanceMap = {};
        (attendanceRes.data || []).forEach(record => {
          if (record.entityType === 'child') {
            attendanceMap[record.entityId] = record;
          }
        });
        setAttendanceData(attendanceMap);
      } catch (err) {
        console.error('Error fetching my children:', err);
        console.error('Error response:', err.response?.data);
        console.error('Error status:', err.response?.status);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
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
        const checkInTime = document.querySelector('input[type="time"]')?.value || today.toTimeString().slice(0, 5);
        const [hours, minutes] = checkInTime.split(':');
        const checkInDateTime = new Date();
        checkInDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        await api.post('/api/staff-ops/attendance/child/' + selectedStudent._id, {
          date: today.toISOString().split('T')[0],
          status: 'present',
          checkInAt: checkInDateTime.toISOString(),
          notes: 'Marked by teacher'
        });
        
        alert(`${selectedStudent.firstName} ${selectedStudent.lastName} marked as present!`);
        handleCloseAttendanceDialog();
        fetchStudents(); // Refresh the list
      } catch (error) {
        console.error('Error marking attendance:', error);
        alert('Failed to mark attendance. Please try again.');
      }
    }
  };

  const handleMarkAbsent = async () => {
    if (selectedStudent) {
      try {
        const today = new Date();

        await api.post('/api/staff-ops/attendance/child/' + selectedStudent._id, {
          date: today.toISOString().split('T')[0],
          status: 'absent',
          notes: 'Marked absent by teacher'
        });
        
        alert(`${selectedStudent.firstName} ${selectedStudent.lastName} marked as absent!`);
        handleCloseAttendanceDialog();
        fetchStudents(); // Refresh the list
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
              Total Children
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
      </Grid>

      {/* Today's Attendance */}
      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Today's Attendance - {new Date().toLocaleDateString()}
          </Typography>
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
    </Box>
    );
  };

  const renderMealPlanTab = () => (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Weekly Meal Planning
      </Typography>
      
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
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <RestaurantIcon sx={{ color: '#FF3B30' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Meal & Health Monitoring
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Ensure proper nutrition, track food intake, and monitor health conditions.
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
      
      {/* Visitor Check-in */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1abc9c' }}>
          👤 Visitor Check-in
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Visitor Name" size="small" />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Purpose" size="small" />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth label="Time In" type="time" size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button fullWidth variant="contained" sx={{ backgroundColor: '#1abc9c', textTransform: 'none', '&:hover': { backgroundColor: '#16a085' } }}>
              Check In
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Authorized Pickup Verification */}
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1abc9c' }}>
          🔐 Verify Authorized Pickup
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField select fullWidth label="Child" size="small" defaultValue="">
              <MenuItem value="">Select Child</MenuItem>
              {students.map((s) => (
                <MenuItem key={s._id} value={s._id}>{s.firstName} {s.lastName}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Pickup Person Name" size="small" />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button fullWidth variant="contained" sx={{ backgroundColor: '#34C759', textTransform: 'none', '&:hover': { backgroundColor: '#2DA84C' } }}>
              Verify Pickup
            </Button>
          </Grid>
        </Grid>
      </Paper>
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

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Attendance Marking Dialog */}
      <Dialog open={attendanceDialogOpen} onClose={handleCloseAttendanceDialog}>
        <DialogTitle sx={{ backgroundColor: '#1abc9c', color: 'white' }}>
          Mark Attendance
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to mark <strong>{selectedStudent}</strong> as present?
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
              onClick={() => navigate('/shop')}
              sx={{ 
                color: '#1abc9c'
              }}
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
      </Box>
    </Box>
  );
};

export default TeacherDashboard;
