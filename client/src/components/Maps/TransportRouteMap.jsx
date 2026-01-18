import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Paper, Typography, Alert } from '@mui/material';
import { DirectionsBus, Home, School } from '@mui/icons-material';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons
const homeIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4CAF50" width="36px" height="36px">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  `),
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

const daycareIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2196F3" width="36px" height="36px">
      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
    </svg>
  `),
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

const TransportRouteMap = ({ assignment }) => {
  const [pickupCoords, setPickupCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Daycare location (Kerala, India)
  const daycareLocation = [9.9679032, 76.2444378];

  // Geocode pickup address
  useEffect(() => {
    const geocodeAddress = async () => {
      if (!assignment?.pickupAddress) {
        setError('No pickup address available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Use Nominatim for geocoding
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            assignment.pickupAddress + ', Kerala, India'
          )}`
        );
        const data = await response.json();

        if (data && data.length > 0) {
          setPickupCoords([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          setError('');
        } else {
          // If geocoding fails, use a default location near daycare
          setPickupCoords([9.97, 76.25]);
          setError('Could not find exact location. Showing approximate area.');
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        setPickupCoords([9.97, 76.25]);
        setError('Could not load exact location. Showing approximate area.');
      } finally {
        setLoading(false);
      }
    };

    geocodeAddress();
  }, [assignment?.pickupAddress]);

  if (loading) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography>Loading map...</Typography>
      </Paper>
    );
  }

  if (!pickupCoords) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="error">Unable to display route map</Alert>
      </Paper>
    );
  }

  // Calculate center and zoom
  const center = [
    (pickupCoords[0] + daycareLocation[0]) / 2,
    (pickupCoords[1] + daycareLocation[1]) / 2
  ];

  // Calculate distance for zoom level
  const latDiff = Math.abs(pickupCoords[0] - daycareLocation[0]);
  const lngDiff = Math.abs(pickupCoords[1] - daycareLocation[1]);
  const maxDiff = Math.max(latDiff, lngDiff);
  
  // Better zoom calculation
  let zoom = 13;
  if (maxDiff > 0.5) zoom = 9;
  else if (maxDiff > 0.2) zoom = 11;
  else if (maxDiff > 0.1) zoom = 12;
  else if (maxDiff > 0.05) zoom = 13;
  else zoom = 14;

  return (
    <Box>
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <DirectionsBus color="primary" />
          <Typography variant="h6">
            {assignment.routeName} - Route Map
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Home sx={{ color: '#4CAF50' }} />
            <Typography variant="body2">
              <strong>Pickup:</strong> {assignment.pickupAddress}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <School sx={{ color: '#2196F3' }} />
            <Typography variant="body2">
              <strong>Daycare:</strong> TinyTots Kerala
            </Typography>
          </Box>
        </Box>

        <Box sx={{ height: '400px', borderRadius: 1, overflow: 'hidden' }}>
          <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            bounds={[[pickupCoords[0], pickupCoords[1]], [daycareLocation[0], daycareLocation[1]]]}
            boundsOptions={{ padding: [50, 50] }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Pickup Location Marker */}
            <Marker position={pickupCoords} icon={homeIcon}>
              <Popup>
                <strong>Pickup Location</strong>
                <br />
                {assignment.pickupAddress}
                <br />
                Time: {assignment.pickupTime}
              </Popup>
            </Marker>

            {/* Daycare Location Marker */}
            <Marker position={daycareLocation} icon={daycareIcon}>
              <Popup>
                <strong>TinyTots Daycare</strong>
                <br />
                Drop-off Time: {assignment.dropoffTime}
              </Popup>
            </Marker>

            {/* Route Line */}
            <Polyline
              positions={[pickupCoords, daycareLocation]}
              color="#2196F3"
              weight={4}
              opacity={0.7}
              dashArray="10, 10"
            />

            {/* Service Area Circle around daycare */}
            <Circle
              center={daycareLocation}
              radius={5000}
              pathOptions={{
                color: '#2196F3',
                fillColor: '#2196F3',
                fillOpacity: 0.1
              }}
            />
          </MapContainer>
        </Box>

        <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Driver:</strong> {assignment.driverName} ({assignment.driverPhone})
            <br />
            <strong>Vehicle:</strong> {assignment.vehicleNumber}
            <br />
            <strong>Monthly Fee:</strong> ₹{assignment.monthlyFee}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default TransportRouteMap;
