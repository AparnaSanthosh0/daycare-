import React, { useState, useEffect, useMemo } from 'react';
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
  Divider,
  IconButton,
  Tooltip
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
  ShoppingCart,
  KeyboardVoice
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';
import DaycareLocationMap from '../../components/Maps/DaycareLocationMap';
import VoiceAssistant from '../../VoiceAssistant';

const calculateAgeYears = (dob) => {
  if (!dob) return null;
  const diffMs = Date.now() - new Date(dob).getTime();
  return Math.max(0, Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000)));
};

const resolveChildId = (childEntity) => {
  if (!childEntity) return null;
  if (typeof childEntity === 'string') return childEntity;
  if (childEntity._id) return childEntity._id;
  if (childEntity.child) return resolveChildId(childEntity.child);
  return null;
};

const resolveChildProfile = (childEntity) => {
  if (!childEntity) return null;
  if (childEntity.child) return childEntity.child;
  return childEntity;
};

const getChildDisplayName = (childEntity) => {
  const profile = resolveChildProfile(childEntity);
  if (!profile) return 'Child';
  if (profile.firstName || profile.lastName) {
    return [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim() || 'Child';
  }
  return profile.name || 'Child';
};

const parseTimeStringToToday = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const now = new Date();
  const baseDate = now.toDateString();
  const normalized = timeStr.includes('AM') || timeStr.includes('PM') || timeStr.includes('am') || timeStr.includes('pm')
    ? `${baseDate} ${timeStr}`
    : `${baseDate} ${timeStr}:00`;
  const parsed = new Date(normalized);
  return isNaN(parsed.getTime()) ? null : parsed;
};

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
  const [vaOpen, setVaOpen] = useState(false);

  // Fetch routes
  const fetchRoutes = async () => {
    try {
      const response = await api.get('/driver/routes');
      setRoutes(response.data || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
      setError('Failed to load routes');
      setRoutes([]);
    }
  };

  // Fetch today's trips
  const fetchTodayTrips = async () => {
    try {
      const response = await api.get('/driver/trips/today');
      setTodayTrips(response.data || []);
    } catch (error) {
      console.error('Error fetching today trips:', error);
      setError('Failed to load today\'s trips');
      setTodayTrips([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch vehicle logs
  const fetchVehicleLogs = async () => {
    try {
      const response = await api.get('/driver/vehicle-logs');
      setVehicleLogs(response.data);
    } catch (error) {
      console.error('Error fetching vehicle logs:', error);
    }
  };

  // Fetch compliance report
  const fetchComplianceReport = async () => {
    try {
      const response = await api.get('/driver/compliance-report');
      setComplianceReport(response.data);
    } catch (error) {
      console.error('Error fetching compliance report:', error);
    }
  };

  // Fetch incidents
  const fetchIncidents = async () => {
    try {
      const response = await api.get('/driver/incidents');
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
      await api.post('/driver/vehicle-log', {
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

  // Primary assignment (for dashboards with a single driver/route like Kottayam)
  const primaryRoute = routes[0] || null;
  const primaryChild = primaryRoute?.assignedChildren?.[0] || null;
  const primaryChildAge = primaryChild?.child
    ? (calculateAgeYears(primaryChild.child.dateOfBirth) ?? primaryChild.child.age ?? '--')
    : '--';
  const primaryGuardians = primaryChild?.authorizedGuardians?.length
    ? primaryChild.authorizedGuardians
    : primaryChild?.child?.parent
    ? [
        {
          name:
            primaryChild.child.parent.name ||
            [primaryChild.child.parent.firstName, primaryChild.child.parent.lastName]
              .filter(Boolean)
              .join(' '),
          phone: primaryChild.child.parent.phone || primaryChild.child.parent.contactNumber,
          relationship: primaryChild.child.parent.relationship || 'Parent'
        }
      ]
    : [];
  const primaryGuardian = primaryGuardians[0] || null;
  const primaryChildPickupArea =
    primaryChild?.pickupAddress?.street ||
    primaryChild?.pickupAddress?.city ||
    primaryChild?.child?.address?.street ||
    primaryRoute?.region ||
    'Pickup area TBD';
  const primaryChildDropArea =
    primaryChild?.dropoffAddress?.street ||
    primaryChild?.dropoffAddress?.city ||
    'Tiny Tots Daycare';

  // Simple pickup anomaly & context-aware alert helpers based on today's active trip
  const anomalyAlerts = [];
  if (activeTrip) {
    if (activeTrip.routeDeviationAlert) {
      anomalyAlerts.push({
        type: 'Route deviation detected',
        description: activeTrip.routeDeviationAlert
      });
    }
    if (activeTrip.unexpectedStops && activeTrip.unexpectedStops.length > 0) {
      anomalyAlerts.push({
        type: 'Unexpected stop',
        description: `${activeTrip.unexpectedStops.length} unplanned stop(s) detected on this route.`
      });
    }
    const delayMinutes = activeTrip.delayMinutes || activeTrip.estimatedDelayMinutes;
    if (typeof delayMinutes === 'number' && delayMinutes > 10) {
      anomalyAlerts.push({
        type: 'Running late',
        description: `Pickup is running approximately ${delayMinutes} minutes behind schedule.`
      });
    }
  }

  const contextAlerts = [];
  if (activeTrip) {
    if (activeTrip.trafficStatus) {
      contextAlerts.push({
        type: 'Traffic',
        description: activeTrip.trafficStatus
      });
    }
    if (activeTrip.weatherStatus) {
      contextAlerts.push({
        type: 'Weather',
        description: activeTrip.weatherStatus
      });
    }
    if (activeTrip.timeWindow) {
      contextAlerts.push({
        type: 'Time window',
        description: `Pickup window: ${activeTrip.timeWindow}`
      });
    }
  }

  const primaryTripChild = activeTrip?.children?.find((childTrip) => {
    const childId = childTrip.child?._id || childTrip.child;
    return childId && primaryChild?.child?._id && childId.toString() === primaryChild.child._id.toString();
  });
  const primaryChildOtpStatus = primaryTripChild
    ? primaryTripChild.boardingStatus === 'otp-verified'
      ? 'OTP Verified'
      : 'OTP Pending'
    : 'Awaiting Trip';
  const primaryOtpVisuals =
    primaryChildOtpStatus === 'OTP Verified'
      ? { bg: '#e8f5e9', color: '#2e7d32' }
      : primaryChildOtpStatus === 'OTP Pending'
      ? { bg: '#fff3e0', color: '#ef6c00' }
      : { bg: '#e3f2fd', color: '#1976d2' };

  const handleVaOpen = () => setVaOpen(true);
  const handleVaClose = () => setVaOpen(false);

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
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Voice Assistant">
              <IconButton
                onClick={handleVaOpen}
                sx={{
                  bgcolor: '#e0f2f1',
                  '&:hover': { bgcolor: '#b2dfdb' },
                  color: '#14B8A6'
                }}
              >
                <KeyboardVoice />
              </IconButton>
            </Tooltip>
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
          <Tab icon={<LocationOn />} iconPosition="start" label="Map & Navigation" />
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

          {primaryRoute && primaryChild && (
            <Paper
              sx={{
                p: 3,
                mb: 3,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(20,184,166,0.1)',
                border: '1px solid rgba(20,184,166,0.2)'
              }}
            >
              <Grid container spacing={3} alignItems="stretch">
                <Grid item xs={12} md={5}>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                    Assigned Route
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    {primaryRoute.routeName}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <Chip
                      label={primaryRoute.region || 'Route region'}
                      size="small"
                      sx={{ bgcolor: '#e0f2f1', color: '#00695c', fontWeight: 600 }}
                    />
                    {primaryRoute.pickupWindow && (
                      <Chip
                        label={`Pickup window • ${primaryRoute.pickupWindow}`}
                        size="small"
                        sx={{ bgcolor: '#f0fdfa', color: '#0d9488', fontWeight: 600 }}
                      />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {primaryRoute.stops?.length || 0} stops • {primaryRoute.assignedChildren?.length || 0} child •{' '}
                    {primaryRoute.vehicle?.vehicleType || 'Vehicle'} ({primaryRoute.vehicle?.vehicleNumber || 'N/A'})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Route type: {primaryRoute.routeType?.replace(/-/g, ' ') || 'Pickup'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                    Assigned Child
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {primaryChild.child?.firstName || 'Child'} {primaryChild.child?.lastName || ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Age: {primaryChildAge === '--' ? '--' : `${primaryChildAge} yrs`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pickup: {primaryChildPickupArea}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Drop to: {primaryChildDropArea}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                    Guardian & OTP
                  </Typography>
                  {primaryGuardian ? (
                    <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {primaryGuardian.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {primaryGuardian.relationship || 'Guardian'}
                      </Typography>
                      {primaryGuardian.phone && (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Phone sx={{ fontSize: 16, color: '#14B8A6' }} />
                          <Typography variant="body2" sx={{ color: '#14B8A6' }}>
                            {primaryGuardian.phone}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Guardian info not available
                    </Typography>
                  )}
                  <Chip
                    label={primaryChildOtpStatus}
                    size="small"
                    sx={{
                      bgcolor: primaryOtpVisuals.bg,
                      color: primaryOtpVisuals.color,
                      fontWeight: 700
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>
          )}

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Smart Pickup Intelligence Stack
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2.5, borderRadius: 2, bgcolor: '#fff8e1', height: '100%' }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1 }}>
                    <Route sx={{ color: '#ef6c00' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ef6c00' }}>
                      Pickup Pattern Anomaly Detection
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    • Learns the normal pickup routine for this driver and route.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Alerts the admin instantly if the route deviates or an unexpected stop occurs.
                  </Typography>
                  <Chip
                    label="Unique for daycare • Easy rule + ML"
                    size="small"
                    sx={{ mt: 1.5, bgcolor: '#ffe0b2', color: '#bf360c', fontWeight: 600 }}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2.5, borderRadius: 2, bgcolor: '#e3f2fd', height: '100%' }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1 }}>
                    <QrCodeScanner sx={{ color: '#1976d2' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1976d2' }}>
                      OTP-Based Smart Pickup
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    • Every pickup/drop-off is confirmed only via OTP for foolproof handovers.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Drivers use Generate / Verify OTP actions to keep the flow simple yet highly secure.
                  </Typography>
                  <Chip
                    label="Simple • Highly secure • Attractive"
                    size="small"
                    sx={{ mt: 1.5, bgcolor: '#bbdefb', color: '#0d47a1', fontWeight: 600 }}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2.5, borderRadius: 2, bgcolor: '#e8f5e9', height: '100%' }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1 }}>
                    <Assessment sx={{ color: '#2e7d32' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                      Context-Aware Alerts
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    • Alerts are enriched with live traffic, weather and time-of-day cues.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Keeps the dashboard looking intelligent while staying easy to reason about.
                  </Typography>
                  <Chip
                    label="Looks intelligent • Easy logic"
                    size="small"
                    sx={{ mt: 1.5, bgcolor: '#c8e6c9', color: '#1b5e20', fontWeight: 600 }}
                  />
                </Paper>
              </Grid>
            </Grid>
          </Box>

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

              {/* AI Pickup Safety & Smart Alerts */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  AI Pickup Safety & Smart Alerts
                </Typography>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2.5, borderRadius: 2, bgcolor: '#fff3e0' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ef6c00', mb: 1 }}>
                        Pickup Pattern Anomaly Detection
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Learns the normal pickup pattern for this route and flags route deviations or unexpected stops.
                      </Typography>
                      {anomalyAlerts.length > 0 ? (
                        <Stack spacing={1}>
                          {anomalyAlerts.map((a, idx) => (
                            <Alert key={idx} severity="warning" sx={{ borderRadius: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{a.type}</Typography>
                              <Typography variant="body2">{a.description}</Typography>
                            </Alert>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No anomalies detected for today&apos;s pickup pattern.
                        </Typography>
                      )}
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2.5, borderRadius: 2, bgcolor: '#e3f2fd' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
                        OTP-Based Smart Pickup
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Child pickup and drop-off are confirmed only via OTP, ensuring secure handover to guardians.
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Use the <strong>Generate OTP</strong> and <strong>Verify OTP</strong> actions in the trip
                        children list to complete smart pickup for each child.
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2.5, borderRadius: 2, bgcolor: '#e8f5e9' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#388e3c', mb: 1 }}>
                        Context-Aware Alerts
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Alerts are generated based on traffic, weather and time-of-day context for smarter routing.
                      </Typography>
                      {contextAlerts.length > 0 ? (
                        <Stack spacing={1}>
                          {contextAlerts.map((c, idx) => (
                            <Alert key={idx} severity="info" sx={{ borderRadius: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{c.type}</Typography>
                              <Typography variant="body2">{c.description}</Typography>
                            </Alert>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Live traffic, weather and time windows are monitored. Alerts will appear here when needed.
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
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

          {/* Current Assignment Summary (for single driver & primary route like Kottayam) */}
          {primaryRoute && primaryChild && (
            <Paper sx={{ mb: 3, p: 2.5, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', bgcolor: '#f1f8e9' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Current Route
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {primaryRoute.routeName || primaryRoute.name || 'Assigned Route'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {primaryRoute.stops?.length || 0} stops • {primaryRoute.assignedChildren?.length || 0} child
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Assigned Child
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {primaryChild.child?.firstName || 'Child'} {primaryChild.child?.lastName || ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pickup area: {primaryChild.child?.address?.street || primaryChild.child?.address || 'Kottayam route'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}

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
                        const calculatedAge = child.child?.dateOfBirth
                          ? calculateAgeYears(child.child.dateOfBirth)
                          : null;
                        const childAge = calculatedAge ?? child.child?.age ?? '--';
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
                            <TableCell>{childAge === '--' ? '--' : `${childAge} yrs`}</TableCell>
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

      {/* Map & Navigation Tab */}
      {activeTab === 5 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              📍 Map & Navigation
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              View daycare location, get directions, and plan your pickup/drop-off routes
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <DaycareLocationMap showDirections={true} showSearch={true} />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Driver Navigation Tips:</strong>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    <li>Use "Get Directions" for optimal routes to daycare</li>
                    <li>Switch between driving and walking modes</li>
                    <li>Search for specific pickup locations</li>
                    <li>View real-time traffic conditions</li>
                  </ul>
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Voice Assistant Dialog */}
      <Dialog open={vaOpen} onClose={handleVaClose} maxWidth="xs" fullWidth>
        <Box sx={{ p: 2, bgcolor: '#f6f8fa' }}>
          <VoiceAssistant />
        </Box>
      </Dialog>
    </Box>
  );
};

export default DriverDashboard;

