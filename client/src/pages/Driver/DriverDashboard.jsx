import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
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
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  DirectionsCar,
  Report,
  Assignment,
  Refresh,
  QrCodeScanner,
  History,
  Assessment,
  Add
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';

const DriverDashboard = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    fetchRoutes();
    fetchTodayTrips();
    fetchVehicleLogs();
    fetchComplianceReport();
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
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
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

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Driver Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.firstName || user?.name || 'Driver'}
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              fetchRoutes();
              fetchTodayTrips();
              fetchVehicleLogs();
              fetchComplianceReport();
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
          },
          '& .MuiTabs-indicator': {
            height: 3,
          },
        }}
      >
        <Tab label="Routes" icon={<DirectionsCar />} iconPosition="start" />
        <Tab label="Active Route" icon={<Assignment />} iconPosition="start" />
        <Tab label="Assigned Children" icon={<History />} iconPosition="start" />
        <Tab label="Incidents" icon={<Report />} iconPosition="start" />
        <Tab label="Vehicle Info" icon={<Assessment />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Routes overview + Today's schedule */}
      {activeTab === 0 && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Today's Routes
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold' }}>
                  {totalRoutes}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Children
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold', color: 'primary.main' }}>
                  {totalChildren}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Total Stops
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold', color: 'secondary.main' }}>
                  {totalStops}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  On-Time Rate
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, fontWeight: 'bold', color: 'success.main' }}>
                  {onTimeRate != null ? `${onTimeRate}%` : '--'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mb: 2 }}>
            Today's Schedule - {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </Typography>

          {todayTrips.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No trips scheduled for today</Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {todayTrips.map((trip) => {
                const statusLabel =
                  trip.status === 'completed'
                    ? 'Completed'
                    : trip.status === 'in-progress'
                    ? 'In Progress'
                    : 'Scheduled';
                const statusColor =
                  trip.status === 'completed'
                    ? 'success'
                    : trip.status === 'in-progress'
                    ? 'info'
                    : 'default';

                return (
                  <Grid item xs={12} key={trip._id}>
                    <Paper sx={{ p: 2.5, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {trip.routeName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {trip.stops?.length || 0} stops • {trip.children?.length || 0} children
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" color="text.secondary">
                          {trip.scheduledTime}
                        </Typography>
                        <Chip label={statusLabel} color={statusColor} size="small" sx={{ mt: 1 }} />
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* Tab 1: Active Route */}
      {activeTab === 1 && (
        <Box>
          {activeTrip ? (
            <>
              <Paper
                sx={{
                  p: 4,
                  mb: 3,
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, #FFB300 0%, #FB8C00 100%)',
                  color: 'white',
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {activeTrip.routeName}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">Started</Typography>
                    <Typography variant="h6">{activeTrip.startTime || activeTrip.scheduledTime || '--'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">Est. Completion</Typography>
                    <Typography variant="h6">{activeTrip.estimatedEndTime || '--'}</Typography>
                  </Grid>
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Route Progress
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={
                        activeTrip.totalStops
                          ? Math.min(100, ((activeTrip.completedStops || 0) / activeTrip.totalStops) * 100)
                          : 0
                      }
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#FFE082',
                        },
                      }}
                    />
                    {activeTrip.totalStops && (
                      <Typography variant="caption">
                        {(activeTrip.completedStops || 0)} of {activeTrip.totalStops} stops
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </Paper>

              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Current Trip
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Type: {activeTrip.tripType} • Scheduled: {activeTrip.scheduledTime}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setTripDialog({ open: true, trip: activeTrip })}
                  >
                    View Full Details
                  </Button>
                </Box>
              </Paper>
            </>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No active route. Start a trip from the Routes tab to see it here.
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Tab 2: Assigned Children for active trip */}
      {activeTab === 2 && (
        <Box>
          {activeTrip && activeTrip.children?.length ? (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Assigned Children - {activeTrip.routeName}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Boarding Status</TableCell>
                      <TableCell>Deboarding Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeTrip.children.map((childTrip) => (
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No active trip with assigned children. Start a trip from the Routes tab.
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Tab 4: Vehicle Info - Vehicle Logs */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Vehicle Logs</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setVehicleLogForm({ ...vehicleLogForm, date: today });
                  setVehicleLogDialog({ open: true });
                }}
              >
                Add Log Entry
              </Button>
            </Box>
            <Paper sx={{ p: 2 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Start Mileage</TableCell>
                      <TableCell>End Mileage</TableCell>
                      <TableCell>Distance</TableCell>
                      <TableCell>Fuel Level</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vehicleLogs.map((log, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                        <TableCell>{log.startMileage}</TableCell>
                        <TableCell>{log.endMileage}</TableCell>
                        <TableCell>{log.endMileage - log.startMileage}</TableCell>
                        <TableCell>
                          <Chip label={log.fuelLevel} size="small" />
                        </TableCell>
                        <TableCell>{log.driverNotes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Incidents & Compliance */}
      {activeTab === 3 && complianceReport && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Compliance Score</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={complianceReport.complianceScore}
                      sx={{ height: 20, borderRadius: 1 }}
                    />
                  </Box>
                  <Typography variant="h6">{complianceReport.complianceScore}%</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Trip Statistics</Typography>
                <List>
                  <ListItem>
                    <ListItemText primary="Total Trips" secondary={complianceReport.totalTrips} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="On-Time Trips" secondary={complianceReport.onTimeTrips} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Delayed Trips" secondary={complianceReport.delayedTrips} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Average Delay" secondary={`${complianceReport.averageDelay} minutes`} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Incidents" secondary={complianceReport.incidents} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Vehicle Issues" secondary={complianceReport.vehicleIssues} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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

