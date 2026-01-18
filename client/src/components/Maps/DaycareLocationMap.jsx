import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Paper, TextField, Button, Box, Typography, ToggleButton, ToggleButtonGroup, Alert } from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const daycareLocation = {
  lat: 9.9679032,
  lng: 76.2444378
};

// Component to recenter map
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const DaycareLocationMap = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([daycareLocation.lat, daycareLocation.lng]);
  const [mapZoom, setMapZoom] = useState(13);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [travelMode, setTravelMode] = useState('driving');
  const [searchAddress, setSearchAddress] = useState('');
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [error, setError] = useState('');

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setError(''); // Clear previous errors
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(pos);
        setMapCenter([pos.lat, pos.lng]);
        setMapZoom(15);
        setError('');
      },
      (err) => {
        let errorMsg = '';
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMsg = 'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMsg = 'Location information unavailable. Please try again.';
            break;
          case err.TIMEOUT:
            errorMsg = 'Location request timed out. Please try again.';
            break;
          default:
            errorMsg = 'Unable to get your location. Please try again.';
        }
        setError(errorMsg);
        console.error('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

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

  const calculateRoute = async () => {
    if (!userLocation && !searchAddress) {
      alert('Please enter your address or enable location');
      return;
    }

    try {
      let origin = userLocation;

      if (searchAddress) {
        // Use Nominatim for geocoding (OpenStreetMap)
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}`,
          { headers: { 'User-Agent': 'TinyTots-Daycare-App' } }
        );
        const results = await response.json();
        if (results.length > 0) {
          origin = {
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon)
          };
          setUserLocation(origin);
        } else {
          alert('Address not found');
          return;
        }
      }

      // Calculate straight-line distance
      const dist = calculateDistance(
        origin.lat,
        origin.lng,
        daycareLocation.lat,
        daycareLocation.lng
      );
      
      // Simple straight line route
      const coords = [
        [origin.lat, origin.lng],
        [daycareLocation.lat, daycareLocation.lng]
      ];
      
      setRouteCoordinates(coords);
      setDistance(dist.toFixed(2) + ' km');
      
      // Estimate duration based on mode (driving: 40km/h avg, walking: 5km/h)
      const speed = travelMode === 'driving' ? 40 : 5;
      setDuration(Math.ceil((dist / speed) * 60) + ' mins');
      
      // Adjust map view to show both points
      setMapCenter([origin.lat, origin.lng]);
      setMapZoom(12);
    } catch (error) {
      console.error('Routing failed:', error);
      alert('Could not calculate route. Please try again.');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, height: '600px' }}>
      <Typography variant="h5" gutterBottom>
        TinyTots Daycare Location
      </Typography>

      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          label="Enter your address"
          value={searchAddress}
          onChange={(e) => setSearchAddress(e.target.value)}
          size="small"
          sx={{ flexGrow: 1, minWidth: '200px' }}
        />
        
        <Button
          variant="outlined"
          startIcon={<MyLocationIcon />}
          onClick={getUserLocation}
          size="small"
        >
          My Location
        </Button>

        <ToggleButtonGroup
          value={travelMode}
          exclusive
          onChange={(e, newMode) => newMode && setTravelMode(newMode)}
          size="small"
        >
          <ToggleButton value="driving">
            <DirectionsCarIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="walking">
            <DirectionsWalkIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>

        <Button
          variant="contained"
          onClick={calculateRoute}
          size="small"
          disabled={!userLocation && !searchAddress}
        >
          Get Directions
        </Button>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {(distance && duration) && (
        <Box sx={{ mb: 2, p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Typography variant="body2" color="white">
            Distance: {distance} | Duration: {duration}
          </Typography>
        </Box>
      )}

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ width: '100%', height: '400px' }}
      >
        <ChangeView center={mapCenter} zoom={mapZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Daycare Marker */}
        <Marker position={[daycareLocation.lat, daycareLocation.lng]}>
          <Popup>
            <div>
              <h3>TinyTots Daycare</h3>
              <p>123 Main Street, New York, NY 10001</p>
              <p>Phone: (555) 123-4567</p>
            </div>
          </Popup>
        </Marker>

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]}>
            <Popup>Your Location</Popup>
          </Marker>
        )}

        {/* Route Line */}
        {routeCoordinates && (
          <Polyline positions={routeCoordinates} color="blue" weight={4} />
        )}
      </MapContainer>
    </Paper>
  );
};

export default DaycareLocationMap;
