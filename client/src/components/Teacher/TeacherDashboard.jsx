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
  Avatar,
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
  ListItemButton
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
  EventNote as EventNoteIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
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
  const [feedbackText, setFeedbackText] = useState('');
  const [serviceCategory, setServiceCategory] = useState('Meal & Nutrition');
  const [rating, setRating] = useState(5);
  const [classificationResult, setClassificationResult] = useState(null);
  
  const [todayStats, setTodayStats] = useState({
    checkIns: 0,
    checkOuts: 0,
    present: 0,
    absent: 0
  });

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

  const serviceCategories = [
    'Meal & Nutrition',
    'Safety & Security',
    'Learning Activities',
    'Health & Hygiene',
    'Communication',
    'Facilities'
  ];

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const handleRefresh = () => {
    // Refresh data logic
    console.log('Refreshing data...');
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

  const renderAttendanceTab = () => (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Total Children
            </Typography>
            <Typography variant="h4" sx={{ color: '#5856D6', fontWeight: 600 }}>
              18
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Present Today
            </Typography>
            <Typography variant="h4" sx={{ color: '#34C759', fontWeight: 600 }}>
              16
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Absent
            </Typography>
            <Typography variant="h4" sx={{ color: '#FF3B30', fontWeight: 600 }}>
              2
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Attendance Rate
            </Typography>
            <Typography variant="h4" sx={{ color: '#5856D6', fontWeight: 600 }}>
              89%
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Today's Attendance */}
      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Today's Attendance - December 8, 2025
          </Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 900, p: 3 }}>
            <Grid container sx={{ mb: 2, pb: 2, borderBottom: '2px solid #f5f5f5' }}>
              <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Child Name</Typography></Grid>
              <Grid item xs={1.5}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Age</Typography></Grid>
              <Grid item xs={1.5}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Status</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Check-in Time</Typography></Grid>
              <Grid item xs={1}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Mood</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Parent</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2" sx={{ fontWeight: 600, color: '#666' }}>Actions</Typography></Grid>
            </Grid>

            {/* Row 1 */}
            <Grid container sx={{ py: 2, borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
              <Grid item xs={2}><Typography variant="body2">Emma Wilson</Typography></Grid>
              <Grid item xs={1.5}><Typography variant="body2">3 years</Typography></Grid>
              <Grid item xs={1.5}>
                <Chip label="Present" size="small" sx={{ backgroundColor: '#E8F5E9', color: '#2E7D32', fontWeight: 500 }} />
              </Grid>
              <Grid item xs={2}><Typography variant="body2">8:30 AM</Typography></Grid>
              <Grid item xs={1}><Typography variant="h6">😊</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2">Jane Wilson</Typography></Grid>
              <Grid item xs={2}>
                <Button size="small" sx={{ color: '#5856D6', textTransform: 'none', fontWeight: 500 }}>Add Note</Button>
              </Grid>
            </Grid>

            {/* Row 2 */}
            <Grid container sx={{ py: 2, borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
              <Grid item xs={2}><Typography variant="body2">Noah Smith</Typography></Grid>
              <Grid item xs={1.5}><Typography variant="body2">4 years</Typography></Grid>
              <Grid item xs={1.5}>
                <Chip label="Present" size="small" sx={{ backgroundColor: '#E8F5E9', color: '#2E7D32', fontWeight: 500 }} />
              </Grid>
              <Grid item xs={2}><Typography variant="body2">8:45 AM</Typography></Grid>
              <Grid item xs={1}><Typography variant="h6">😁</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2">John Smith</Typography></Grid>
              <Grid item xs={2}>
                <Button size="small" sx={{ color: '#5856D6', textTransform: 'none', fontWeight: 500 }}>Add Note</Button>
              </Grid>
            </Grid>

            {/* Row 3 */}
            <Grid container sx={{ py: 2, borderBottom: '1px solid #f5f5f5', alignItems: 'center' }}>
              <Grid item xs={2}><Typography variant="body2">Olivia Brown</Typography></Grid>
              <Grid item xs={1.5}><Typography variant="body2">2 years</Typography></Grid>
              <Grid item xs={1.5}>
                <Chip label="Absent" size="small" sx={{ backgroundColor: '#FFEBEE', color: '#C62828', fontWeight: 500 }} />
              </Grid>
              <Grid item xs={2}><Typography variant="body2">-</Typography></Grid>
              <Grid item xs={1}><Typography variant="body2">-</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2">Sarah Brown</Typography></Grid>
              <Grid item xs={2}>
                <Button size="small" sx={{ color: '#5856D6', textTransform: 'none', fontWeight: 500 }}>Mark Present</Button>
              </Grid>
            </Grid>

            {/* Row 4 */}
            <Grid container sx={{ py: 2, alignItems: 'center' }}>
              <Grid item xs={2}><Typography variant="body2">Liam Davis</Typography></Grid>
              <Grid item xs={1.5}><Typography variant="body2">5 years</Typography></Grid>
              <Grid item xs={1.5}>
                <Chip label="Present" size="small" sx={{ backgroundColor: '#E8F5E9', color: '#2E7D32', fontWeight: 500 }} />
              </Grid>
              <Grid item xs={2}><Typography variant="body2">9:00 AM</Typography></Grid>
              <Grid item xs={1}><Typography variant="h6">😊</Typography></Grid>
              <Grid item xs={2}><Typography variant="body2">Mike Davis</Typography></Grid>
              <Grid item xs={2}>
                <Button size="small" sx={{ color: '#5856D6', textTransform: 'none', fontWeight: 500 }}>Add Note</Button>
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
          <SchoolIcon sx={{ color: '#FFB800' }} />
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
                <Typography variant="h6" sx={{ color: '#5856D6', fontWeight: 600, mb: 1 }}>
                  Learning Activities
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Plan and conduct educational sessions
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  sx={{
                    backgroundColor: '#5856D6',
                    color: '#ffffff',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { backgroundColor: '#4745B8' }
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
                <Typography variant="h6" sx={{ color: '#5856D6', fontWeight: 600, mb: 1 }}>
                  Progress Tracking
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Record learning milestones and achievements
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#5856D6',
                    color: '#5856D6',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#4745B8',
                      backgroundColor: 'rgba(88, 86, 214, 0.04)'
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
                <Typography variant="h6" sx={{ color: '#007AFF', fontWeight: 600, mb: 1 }}>
                  Special Events
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Organize games and special activities
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#5856D6',
                    color: '#5856D6',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#4745B8',
                      backgroundColor: 'rgba(88, 86, 214, 0.04)'
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
                <Typography variant="h6" sx={{ color: '#FF2D55', fontWeight: 600, mb: 1 }}>
                  Participation
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Track attendance in activities
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#5856D6',
                    color: '#5856D6',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#4745B8',
                      backgroundColor: 'rgba(88, 86, 214, 0.04)'
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
                <Typography variant="h6" sx={{ color: '#5856D6', fontWeight: 600, mb: 1 }}>
                  Safety Check
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Ensure all children are safe and accounted for
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#5856D6',
                    color: '#5856D6',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#4745B8',
                      backgroundColor: 'rgba(88, 86, 214, 0.04)'
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
                <Typography variant="h6" sx={{ color: '#5856D6', fontWeight: 600, mb: 1 }}>
                  Hygiene Monitor
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Track hand washing, bathroom breaks, and cleanliness
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#5856D6',
                    color: '#5856D6',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#4745B8',
                      backgroundColor: 'rgba(88, 86, 214, 0.04)'
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
                <Typography variant="h6" sx={{ color: '#FF9500', fontWeight: 600, mb: 1 }}>
                  Health Alerts
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Report unusual behavior, illness, or injuries
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#5856D6',
                    color: '#5856D6',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#4745B8',
                      backgroundColor: 'rgba(88, 86, 214, 0.04)'
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
                <Typography variant="h6" sx={{ color: '#5856D6', fontWeight: 600, mb: 1 }}>
                  Meal Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Ensure children receive correct meals according to plan
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#5856D6',
                    color: '#5856D6',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#4745B8',
                      backgroundColor: 'rgba(88, 86, 214, 0.04)'
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
                <Typography variant="h6" sx={{ color: '#FF9500', fontWeight: 600, mb: 1 }}>
                  Allergy Tracking
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Monitor food allergies and dietary restrictions
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#5856D6',
                    color: '#5856D6',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#4745B8',
                      backgroundColor: 'rgba(88, 86, 214, 0.04)'
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
                <Typography variant="h6" sx={{ color: '#FF3B30', fontWeight: 600, mb: 1 }}>
                  Health Records
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Record minor health issues and first aid
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    borderColor: '#5856D6',
                    color: '#5856D6',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { 
                      borderColor: '#4745B8',
                      backgroundColor: 'rgba(88, 86, 214, 0.04)'
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

      {/* Financial Section */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Financial Summary
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2, backgroundColor: '#e8f5e9' }}>
              <Typography variant="body2" color="text.secondary">Gross Salary</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#2e7d32' }}>$25,000</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2, backgroundColor: '#fff3e0' }}>
              <Typography variant="body2" color="text.secondary">Total Deductions</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#ef6c00' }}>$3,500</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 2, backgroundColor: '#e3f2fd' }}>
              <Typography variant="body2" color="text.secondary">Net Salary</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1565c0' }}>$21,500</Typography>
            </Card>
          </Grid>
        </Grid>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Staff ID</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Position</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Gross</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Deductions</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Net</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={{ padding: '12px' }}>ST001</td>
                <td style={{ padding: '12px' }}>Sarah Johnson</td>
                <td style={{ padding: '12px' }}>Teacher</td>
                <td style={{ padding: '12px' }}>$3,500</td>
                <td style={{ padding: '12px' }}>$500</td>
                <td style={{ padding: '12px' }}>$3,000</td>
              </tr>
            </tbody>
          </table>
        </Box>
      </Paper>

      {/* Staff Performance */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Staff Performance
        </Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2, backgroundColor: '#f3e5f5' }}>
              <Typography variant="body2" color="text.secondary">Average Rating</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#7b1fa2' }}>4.5/5.0</Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 2, backgroundColor: '#fce4ec' }}>
              <Typography variant="body2" color="text.secondary">Total Reviews</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#c2185b' }}>24</Typography>
            </Card>
          </Grid>
        </Grid>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Staff Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Rating</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Reviews</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Performance</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={{ padding: '12px' }}>Sarah Johnson</td>
                <td style={{ padding: '12px' }}>4.8</td>
                <td style={{ padding: '12px' }}>12</td>
                <td style={{ padding: '12px' }}>
                  <Chip label="Excellent" size="small" sx={{ backgroundColor: '#34C759', color: 'white' }} />
                </td>
              </tr>
            </tbody>
          </table>
        </Box>
      </Paper>

      {/* Quick Report */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Quick Report
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Report Type"
              defaultValue="Attendance"
              variant="outlined"
            >
              <MenuItem value="Attendance">Attendance</MenuItem>
              <MenuItem value="Financial">Financial</MenuItem>
              <MenuItem value="Enrollment">Enrollment</MenuItem>
              <MenuItem value="Performance">Staff Performance</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Status"
              defaultValue="All"
              variant="outlined"
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </TextField>
          </Grid>
        </Grid>
        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 2, backgroundColor: '#1abc9c', '&:hover': { backgroundColor: '#16a085' } }}
        >
          Generate Report
        </Button>
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
              Teacher Dashboard
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              {user?.name || 'Ms. Sarah'} - Toddlers Group
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
              <Typography variant="body2" color="text.secondary">
                Ms. Sarah - Toddlers Group
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <IconButton 
              sx={{ 
                color: '#1abc9c'
              }}
            >
              <ShoppingCartIcon />
            </IconButton>
            <IconButton 
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
          <Tab icon={<CalendarIcon />} iconPosition="start" label="Activities" />
          <Tab icon={<MenuBookIcon />} iconPosition="start" label="Curriculum" />
          <Tab icon={<MessageIcon />} iconPosition="start" label="Messages" />
          <Tab icon={<AssessmentIcon />} iconPosition="start" label="Reports" />
          <Tab icon={<FeedbackIcon />} iconPosition="start" label="Feedback" />
        </Tabs>
      </Paper>

      {/* Main Content */}
      <Box sx={{ p: 4 }}>
        {currentTab === 0 && renderAttendanceTab()}
        {currentTab === 1 && renderActivitiesTab()}
        {currentTab === 2 && renderCurriculumTab()}
        {currentTab === 3 && renderMessagesTab()}
        {currentTab === 4 && renderReportsTab()}
        {currentTab === 5 && renderFeedbackTab()}
      </Box>
    </Box>
  );
};

export default TeacherDashboard;
