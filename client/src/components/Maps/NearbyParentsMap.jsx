import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar
} from '@mui/material';
import axios from 'axios';

const containerStyle = {
  width: '100%',
  height: '500px'
};

const daycareLocation = {
  lat: 40.7128,
  lng: -74.0060
};

const NearbyParentsMap = () => {
  const [activePickups, setActivePickups] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch active pickups every 10 seconds
  useEffect(() => {
    const fetchActivePickups = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/location/active-pickups', {
          headers: { 'x-auth-token': token }
        });
        
        setActivePickups(response.data.activePickups || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching active pickups:', error);
        setLoading(false);
      }
    };

    fetchActivePickups();
    const interval = setInterval(fetchActivePickups, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <Box>
      <Card elevation={3}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Active Pickups</Typography>
            <Chip
              label={`${activePickups.length} Parents En Route`}
              color={activePickups.length > 0 ? 'success' : 'default'}
              size="small"
            />
          </Box>

          <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={daycareLocation}
              zoom={12}
            >
              {/* Daycare Marker */}
              <Marker
                position={daycareLocation}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: new window.google.maps.Size(45, 45)
                }}
                title="TinyTots Daycare"
              />

              {/* Parent Markers */}
              {activePickups.map((pickup, index) => (
                <Marker
                  key={index}
                  position={pickup.location}
                  onClick={() => setSelectedParent(pickup)}
                  icon={{
                    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                    scaledSize: new window.google.maps.Size(35, 35)
                  }}
                />
              ))}

              {/* Info Window */}
              {selectedParent && (
                <InfoWindow
                  position={selectedParent.location}
                  onCloseClick={() => setSelectedParent(null)}
                >
                  <Box sx={{ p: 1 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Parent En Route
                    </Typography>
                    <Typography variant="body2">
                      Child ID: {selectedParent.childId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last Update: {new Date(selectedParent.lastUpdate).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>

          {/* Active Pickups List */}
          {activePickups.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Incoming Parents:
              </Typography>
              <List dense>
                {activePickups.map((pickup, index) => (
                  <ListItem key={index}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {index + 1}
                    </Avatar>
                    <ListItemText
                      primary={`Child: ${pickup.childId}`}
                      secondary={`Started: ${new Date(pickup.startTime).toLocaleTimeString()}`}
                    />
                    <Chip label="En Route" color="info" size="small" />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {activePickups.length === 0 && !loading && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
              No active pickups at the moment
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default NearbyParentsMap;
