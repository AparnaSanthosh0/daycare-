# 🗺️ Google Maps API Integration Guide

## Overview
This guide covers the implementation of Google Maps API in TinyTots Daycare for location tracking, directions, and pickup monitoring.

## 🚀 Setup Instructions

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the following APIs:
   - Maps JavaScript API
   - Geocoding API
   - Directions API
   - Geolocation API
4. Create credentials → API Key
5. Restrict your API key (recommended):
   - Set HTTP referrers (for web)
   - Restrict to specific APIs

### 2. Configure Environment Variables

**Client (.env file):**
```bash
# Add to client/.env
REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

**Server:**
No server-side API key needed for current implementation.

### 3. Update Daycare Location

Edit the actual daycare coordinates in:

**Files to update:**
- `client/src/components/Maps/DaycareLocationMap.jsx`
- `client/src/components/Maps/PickupTracker.jsx`
- `client/src/components/Maps/NearbyParentsMap.jsx`
- `server/routes/location.js`

Replace:
```javascript
const daycareLocation = {
  lat: 40.7128,  // ← Update with actual latitude
  lng: -74.0060, // ← Update with actual longitude
  address: "Your actual address here"
};
```

To find your coordinates:
1. Open Google Maps
2. Right-click on your daycare location
3. Click on the coordinates to copy them

### 4. Register Routes

**Add to `server/index.js`:**
```javascript
// Import location routes
const locationRoutes = require('./routes/location');

// Register routes
app.use('/api/location', locationRoutes);
```

## 📦 Components Created

### 1. **DaycareLocationMap**
**Purpose:** Display daycare location with directions
**Features:**
- Show daycare on map
- Get user's current location
- Calculate directions (driving/walking)
- Search address and navigate
- Show distance and ETA

**Usage:**
```jsx
import DaycareLocationMap from './components/Maps/DaycareLocationMap';

<DaycareLocationMap 
  showDirections={true} 
  showSearch={true} 
/>
```

### 2. **PickupTracker**
**Purpose:** Real-time parent location tracking for pickup
**Features:**
- Track parent's location in real-time
- Calculate distance to daycare
- Estimate ETA
- Geofence alert (500m radius)
- Visual progress indicator

**Usage:**
```jsx
import PickupTracker from './components/Maps/PickupTracker';

<PickupTracker 
  parentName="John Doe" 
  childName="Emma" 
/>
```

### 3. **NearbyParentsMap**
**Purpose:** Staff dashboard showing all incoming parents
**Features:**
- Display all active pickups
- Real-time location updates
- Parent list with timestamps
- Click markers for details

**Usage:**
```jsx
import NearbyParentsMap from './components/Maps/NearbyParentsMap';

// For staff dashboard
<NearbyParentsMap />
```

## 🔌 API Endpoints

### Base URL: `/api/location`

#### 1. Start Tracking
```javascript
POST /api/location/start-tracking
Headers: { 'x-auth-token': 'user_token' }
Body: {
  "childId": "child_id_here",
  "parentLocation": {
    "lat": 40.7128,
    "lng": -74.0060
  }
}

Response: {
  "trackingId": "unique_tracking_id",
  "success": true
}
```

#### 2. Update Location
```javascript
PUT /api/location/update-location
Headers: { 'x-auth-token': 'user_token' }
Body: {
  "trackingId": "tracking_id",
  "location": {
    "lat": 40.7150,
    "lng": -74.0070
  }
}

Response: {
  "distance": "0.25",
  "isNearby": false,
  "eta": 5
}
```

#### 3. Stop Tracking
```javascript
POST /api/location/stop-tracking
Headers: { 'x-auth-token': 'user_token' }
Body: {
  "trackingId": "tracking_id"
}

Response: {
  "success": true
}
```

#### 4. Get Active Pickups (Staff Only)
```javascript
GET /api/location/active-pickups
Headers: { 'x-auth-token': 'staff_token' }

Response: {
  "activePickups": [
    {
      "childId": "child_id",
      "location": { "lat": 40.7150, "lng": -74.0070 },
      "startTime": "2026-01-12T10:30:00Z",
      "lastUpdate": "2026-01-12T10:35:00Z"
    }
  ],
  "count": 1
}
```

#### 5. Get Daycare Info (Public)
```javascript
GET /api/location/daycare-info

Response: {
  "name": "TinyTots Daycare",
  "address": "123 Kids Street, NY",
  "location": { "lat": 40.7128, "lng": -74.0060 },
  "phone": "+1 (555) 123-4567",
  "hours": { ... }
}
```

## 🎨 Integration Examples

### Parent Dashboard
```jsx
import React from 'react';
import { Box, Grid } from '@mui/material';
import DaycareLocationMap from './components/Maps/DaycareLocationMap';
import PickupTracker from './components/Maps/PickupTracker';

function ParentDashboard() {
  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <DaycareLocationMap showDirections={true} />
        </Grid>
        <Grid item xs={12} md={6}>
          <PickupTracker 
            parentName="John Doe" 
            childName="Emma" 
          />
        </Grid>
      </Grid>
    </Box>
  );
}
```

### Staff Dashboard
```jsx
import React from 'react';
import NearbyParentsMap from './components/Maps/NearbyParentsMap';

function StaffDashboard() {
  return (
    <div>
      <h2>Incoming Pickups</h2>
      <NearbyParentsMap />
    </div>
  );
}
```

### Contact/About Page
```jsx
import DaycareLocationMap from './components/Maps/DaycareLocationMap';

function ContactPage() {
  return (
    <div>
      <h1>Visit Us</h1>
      <DaycareLocationMap 
        showDirections={true} 
        showSearch={true} 
      />
    </div>
  );
}
```

## 🔒 Security & Privacy

### Best Practices:
1. **API Key Security:**
   - Restrict API key to your domain
   - Don't commit `.env` files to git
   - Use environment variables

2. **Location Privacy:**
   - Only track with parent consent
   - Clear tracking data after use
   - Encrypt location data in transit

3. **Access Control:**
   - Staff-only access to `NearbyParentsMap`
   - Parents can only track their own pickups
   - Implement proper authentication

## 💰 Cost Management

### Google Maps Pricing (as of 2026):
- **Maps JavaScript API:** $7 per 1,000 loads
- **Directions API:** $5 per 1,000 requests
- **Geocoding API:** $5 per 1,000 requests

### Free Tier:
- $200 credit per month (≈28,000 map loads)

### Optimization Tips:
1. Cache map loads where possible
2. Limit direction requests
3. Use clustering for multiple markers
4. Implement rate limiting

## 🚀 Advanced Features to Add

### 1. Push Notifications
```javascript
// When parent enters geofence
if (distance < 0.5) {
  sendPushNotification(staffDevices, {
    title: 'Parent Approaching',
    body: `${parentName} is 5 minutes away`
  });
}
```

### 2. Traffic-Aware ETA
```javascript
// Use Directions API with traffic model
const directionsService = new google.maps.DirectionsService();
directionsService.route({
  origin: parentLocation,
  destination: daycareLocation,
  travelMode: 'DRIVING',
  drivingOptions: {
    departureTime: new Date(),
    trafficModel: 'bestguess'
  }
});
```

### 3. Historical Heatmap
```javascript
import { HeatmapLayer } from '@react-google-maps/api';

// Show popular pickup times/routes
<HeatmapLayer
  data={pickupLocations}
  options={{
    radius: 20,
    opacity: 0.6
  }}
/>
```

### 4. Multi-Stop Routing
```javascript
// For parents picking up multiple children
const waypoints = [
  { location: daycare1Location, stopover: true },
  { location: daycare2Location, stopover: true }
];
```

## 🐛 Troubleshooting

### Map not loading?
1. Check API key is correct
2. Verify APIs are enabled in Google Cloud
3. Check browser console for errors
4. Ensure domain is whitelisted

### Location not updating?
1. Check browser permissions
2. Verify HTTPS (geolocation requires secure context)
3. Check network connectivity
4. Clear browser cache

### Directions not showing?
1. Verify Directions API is enabled
2. Check quota limits
3. Ensure valid start/end coordinates

## 📱 Mobile Optimization

### Responsive Design:
```jsx
<GoogleMap
  mapContainerStyle={{
    width: '100%',
    height: window.innerWidth < 600 ? '300px' : '500px'
  }}
/>
```

### Battery Optimization:
```javascript
// Reduce location update frequency on mobile
const trackingOptions = {
  enableHighAccuracy: isMobile ? false : true,
  maximumAge: isMobile ? 30000 : 10000,
  timeout: 10000
};
```

## 🎯 Use Cases

1. **Parent Pickup Tracking** - Real-time ETA for staff
2. **Emergency Contacts** - Quick directions to daycare
3. **Field Trip Planning** - Map routes and destinations
4. **Marketing** - Show location to prospective families
5. **Geofence Alerts** - Notify when parent nearby
6. **Analytics** - Track pickup patterns

## 📊 Next Steps

1. **Implement WebSocket** - Real-time updates without polling
2. **Add Route History** - Show common routes
3. **Integration with Notifications** - Auto-alert staff
4. **Offline Support** - Cache maps for offline viewing
5. **Multiple Locations** - Support for multi-site daycares

## 🔗 Resources

- [Google Maps JavaScript API Docs](https://developers.google.com/maps/documentation/javascript)
- [@react-google-maps/api Documentation](https://react-google-maps-api-docs.netlify.app/)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)

---

**Need Help?** Check the implementation in the components or contact the development team.
