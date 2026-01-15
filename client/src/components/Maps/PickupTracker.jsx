import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Paper, Button, Box, Typography, Alert } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import StopIcon from '@mui/icons-material/Stop';
import axios from 'axios';

// Component to recenter map
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 14);
    }
  }, [center, map]);
  return null;
}

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const daycareLocation = {
  lat: 40.7128,
  lng: -74.0060
};

const PickupTracker = ({ parentId }) => {
  const [tracking, setTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [eta, setEta] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [error, setError] = useState('');

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const startTracking = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    try {
      // Start tracking
      await axios.post(`${API_URL}/api/location/start-tracking`, {
        parentId: parentId || 'parent-123',
        childId: 'child-456'
      });

      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          setCurrentLocation(pos);

          // Calculate distance and ETA
          const dist = calculateDistance(
            pos.lat,
            pos.lng,
            daycareLocation.lat,
            daycareLocation.lng
          );
          setDistance(dist.toFixed(2));
          setEta(Math.ceil(dist * 2)); // Rough ETA: 2 mins per km

          // Update server
          await axios.put(`${API_URL}/api/location/update-location`, {
            parentId: parentId || 'parent-123',
            latitude: pos.lat,
            longitude: pos.lng
          });
        },
        (err) => {
          setError('Unable to get your location: ' + err.message);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );

      setWatchId(id);
      setTracking(true);
      setError('');
    } catch (err) {
      setError('Failed to start tracking: ' + err.message);
    }
  };

  const stopTracking = async () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }

    try {
      await axios.post(`${API_URL}/api/location/stop-tracking`, {
        parentId: parentId || 'parent-123'
      });
    } catch (err) {
      console.error('Failed to stop tracking:', err);
    }

    setTracking(false);
    setWatchId(null);
    setCurrentLocation(null);
    setDistance(null);
    setEta(null);
  };

  useEffect(() => {
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return (
    <Paper elevation={3} sx={{ p: 3, height: '600px' }}>
      <Typography variant="h5" gutterBottom>
        Pickup Tracking
      </Typography>

      <Box sx={{ mb: 2 }}>
        {!tracking ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<LocationOnIcon />}
            onClick={startTracking}
            fullWidth
          >
            Start Tracking My Pickup
          </Button>
        ) : (
          <Button
            variant="contained"
            color="error"
            startIcon={<StopIcon />}
            onClick={stopTracking}
            fullWidth
          >
            Stop Tracking
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {tracking && distance && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
          <Typography variant="h6" color="white">
            Distance: {distance} km
          </Typography>
          <Typography variant="body1" color="white">
            ETA: ~{eta} minutes
          </Typography>
          {parseFloat(distance) < 0.5 && (
            <Alert severity="success" sx={{ mt: 1 }}>
              You're near the daycare!
            </Alert>
          )}
        </Box>
      )}

      <MapContainer
        center={currentLocation ? [currentLocation.lat, currentLocation.lng] : [daycareLocation.lat, daycareLocation.lng]}
        zoom={14}
        style={{ width: '100%', height: '400px' }}
      >
        {currentLocation && <ChangeView center={[currentLocation.lat, currentLocation.lng]} />}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Daycare Marker */}
        <Marker position={[daycareLocation.lat, daycareLocation.lng]}>
          <Popup>
            <div>
              <h3>TinyTots Daycare</h3>
              <p>Your destination</p>
            </div>
          </Popup>
        </Marker>

        {/* Geofence Circle */}
        <Circle
          center={[daycareLocation.lat, daycareLocation.lng]}
          radius={500}
          pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 0.1 }}
        />

        {/* Current Location Marker */}
        {currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lng]}>
            <Popup>Your Current Location</Popup>
          </Marker>
        )}

        {/* Route Line from current location to daycare */}
        {currentLocation && (
          <Polyline
            positions={[
              [currentLocation.lat, currentLocation.lng],
              [daycareLocation.lat, daycareLocation.lng]
            ]}
            color="blue"
            weight={3}
            dashArray="10, 10"
          />
        )}
      </MapContainer>
    </Paper>
  );
};

export default PickupTracker;
