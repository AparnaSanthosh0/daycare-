import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Paper, Typography, Box, Chip } from '@mui/material';
import api from '../../config/api';

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

const NearbyParentsMap = () => {
  const [activePickups, setActivePickups] = useState([]);

  useEffect(() => {
    const fetchActivePickups = async () => {
      try {
        const response = await api.get('/location/active-pickups');
        setActivePickups(response.data.pickups || []);
      } catch (error) {
        console.error('Failed to fetch active pickups:', error);
      }
    };

    fetchActivePickups();
    const interval = setInterval(fetchActivePickups, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <Paper elevation={3} sx={{ p: 3, height: '600px' }}>
      <Typography variant="h5" gutterBottom>
        Incoming Parents
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Chip 
          label={`${activePickups.length} parents on the way`} 
          color="primary" 
          size="small"
        />
      </Box>

      <MapContainer
        center={[daycareLocation.lat, daycareLocation.lng]}
        zoom={13}
        style={{ width: '100%', height: '500px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Daycare Marker */}
        <Marker position={[daycareLocation.lat, daycareLocation.lng]}>
          <Popup>
            <div>
              <h3>TinyTots Daycare</h3>
              <p>Main Location</p>
            </div>
          </Popup>
        </Marker>

        {/* Geofence Circle */}
        <Circle
          center={[daycareLocation.lat, daycareLocation.lng]}
          radius={500}
          pathOptions={{ color: 'orange', fillColor: 'orange', fillOpacity: 0.1 }}
        />

        {/* Parent Markers */}
        {activePickups.map((pickup) => (
          <Marker
            key={pickup.parentId}
            position={[pickup.location.lat, pickup.location.lng]}
          >
            <Popup>
              <div>
                <h4>Parent ID: {pickup.parentId}</h4>
                <p>Distance: {pickup.distance?.toFixed(2)} km</p>
                <p>ETA: ~{pickup.eta} minutes</p>
                <p>Last Updated: {new Date(pickup.lastUpdate).toLocaleTimeString()}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Paper>
  );
};

export default NearbyParentsMap;
