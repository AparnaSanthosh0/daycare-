import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider
} from '@mui/material';
import {
  DirectionsCar,
  QrCodeScanner,
  Assessment,
  Add,
  LocationOn,
  Warning,
  People,
  Route,
  Phone,
  Logout,
  GpsFixed,
  ShoppingCart
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';

const DriverDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Driver dashboard component
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [routes, setRoutes] = useState([]);
  const [todayTrips, setTodayTrips] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTrip] = useState(null);
  const [tripDialog, setTripDialog] = useState({ open: false, trip: null });
  const [otpDialog, setOtpDialog] = useState({ open: false, trip: null, child: null, action: '' });
  const [otpCode, setOtpCode] = useState('');
  const [otpGenerated, setOtpGenerated] = useState('');
  const [locationTracking, setLocationTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [vehicleLogs, setVehicleLogs] = useState([]);
  const [complianceReport, setComplianceReport] = useState(null);
  const [incidentDialog, setIncidentDialog] = useState({ open: false, trip: null });
  const [vehicleIssueDialog, setVehicleIssueDialog] = useState({ open: false, trip: null });
  const [vehicleLogDialog, setVehicleLogDialog] = useState({ open: false });
  const [incidentForm, setIncidentForm] = useState({ type: '', description: '' });
  const [vehicleIssueForm, setVehicleIssueForm] = useState({ issueType: '', description: '', severity: 'medium' });
  const [vehicleLogForm, setVehicleLogForm] = useState({ date: '', startMileage: '', endMileage: '', fuelLevel: 'full', maintenanceIssues: '', driverNotes: '' });
  const [incidents, setIncidents] = useState([]);

  // Fetch routes
  const fetchRoutes = async () => {
    try {
      const response = await api.get('/api/driver/routes');
      setRoutes(response.data);
    } catch (error) {
      console.error('Error fetching routes:', error);
      setError('Failed to load routes');
    }
  };

  // Fetch today's trips
  const fetchTodayTrips = async () => {
    try {
      const response = await api.get('/api/driver/trips/today');
      setTodayTrips(response.data);
    } catch (error) {
      console.error('Error fetching today trips:', error);
      setError('Failed to load today\'s trips');
    } finally {
      setLoading(false);
    }
  };

  // Fetch vehicle logs
  const fetchVehicleLogs = async () => {
    try {
      const response = await api.get('/api/driver/vehicle-logs');
      setVehicleLogs(response.data);
    } catch (error) {
      console.error('Error fetching vehicle logs:', error);
    }
  };

  // Fetch compliance report
  const fetchComplianceReport = async () => {
    try {
      const response = await api.get('/api/driver/compliance-report');
      setComplianceReport(response.data);
    } catch (error) {
      console.error('Error fetching compliance report:', error);
    }
  };

  // Fetch incidents
  const fetchIncidents = async () => {
    try {
      const response = await api.get('/api/driver/incidents');
      setIncidents(response.data || []);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    }
  };

  useEffect(() => {
    fetchRoutes();
    fetchTodayTrips();
    fetchVehicleLogs();
    fetchComplianceReport();
    fetchIncidents();
  }, []);

  // Start location tracking
  useEffect(() => {
    if (locationTracking && selectedTrip) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed || 0,
            heading: position.coords.heading || 0
          };
          setCurrentLocation(location);
          
          // Send location to server
          if (selectedTrip) {
            api.post(`/api/driver/trips/${selectedTrip._id}/location`, location).catch(err => {
              console.error('Error updating location:', err);
            });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Failed to get location. Please enable location services.');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [locationTracking, selectedTrip]);

  // Generate OTP
  const handleGenerateOTP = async (trip, child, action) => {
    try {
      const response = await api.post(`/api/driver/trips/${trip._id}/children/${child._id}/generate-otp`);
      setOtpGenerated(response.data.otp);
      setOtpDialog({ open: true, trip, child, action });
      setSuccess('OTP generated. Share with parent/guardian.');
    } catch (error) {
      setError('Failed to generate OTP');
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    try {
      await api.post(`/api/driver/trips/${otpDialog.trip._id}/children/${otpDialog.child._id}/verify-otp`, {
        otp: otpCode,
        action: otpDialog.action
      });
      setSuccess(`${otpDialog.action === 'board' ? 'Boarding' : 'Deboarding'} confirmed`);
      setOtpDialog({ open: false, trip: null, child: null, action: '' });
      setOtpCode('');
      setOtpGenerated('');
      fetchTodayTrips();
    } catch (error) {
      setError('Invalid or expired OTP');
    }
  };

  // Report incident
  const handleReportIncident = async () => {
    try {
      await api.post(`/api/driver/trips/${incidentDialog.trip._id}/incidents`, {
        type: incidentForm.type,
        description: incidentForm.description
      });
      setSuccess('Incident reported successfully');
      setIncidentDialog({ open: false, trip: null });
      setIncidentForm({ type: '', description: '' });
      fetchTodayTrips();
    } catch (error) {
      setError('Failed to report incident');
    }
  };

  // Report vehicle issue
  const handleReportVehicleIssue = async () => {
    try {
      await api.post(`/api/driver/trips/${vehicleIssueDialog.trip._id}/vehicle-issues`, {
        issueType: vehicleIssueForm.issueType,
        description: vehicleIssueForm.description,
        severity: vehicleIssueForm.severity
      });
      setSuccess('Vehicle issue reported successfully');
      setVehicleIssueDialog({ open: false, trip: null });
      setVehicleIssueForm({ issueType: '', description: '', severity: 'medium' });
      fetchTodayTrips();
    } catch (error) {
      setError('Failed to report vehicle issue');
    }
  };

  // Add vehicle log
  const handleAddVehicleLog = async () => {
    try {
      await api.post('/api/driver/vehicle-log', {
        ...vehicleLogForm,
        maintenanceIssues: vehicleLogForm.maintenanceIssues.split(',').map(s => s.trim()).filter(s => s)
      });
      setSuccess('Vehicle log entry added successfully');
      setVehicleLogDialog({ open: false });
      setVehicleLogForm({ date: '', startMileage: '', endMileage: '', fuelLevel: 'full', maintenanceIssues: '', driverNotes: '' });
      fetchVehicleLogs();
    } catch (error) {
      setError('Failed to add vehicle log entry');
    }
  };

  const totalRoutes = routes.length;
  const totalChildren = routes.reduce((sum, route) => sum + (route.assignedChildren?.length || 0), 0);
  const totalStops = routes.reduce((sum, route) => sum + (route.stops?.length || 0), 0);
  const onTimeRate =
    complianceReport && complianceReport.totalTrips
      ? Math.round(((complianceReport.onTimeTrips || 0) / Math.max(1, complianceReport.totalTrips)) * 100)
      : complianceReport?.onTimeRate || complianceReport?.onTimePercentage || null;

  const activeTrip =
    todayTrips.find((t) => t.status === 'in-progress') || todayTrips.find((t) => t.status === 'scheduled') || null;

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ bgcolor: '#e8f5e9', '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' } }} />
        <Typography sx={{ mt: 2 }}>Loading dashboard...</Typography>
      </Box>
    );
  }

  const driverName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user?.name || 'Driver';
  
  const vehicleNumber = user?.staff?.vehicleNumber || user?.vehicleNumber || '#2';

  return (
    <Box sx={{ bgcolor: '#fafafa', minHeight: '100vh', p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#14B8A6', mb: 0.5 }}>
              Driver Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {driverName} - Bus {vehicleNumber}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<ShoppingCart />}
              onClick={() => navigate('/shop')}
              sx={{
                bgcolor: '#14B8A6',
                '&:hover': { bgcolor: '#0d9488' },
                textTransform: 'none',
                fontWeight: 600,
                px: 3
              }}
            >
              Shop
            </Button>
            <Button
              variant="contained"
              startIcon={<Warning />}
              onClick={() => setIncidentDialog({ open: true, trip: activeTrip })}
              sx={{
                bgcolor: '#d32f2f',
                '&:hover': { bgcolor: '#c62828' },
                textTransform: 'none',
                fontWeight: 600,
                px: 3
              }}
            >
              Report Incident
            </Button>
            <Button
              variant="contained"
              startIcon={<GpsFixed />}
              onClick={() => {
                setLocationTracking(!locationTracking);
                if (!locationTracking) {
                  setSuccess('Location sharing started');
                } else {
                  setSuccess('Location sharing stopped');
                }
              }}
              sx={{
                bgcolor: '#14B8A6',
                '&:hover': { bgcolor: '#0d9488' },
                textTransform: 'none',
                fontWeight: 600,
                px: 3
              }}
            >
              {locationTracking ? 'Stop Sharing' : 'Share Location'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Logout />}
              onClick={() => {
                logout();
                navigate('/');
              }}
              sx={{
                textTransform: 'none',
                borderColor: '#9e9e9e',
                color: '#616161',
                '&:hover': { borderColor: '#757575', bgcolor: 'rgba(0,0,0,0.04)' }
              }}
            >
              Logout
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.95rem',
              minHeight: 56,
              color: '#757575',
              '&.Mui-selected': {
                color: '#14B8A6',
                fontWeight: 600
              }
            },
            '& .MuiTabs-indicator': {
              height: 3,
              bgcolor: '#14B8A6'
            }
          }}
        >
          <Tab icon={<Route />} iconPosition="start" label="Routes" />
          <Tab icon={<DirectionsCar />} iconPosition="start" label="Active Route" />
          <Tab icon={<People />} iconPosition="start" label="Assigned Children" />
          <Tab icon={<Warning />} iconPosition="start" label="Incidents" />
          <Tab icon={<Assessment />} iconPosition="start" label="Vehicle Info" />
        </Tabs>
      </Box>

      {/* Tab 0: Routes overview + Today's schedule */}
      {activeTab === 0 && (
        <Box>
          {/* Stats Cards */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', bgcolor: '#fff' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Today's Routes
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#14B8A6' }}>
                  {totalRoutes}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', bgcolor: '#fff' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Total Children
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#2196f3' }}>
                  {totalChildren}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', bgcolor: '#fff' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Total Stops
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#9c27b0' }}>
                  {totalStops}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', bgcolor: '#fff' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  On-Time Rate
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#4caf50' }}>
                  {onTimeRate != null ? `${onTimeRate}%` : '--'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Today's Schedule */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
            Today's Schedule - {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </Typography>

          {todayTrips.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography color="text.secondary">No trips scheduled for today</Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {todayTrips.map((trip) => {
                const statusLabel =
                  trip.status === 'completed'
                    ? 'Completed'
                    : trip.status === 'in-progress'
                    ? 'In Progress'
                    : 'Scheduled';
                const statusColor =
                  trip.status === 'completed'
                    ? '#e8f5e9'
                    : trip.status === 'in-progress'
                    ? '#e3f2fd'
                    : '#f5f5f5';
                const statusTextColor =
                  trip.status === 'completed'
                    ? '#4caf50'
                    : trip.status === 'in-progress'
                    ? '#2196f3'
                    : '#757575';

                return (
                  <Paper 
                    key={trip._id} 
                    sx={{ 
                      p: 2.5, 
                      borderRadius: 2, 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      border: trip.status === 'in-progress' ? '2px solid #2196f3' : 'none'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {trip.routeName || trip.route?.routeName || 'Route'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {trip.stops?.length || 0} stops • {trip.children?.length || trip.assignedChildren?.length || 0} children
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {trip.scheduledTime || trip.startTime || 'Not scheduled'}
                        </Typography>
                        <Chip 
                          label={statusLabel} 
                          sx={{ 
                            bgcolor: statusColor,
                            color: statusTextColor,
                            fontWeight: 600
                          }} 
                          size="small" 
                        />
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* Tab 1: Active Route */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Active Route
            </Typography>
            {activeTrip && activeTrip.status === 'in-progress' && (
              <Chip 
                icon={<DirectionsCar />}
                label="In Progress" 
                sx={{ 
                  bgcolor: '#e3f2fd',
                  color: '#2196f3',
                  fontWeight: 600
                }} 
              />
            )}
          </Box>

          {activeTrip ? (
            <>
              {/* Active Route Card */}
              <Paper
                sx={{
                  p: 4,
                  mb: 3,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #14B8A6 0%, #0d9488 100%)',
                  color: 'white',
                  boxShadow: '0 4px 20px rgba(20,184,166,0.3)'
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                  {activeTrip.routeName || activeTrip.route?.routeName || 'Active Route'}
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>Started</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {activeTrip.actualStartTime || activeTrip.startTime || activeTrip.scheduledTime || '--'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>Est. Completion</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {activeTrip.estimatedEndTime || activeTrip.endTime || '--'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ opacity: 0.9, mb: 1.5 }}>
                      Route Progress
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={
                        activeTrip.stops?.length
                          ? Math.min(100, ((activeTrip.completedStops || 0) / activeTrip.stops.length) * 100)
                          : 0
                      }
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#fff',
                          borderRadius: 5
                        }
                      }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {activeTrip.completedStops || 0} of {activeTrip.stops?.length || activeTrip.totalStops || 0} stops
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Current Stop */}
              {activeTrip.stops && activeTrip.stops.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Current Stop
                    </Typography>
                    <Chip 
                      label={`Stop ${(activeTrip.completedStops || 0) + 1}`} 
                      sx={{ 
                        bgcolor: '#e8f5e9',
                        color: '#4caf50',
                        fontWeight: 600
                      }} 
                    />
                  </Box>

                  <Paper sx={{ p: 3, borderRadius: 2, bgcolor: '#f5f5f5' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <LocationOn sx={{ color: '#2196f3', fontSize: 40 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {activeTrip.stops[activeTrip.completedStops || 0]?.name || 'Stop'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Arriving in {activeTrip.stops[activeTrip.completedStops || 0]?.eta || '2 minutes'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Box>
              )}
            </>
          ) : (
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
              <DirectionsCar sx={{ fontSize: 60, color: '#bdbdbd', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Active Route
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start a trip from the Routes tab to see it here
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Tab 2: Assigned Children */}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Assigned Children
            </Typography>
            <Chip 
              label={`${routes.reduce((sum, r) => sum + (r.assignedChildren?.length || 0), 0)} Children`}
              sx={{ 
                bgcolor: '#e0f2f1',
                color: '#14B8A6',
                fontWeight: 600
              }} 
            />
          </Box>

          {routes.length > 0 && routes.some(r => r.assignedChildren?.length > 0) ? (
            <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Child Name</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Age</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Address</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Parent</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Contact</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>OTP</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {routes.map((route) =>
                      route.assignedChildren?.map((child) => {
                        const childAge = child.child?.dateOfBirth 
                          ? Math.floor((new Date() - new Date(child.child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
                          : child.child?.age || '--';
                        const parentName = child.child?.parent?.firstName && child.child?.parent?.lastName
                          ? `${child.child.parent.firstName} ${child.child.parent.lastName}`
                          : child.child?.parent?.name || 'N/A';
                        const parentPhone = child.child?.parent?.phone || child.child?.parent?.contactNumber || 'N/A';
                        const childAddress = child.child?.address?.street || child.child?.address || 'N/A';

                        return (
                          <TableRow key={child.child?._id || Math.random()} hover>
                            <TableCell sx={{ fontWeight: 500 }}>
                              {child.child?.firstName || 'Unknown'} {child.child?.lastName || ''}
                            </TableCell>
                            <TableCell>{childAge} yrs</TableCell>
                            <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {childAddress}
                            </TableCell>
                            <TableCell>{parentName}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Phone sx={{ fontSize: 16, color: '#2196f3' }} />
                                <Typography variant="body2" sx={{ color: '#2196f3' }}>
                                  {parentPhone}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={child.otp || Math.floor(1000 + Math.random() * 9000)}
                                sx={{ 
                                  bgcolor: '#e0f2f1',
                                  color: '#14B8A6',
                                  fontWeight: 700,
                                  fontFamily: 'monospace',
                                  fontSize: '0.95rem'
                                }} 
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Safety Protocols */}
              <Box sx={{ p: 3, bgcolor: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Safety Protocols
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2.5, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2', mb: 1 }}>
                        OTP Verification
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Always verify OTP before pickup and drop-off
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2.5, bgcolor: '#e8f5e9', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#388e3c', mb: 1 }}>
                        Guardian Authorization
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Only release child to authorized guardians
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          ) : (
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
              <People sx={{ fontSize: 60, color: '#bdbdbd', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Assigned Children
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Children will appear here once assigned to your routes
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Tab 4: Vehicle Info */}
      {activeTab === 4 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Vehicle Information
          </Typography>

          {/* Vehicle Details Card */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  Vehicle Details
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Bus Number</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      #{vehicleNumber}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Vehicle Type</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {user?.staff?.vehicleType || 'School Bus'}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="text.secondary">License Plate</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {user?.staff?.licensePlate || 'N/A'}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                  Driver Information
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Driver Name</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {driverName}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="text.secondary">License Number</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {user?.staff?.licenseNumber || 'N/A'}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="text.secondary">Contact</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {user?.phone || user?.email || 'N/A'}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* Vehicle Logs */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Vehicle Logs
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setVehicleLogForm({ ...vehicleLogForm, date: today });
                setVehicleLogDialog({ open: true });
              }}
              sx={{
                bgcolor: '#4caf50',
                '&:hover': { bgcolor: '#388e3c' },
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Add Log Entry
            </Button>
          </Box>

          {vehicleLogs.length > 0 ? (
            <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Start Mileage</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>End Mileage</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Distance</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Fuel Level</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vehicleLogs.map((log, index) => (
                      <TableRow key={log._id || index} hover>
                        <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                        <TableCell>{log.startMileage}</TableCell>
                        <TableCell>{log.endMileage}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{log.endMileage - log.startMileage} km</TableCell>
                        <TableCell>
                          <Chip 
                            label={log.fuelLevel} 
                            size="small"
                            sx={{
                              bgcolor: log.fuelLevel === 'full' ? '#e8f5e9' :
                                      log.fuelLevel === 'half' ? '#e0f2f1' : '#ffebee',
                              color: log.fuelLevel === 'full' ? '#4caf50' :
                                    log.fuelLevel === 'half' ? '#14B8A6' : '#f44336',
                              fontWeight: 600,
                              textTransform: 'capitalize'
                            }}
                          />
                        </TableCell>
                        <TableCell>{log.driverNotes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : (
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
              <Assessment sx={{ fontSize: 60, color: '#bdbdbd', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Vehicle Logs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start adding vehicle logs to track maintenance and usage
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Tab 3: Incidents */}
      {activeTab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Incident Reports
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setIncidentDialog({ open: true, trip: activeTrip })}
              sx={{
                bgcolor: '#d32f2f',
                '&:hover': { bgcolor: '#c62828' },
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Report New Incident
            </Button>
          </Box>

          {incidents.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {incidents.map((incident, index) => {
                const severityColor = 
                  incident.severity === 'high' ? '#f44336' :
                  incident.severity === 'medium' ? '#ff9800' :
                  '#ffc107';
                const severityBg =
                  incident.severity === 'high' ? '#ffebee' :
                  incident.severity === 'medium' ? '#fff3e0' :
                  '#fff8e1';
                const statusColor =
                  incident.status === 'resolved' ? '#4caf50' :
                  incident.status === 'investigating' ? '#2196f3' :
                  '#ff9800';
                const statusBg =
                  incident.status === 'resolved' ? '#e8f5e9' :
                  incident.status === 'investigating' ? '#e3f2fd' :
                  '#fff3e0';

                return (
                  <Paper key={incident._id || index} sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip 
                            label={(incident.severity || 'Low') + ' Severity'}
                            sx={{ 
                              bgcolor: severityBg,
                              color: severityColor,
                              fontWeight: 600,
                              textTransform: 'capitalize'
                            }} 
                            size="small"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {incident.date ? new Date(incident.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            }) : 'Recent'}
                          </Typography>
                          <Chip 
                            label={(incident.status || 'Pending')}
                            sx={{ 
                              bgcolor: statusBg,
                              color: statusColor,
                              fontWeight: 600,
                              textTransform: 'capitalize'
                            }} 
                            size="small"
                          />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          {incident.type || incident.incidentType || 'Incident'}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {incident.description || 'No description provided'}
                    </Typography>
                  </Paper>
                );
              })}
            </Box>
          ) : (
            <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
              <Warning sx={{ fontSize: 60, color: '#bdbdbd', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Incidents Reported
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All clear! No incidents have been reported
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Trip Details Dialog */}
      <Dialog
        open={tripDialog.open}
        onClose={() => {
          setTripDialog({ open: false, trip: null });
          setLocationTracking(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Trip Details - {tripDialog.trip?.routeName}
          {locationTracking && (
            <Chip label="Tracking Active" color="success" size="small" sx={{ ml: 2 }} />
          )}
        </DialogTitle>
        <DialogContent>
          {tripDialog.trip && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Type: {tripDialog.trip.tripType} | Scheduled: {tripDialog.trip.scheduledTime}
              </Typography>
              {currentLocation && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Current Location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </Alert>
              )}
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Children:</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Boarding Status</TableCell>
                      <TableCell>Deboarding Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tripDialog.trip.children?.map((childTrip) => (
                      <TableRow key={childTrip.child?._id || childTrip.child}>
                        <TableCell>
                          {childTrip.child?.firstName || 'Unknown'} {childTrip.child?.lastName || ''}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={childTrip.boardingStatus || 'pending'}
                            size="small"
                            color={childTrip.boardingStatus === 'otp-verified' ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={childTrip.deboardingStatus || 'pending'}
                            size="small"
                            color={childTrip.deboardingStatus === 'otp-verified' ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          {tripDialog.trip.tripType === 'pickup' && childTrip.boardingStatus !== 'otp-verified' && (
                            <Button
                              size="small"
                              startIcon={<QrCodeScanner />}
                              onClick={() => handleGenerateOTP(tripDialog.trip, childTrip.child || childTrip.child, 'board')}
                            >
                              Generate OTP
                            </Button>
                          )}
                          {tripDialog.trip.tripType === 'dropoff' && childTrip.deboardingStatus !== 'otp-verified' && (
                            <Button
                              size="small"
                              startIcon={<QrCodeScanner />}
                              onClick={() => handleGenerateOTP(tripDialog.trip, childTrip.child || childTrip.child, 'deboard')}
                            >
                              Generate OTP
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTripDialog({ open: false, trip: null });
            setLocationTracking(false);
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* OTP Verification Dialog */}
      <Dialog
        open={otpDialog.open}
        onClose={() => {
          setOtpDialog({ open: false, trip: null, child: null, action: '' });
          setOtpCode('');
          setOtpGenerated('');
        }}
      >
        <DialogTitle>OTP Verification</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {otpGenerated && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Generated OTP: <strong>{otpGenerated}</strong> (Share with parent/guardian)
              </Alert>
            )}
            <TextField
              fullWidth
              label="Enter OTP"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOtpDialog({ open: false, trip: null, child: null, action: '' });
            setOtpCode('');
            setOtpGenerated('');
          }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleVerifyOTP}>
            Verify
          </Button>
        </DialogActions>
      </Dialog>

      {/* Incident Report Dialog */}
      <Dialog
        open={incidentDialog.open}
        onClose={() => {
          setIncidentDialog({ open: false, trip: null });
          setIncidentForm({ type: '', description: '' });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Report Incident</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Incident Type</InputLabel>
              <Select
                value={incidentForm.type}
                onChange={(e) => setIncidentForm({ ...incidentForm, type: e.target.value })}
                label="Incident Type"
              >
                <MenuItem value="delay">Delay</MenuItem>
                <MenuItem value="accident">Accident</MenuItem>
                <MenuItem value="breakdown">Breakdown</MenuItem>
                <MenuItem value="traffic">Traffic</MenuItem>
                <MenuItem value="weather">Weather</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={incidentForm.description}
              onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
              placeholder="Describe the incident in detail..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIncidentDialog({ open: false, trip: null });
            setIncidentForm({ type: '', description: '' });
          }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleReportIncident} disabled={!incidentForm.type || !incidentForm.description}>
            Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Vehicle Issue Dialog */}
      <Dialog
        open={vehicleIssueDialog.open}
        onClose={() => {
          setVehicleIssueDialog({ open: false, trip: null });
          setVehicleIssueForm({ issueType: '', description: '', severity: 'medium' });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Report Vehicle Issue</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Issue Type"
              value={vehicleIssueForm.issueType}
              onChange={(e) => setVehicleIssueForm({ ...vehicleIssueForm, issueType: e.target.value })}
              sx={{ mb: 2 }}
              placeholder="e.g., Engine problem, Tire issue, etc."
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                value={vehicleIssueForm.severity}
                onChange={(e) => setVehicleIssueForm({ ...vehicleIssueForm, severity: e.target.value })}
                label="Severity"
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={vehicleIssueForm.description}
              onChange={(e) => setVehicleIssueForm({ ...vehicleIssueForm, description: e.target.value })}
              placeholder="Describe the vehicle issue in detail..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setVehicleIssueDialog({ open: false, trip: null });
            setVehicleIssueForm({ issueType: '', description: '', severity: 'medium' });
          }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleReportVehicleIssue} disabled={!vehicleIssueForm.issueType || !vehicleIssueForm.description}>
            Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Vehicle Log Entry Dialog */}
      <Dialog
        open={vehicleLogDialog.open}
        onClose={() => {
          setVehicleLogDialog({ open: false });
          setVehicleLogForm({ date: '', startMileage: '', endMileage: '', fuelLevel: 'full', maintenanceIssues: '', driverNotes: '' });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Vehicle Log Entry</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              type="date"
              label="Date"
              value={vehicleLogForm.date}
              onChange={(e) => setVehicleLogForm({ ...vehicleLogForm, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              type="number"
              label="Start Mileage"
              value={vehicleLogForm.startMileage}
              onChange={(e) => setVehicleLogForm({ ...vehicleLogForm, startMileage: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              type="number"
              label="End Mileage"
              value={vehicleLogForm.endMileage}
              onChange={(e) => setVehicleLogForm({ ...vehicleLogForm, endMileage: e.target.value })}
              sx={{ mb: 2 }}
              required
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Fuel Level</InputLabel>
              <Select
                value={vehicleLogForm.fuelLevel}
                onChange={(e) => setVehicleLogForm({ ...vehicleLogForm, fuelLevel: e.target.value })}
                label="Fuel Level"
              >
                <MenuItem value="full">Full</MenuItem>
                <MenuItem value="three-quarter">Three Quarter</MenuItem>
                <MenuItem value="half">Half</MenuItem>
                <MenuItem value="quarter">Quarter</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="empty">Empty</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Maintenance Issues (comma-separated)"
              value={vehicleLogForm.maintenanceIssues}
              onChange={(e) => setVehicleLogForm({ ...vehicleLogForm, maintenanceIssues: e.target.value })}
              sx={{ mb: 2 }}
              placeholder="e.g., Oil change needed, Tire pressure low"
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Driver Notes"
              value={vehicleLogForm.driverNotes}
              onChange={(e) => setVehicleLogForm({ ...vehicleLogForm, driverNotes: e.target.value })}
              placeholder="Any additional notes..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setVehicleLogDialog({ open: false });
            setVehicleLogForm({ date: '', startMileage: '', endMileage: '', fuelLevel: 'full', maintenanceIssues: '', driverNotes: '' });
          }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddVehicleLog} disabled={!vehicleLogForm.date || !vehicleLogForm.startMileage || !vehicleLogForm.endMileage}>
            Add Entry
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DriverDashboard;

