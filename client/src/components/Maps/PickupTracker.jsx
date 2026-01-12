import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, Circle } from '@react-google-maps/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import { DirectionsCar, Timer, LocationOn } from '@mui/icons-material';

const containerStyle = {
  width: '100%',
  height: '400px'
};

const daycareLocation = {
  lat: 40.7128,
  lng: -74.0060
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const PickupTracker = ({ parentName = "Parent", childName = "Child" }) => {
  const [parentLocation, setParentLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [eta, setEta] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [geofenceAlert, setGeofenceAlert] = useState(false);

  // Track parent location
  useEffect(() => {
    let watchId;

    if (tracking && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setParentLocation(pos);

          // Calculate distance to daycare
          const dist = calculateDistance(
            pos.lat,
            pos.lng,
            daycareLocation.lat,
            daycareLocation.lng
          );
          setDistance(dist);

          // Estimate ETA (assuming 40 km/h average speed)
          const estimatedETA = (dist / 40) * 60; // minutes
          setEta(Math.round(estimatedETA));

          // Geofence alert (within 500m)
          if (dist < 0.5) {
            setGeofenceAlert(true);
          } else {
            setGeofenceAlert(false);
          }
        },
        (error) => {
          console.error('Error tracking location:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [tracking]);

  const startTracking = () => {
    setTracking(true);
  };

  const stopTracking = () => {
    setTracking(false);
    setParentLocation(null);
    setDistance(null);
    setEta(null);
  };

  return (
    <Box>
      <Card elevation={3}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <DirectionsCar sx={{ mr: 1, verticalAlign: 'middle' }} />
              Pickup Tracker
            </Typography>
            <Chip
              label={tracking ? 'Tracking' : 'Not Tracking'}
              color={tracking ? 'success' : 'default'}
              size="small"
            />
          </Box>

          {geofenceAlert && (
            <Alert severity="info" sx={{ mb: 2 }}>
              🎉 {parentName} is nearby! Estimated arrival: {eta} minutes
            </Alert>
          )}

          {tracking && distance !== null && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <LocationOn fontSize="small" /> Distance: {distance.toFixed(2)} km
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <Timer fontSize="small" /> ETA: {eta} mins
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, 100 - (distance * 10)))}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </Box>
          )}

          <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={parentLocation || daycareLocation}
              zoom={13}
            >
              {/* Daycare Marker */}
              <Marker
                position={daycareLocation}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: new window.google.maps.Size(40, 40)
                }}
                title="TinyTots Daycare"
              />

              {/* Geofence Circle (500m radius) */}
              <Circle
                center={daycareLocation}
                radius={500}
                options={{
                  fillColor: '#2196F3',
                  fillOpacity: 0.1,
                  strokeColor: '#2196F3',
                  strokeOpacity: 0.4,
                  strokeWeight: 2
                }}
              />

              {/* Parent Location Marker */}
              {parentLocation && (
                <Marker
                  position={parentLocation}
                  icon={{
                    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                    scaledSize: new window.google.maps.Size(35, 35)
                  }}
                  title={parentName}
                />
              )}
            </GoogleMap>
          </LoadScript>

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            {!tracking ? (
              <button
                onClick={startTracking}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Start Tracking Pickup
              </button>
            ) : (
              <button
                onClick={stopTracking}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Stop Tracking
              </button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PickupTracker;
