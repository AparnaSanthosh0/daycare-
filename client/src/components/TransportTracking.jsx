import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  DirectionsCar,
  Person,
  Phone,
  LocationOn,
  DriveEta
} from '@mui/icons-material';
import api from '../config/api';

const TransportTracking = () => {
  const [loading, setLoading] = useState(true);
  const [transportData, setTransportData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTransportInfo();
  }, []);

  const fetchTransportInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get('/parents/me/transport');
      setTransportData(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching transport info:', err);
      setError('Failed to load transport information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'info';
      case 'delayed': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getBoardingStatusColor = (status) => {
    switch (status) {
      case 'boarded':
      case 'otp-verified': return 'success';
      case 'not-boarded': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!transportData || !transportData.childrenTransport || transportData.childrenTransport.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <DriveEta sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No Transport Service
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No transport has been assigned to your children yet.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        <DirectionsCar sx={{ verticalAlign: 'middle', mr: 1 }} />
        Transport & Driver Tracking
      </Typography>

      {transportData.childrenTransport.map((childTransport) => (
        <Paper key={childTransport.childId} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          {/* Child Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              src={childTransport.childImage}
              sx={{ width: 56, height: 56, mr: 2 }}
            >
              {childTransport.childName.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {childTransport.childName}
              </Typography>
              {!childTransport.hasTransport && (
                <Chip 
                  label="No Transport Assigned" 
                  size="small" 
                  color="default"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
          </Box>

          {childTransport.hasTransport && childTransport.routes.map((route, routeIndex) => (
            <Box key={route.routeId} sx={{ mb: routeIndex < childTransport.routes.length - 1 ? 3 : 0 }}>
              {/* Route Header */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {route.routeName}
                    </Typography>
                    <Chip 
                      label={route.routeType.replace(/-/g, ' ').toUpperCase()} 
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </Grid>
              </Grid>

              {/* Driver Info */}
              {route.driver && (
                <Card sx={{ mb: 2, bgcolor: '#f8f9fa' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        src={route.driver.profileImage}
                        sx={{ width: 48, height: 48, mr: 2, bgcolor: '#14B8A6' }}
                      >
                        <Person />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {route.driver.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Phone sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {route.driver.phone}
                            </Typography>
                          </Box>
                          {route.driver.licenseNumber && (
                            <Typography variant="body2" color="text.secondary">
                              License: {route.driver.licenseNumber}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>

                    {/* Vehicle Info */}
                    {route.vehicle && (
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {route.vehicle.vehicleNumber && (
                          <Chip
                            icon={<DirectionsCar />}
                            label={route.vehicle.vehicleNumber}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {route.vehicle.vehicleType && (
                          <Chip
                            label={route.vehicle.vehicleType}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {route.vehicle.capacity && (
                          <Chip
                            label={`Capacity: ${route.vehicle.capacity}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Address Info */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {route.pickupAddress && (
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <LocationOn sx={{ color: '#1976d2', mr: 1, mt: 0.5 }} />
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            Pickup Address
                          </Typography>
                          <Typography variant="body2">
                            {route.pickupAddress.street && `${route.pickupAddress.street}, `}
                            {route.pickupAddress.city}
                            {route.pickupAddress.state && `, ${route.pickupAddress.state}`}
                            {route.pickupAddress.zipCode && ` - ${route.pickupAddress.zipCode}`}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                )}
                {route.dropoffAddress && (
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <LocationOn sx={{ color: '#388e3c', mr: 1, mt: 0.5 }} />
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            Dropoff Address
                          </Typography>
                          <Typography variant="body2">
                            {route.dropoffAddress.street && `${route.dropoffAddress.street}, `}
                            {route.dropoffAddress.city}
                            {route.dropoffAddress.state && `, ${route.dropoffAddress.state}`}
                            {route.dropoffAddress.zipCode && ` - ${route.dropoffAddress.zipCode}`}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                )}
              </Grid>

              {/* Today's Trips */}
              {route.todayTrips && route.todayTrips.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    Today's Trips
                  </Typography>
                  <List>
                    {route.todayTrips.map((trip, tripIndex) => (
                      <ListItem
                        key={tripIndex}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          bgcolor: 'background.paper'
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: trip.status === 'completed' ? '#4caf50' : '#ff9800' }}>
                            {trip.tripType === 'pickup' ? <DriveEta /> : <DirectionsCar />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {trip.tripType.toUpperCase()}
                              </Typography>
                              <Chip
                                label={trip.status}
                                size="small"
                                color={getStatusColor(trip.status)}
                              />
                              {trip.boardingStatus && (
                                <Chip
                                  label={trip.boardingStatus}
                                  size="small"
                                  color={getBoardingStatusColor(trip.boardingStatus)}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="body2" component="span">
                                Scheduled: {trip.scheduledTime}
                                {trip.actualTime && ` | Actual: ${trip.actualTime}`}
                              </Typography>
                              {trip.boardingTime && (
                                <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
                                  Boarded: {new Date(trip.boardingTime).toLocaleTimeString()}
                                </Typography>
                              )}
                              {trip.deboardingTime && (
                                <Typography variant="body2" component="div">
                                  Deboarded: {new Date(trip.deboardingTime).toLocaleTimeString()}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {route.todayTrips && route.todayTrips.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No trips scheduled for today
                </Alert>
              )}

              {routeIndex < childTransport.routes.length - 1 && <Divider sx={{ my: 3 }} />}
            </Box>
          ))}
        </Paper>
      ))}
    </Box>
  );
};

export default TransportTracking;
