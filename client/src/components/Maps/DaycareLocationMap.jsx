import React, { useState, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { Box, Button, TextField, Paper, Typography } from '@mui/material';
import { MyLocation, Directions, LocationOn } from '@mui/icons-material';

const containerStyle = {
  width: '100%',
  height: '500px'
};

// Default TinyTots Daycare Location (Update with actual location)
const daycareLocation = {
  lat: 40.7128,
  lng: -74.0060,
  address: "123 Kids Street, TinyTots Daycare, New York, NY 10001"
};

const DaycareLocationMap = ({ showDirections = true, showSearch = false }) => {
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [travelMode, setTravelMode] = useState('DRIVING');

  // Verify API key is loaded
  React.useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      console.error('⚠️ Google Maps API Key is not configured! Please add it to client/.env file');
    } else {
      console.log('✅ Google Maps API Key is configured');
    }
  }, []);

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Get user's current location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(pos);
          if (map) {
            map.panTo(pos);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your location. Please enable location services.');
        }
      );
    }
  };

  // Get directions from user location to daycare
  const getDirections = () => {
    if (!userLocation) {
      getUserLocation();
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: userLocation,
        destination: daycareLocation,
        travelMode: window.google.maps.TravelMode[travelMode]
      },
      (result, status) => {
        if (status === 'OK') {
          setDirections(result);
        } else {
          console.error('Directions request failed:', status);
          alert('Could not get directions. Please try again.');
        }
      }
    );
  };

  // Search for address and get directions
  const searchAndNavigate = () => {
    if (!searchAddress) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: searchAddress }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng()
        };
        setUserLocation(location);
        
        // Get directions from searched location
        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
          {
            origin: location,
            destination: daycareLocation,
            travelMode: window.google.maps.TravelMode[travelMode]
          },
          (result, status) => {
            if (status === 'OK') {
              setDirections(result);
            }
          }
        );
      } else {
        alert('Address not found. Please try again.');
      }
    });
  };

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            <LocationOn color="primary" /> TinyTots Daycare Location
          </Typography>
          
          {showDirections && (
            <>
              <Button
                variant="outlined"
                startIcon={<MyLocation />}
                onClick={getUserLocation}
                size="small"
              >
                My Location
              </Button>
              
              <Button
                variant="contained"
                startIcon={<Directions />}
                onClick={getDirections}
                disabled={!userLocation}
                size="small"
              >
                Get Directions
              </Button>
              
              <Button
                variant="text"
                onClick={() => setTravelMode(travelMode === 'DRIVING' ? 'WALKING' : 'DRIVING')}
                size="small"
              >
                {travelMode === 'DRIVING' ? '🚗 Driving' : '🚶 Walking'}
              </Button>
            </>
          )}
        </Box>

        {showSearch && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Enter your address..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchAndNavigate()}
            />
            <Button variant="contained" onClick={searchAndNavigate}>
              Navigate
            </Button>
          </Box>
        )}

        {directions && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Distance:</strong> {directions.routes[0].legs[0].distance.text}
              {' | '}
              <strong>Duration:</strong> {directions.routes[0].legs[0].duration.text}
            </Typography>
          </Box>
        )}
      </Paper>

      <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={daycareLocation}
          zoom={15}
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
          {/* Daycare Marker */}
          <Marker
            position={daycareLocation}
            onClick={() => setShowInfo(true)}
            icon={{
              url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
            }}
          />

          {/* User Location Marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
              }}
            />
          )}

          {/* Info Window */}
          {showInfo && (
            <InfoWindow
              position={daycareLocation}
              onCloseClick={() => setShowInfo(false)}
            >
              <Box sx={{ p: 1 }}>
                <Typography variant="h6" gutterBottom>
                  TinyTots Daycare
                </Typography>
                <Typography variant="body2">
                  {daycareLocation.address}
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={getDirections}
                  sx={{ mt: 1 }}
                >
                  Get Directions
                </Button>
              </Box>
            </InfoWindow>
          )}

          {/* Directions Renderer */}
          {directions && (
            <DirectionsRenderer
              directions={directions}
              options={{
                polylineOptions: {
                  strokeColor: '#2196F3',
                  strokeWeight: 5
                }
              }}
            />
          )}
        </GoogleMap>
      </LoadScript>
    </Box>
  );
};

export default DaycareLocationMap;
