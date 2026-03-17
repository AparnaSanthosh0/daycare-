import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Stack,
  Chip,
  Button,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Link,
  TextField,
  IconButton,
  Tooltip,
  Badge,
  LinearProgress,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Rating,
  Avatar,
  Menu,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
} from '@mui/material';
import {
  LocalShipping,
  DirectionsBike,
  MonetizationOn,
  Schedule,
  Place,
  ErrorOutline,
  DoneAll,
  AccountCircle,
  ShoppingCart,
  Logout,
  ExpandMore,
  Phone,
  Launch,
  Inventory2,
  Storefront,
  PersonPinCircle,
  Refresh,
  Navigation,
  AccessTime,
  Star,
  PhotoCamera,
  Chat,
  Notifications,
  TrendingUp,
  Assessment,
  History,
  GpsFixed,
  Route,
  Speed,
  CheckCircle,
  RadioButtonUnchecked,
  Circle,
  Upload,
  Security,
  Warning,
  Timer,
  Map,
  ReportProblem,
  TrendingDown,
  Timeline,
  Analytics,
  Prediction,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';
import DaycareLocationMap from '../../components/Maps/DaycareLocationMap';

const fmtINR = (v) => {
  const n = Number(v || 0);
  return `₹${n.toFixed(2)}`;
};

const humanStatus = (status) => {
  if (!status) return 'Unknown';
  return String(status).replace(/_/g, ' ');
};

const statusChipColor = (status) => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'assigned':
      return 'info';
    case 'accepted':
      return 'primary';
    case 'picked_up':
    case 'in_transit':
      return 'secondary';
    case 'delivered':
      return 'success';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
};

const mapLink = (address) => {
  if (!address) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
};

const formatAddress = (loc) => {
  if (!loc) return 'Address not available';
  if (typeof loc === 'string') return loc;

  const normalizeMaybeObjectLiteralString = (s) => {
    if (!s || typeof s !== 'string') return s;
    const trimmed = s.trim();
    // Handles strings like: "{ street: 'Kottayam', city: 'Kottayam', state: 'Kerala', zipCode: '' }"
    if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) return s;
    if (!trimmed.includes(':')) return s;

    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return '';

    const parts = inner
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const idx = p.indexOf(':');
        if (idx === -1) return '';
        let val = p.slice(idx + 1).trim();
        // Strip wrapping quotes (single/double/backtick)
        val = val.replace(/^['"`]/, '').replace(/['"`]$/, '');
        return val.trim();
      })
      .filter((v) => v && v.toLowerCase() !== 'undefined' && v.toLowerCase() !== 'null');

    return parts.join(', ');
  };

  const parts = [];
  const pushVal = (val) => {
    if (!val) return;
    if (typeof val === 'string') {
      const normalized = normalizeMaybeObjectLiteralString(val);
      if (normalized) parts.push(normalized);
    } else if (typeof val === 'object') {
      Object.values(val).forEach(pushVal);
    }
  };

  // Prioritize richer fields first
  pushVal(loc.fullAddress);
  pushVal(loc.address);
  pushVal(loc.street);
  pushVal(loc.city);
  pushVal(loc.state);
  pushVal(loc.zipCode);
  pushVal(loc.country);

  // De-duplicate while preserving order
  const unique = [];
  parts.forEach((p) => {
    if (!unique.includes(p)) unique.push(p);
  });

  return unique.length ? unique.join(', ') : 'Address not available';
};

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    avgRating: 0,
    onTimeRate: 0,
    totalOrders: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    totalDeliveries: 0,
    successRate: 0,
    avgDeliveryTime: 0,
  });
  
  // New state for advanced features
  const [currentLocation, setCurrentLocation] = useState(null);
  const [deliveryRoute, setDeliveryRoute] = useState(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [earningsBreakdown, setEarningsBreakdown] = useState({});
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [proofUploadOpen, setProofUploadOpen] = useState(false);
  const [customerContactOpen, setCustomerContactOpen] = useState(false);
  const [routeOptimization, setRouteOptimization] = useState(null);
  const [liveTracking, setLiveTracking] = useState(false);
  const [eta, setEta] = useState(null);
  const locationIntervalRef = useRef(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  
  // New AI Features State
  const [deliveryFailureRisk, setDeliveryFailureRisk] = useState(null);
  const [anomalyDetection, setAnomalyDetection] = useState([]);
  const [earningsForecast, setEarningsForecast] = useState(null);
  const [routeOptimizationAI, setRouteOptimizationAI] = useState(null);
  const [deliveryProgress, setDeliveryProgress] = useState(null);
  const [routeMonitoring, setRouteMonitoring] = useState(null);

  // Fetch available assignments
  const fetchAvailableAssignments = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching available assignments...');
      console.log('🔧 API baseURL:', api.defaults.baseURL);
      console.log('👤 Current user ID:', user?.userId || user?._id);
      const response = await api.get('/delivery-assignments/available');
      console.log('✅ Response:', response.data);
      console.log('📦 Assignments received:', response.data.assignments?.length || 0);
      setOrders(response.data.assignments || []);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching available assignments:', err);
      console.error('❌ Error response:', err.response);
      setLoading(false);
      if (err.response?.status === 403) {
        setError('Access denied. Please login as a delivery agent.');
      } else {
        setError(err.response?.data?.message || 'Failed to load available assignments');
      }
    }
  }, [user]);

  // Fetch my active assignments
  const fetchMyAssignments = useCallback(async () => {
    try {
      const response = await api.get('/delivery-assignments/my-assignments');
      const assignments = response.data.assignments || [];

      console.log('📦 My assignments:', assignments.length, assignments.map(a => `${a._id}:${a.status}`).join(', '));

      // Find active delivery (prioritize picked_up/in_transit, then accepted/assigned)
      let active =
        assignments.find(a => a.status === 'picked_up' || a.status === 'in_transit') ||
        assignments.find(a => a.status === 'accepted' || a.status === 'assigned');

      // Fallback: if none found (e.g., backend not returning accepted by default), query explicitly for accepted
      if (!active) {
        try {
          const acceptedRes = await api.get('/delivery-assignments/my-assignments?status=accepted');
          const acceptedAssignments = acceptedRes.data.assignments || [];
          console.log('📦 Explicit accepted assignments:', acceptedAssignments.length);
          active =
            acceptedAssignments.find(a => a.status === 'picked_up' || a.status === 'in_transit') ||
            acceptedAssignments.find(a => a.status === 'accepted' || a.status === 'assigned') ||
            active;
        } catch (fallbackErr) {
          console.error('Fallback accepted fetch failed:', fallbackErr);
        }
      }

      setActiveDelivery(active || null);

    } catch (err) {
      console.error('Error fetching my assignments:', err);
      setError(err.response?.data?.message || 'Failed to load your assignments');
    }
  }, []);

  // Fetch completed deliveries
  const fetchCompleted = useCallback(async () => {
    try {
      const response = await api.get('/delivery-assignments/my-assignments?status=delivered');
      setCompleted(response.data.assignments || []);
    } catch (err) {
      console.error('Error fetching completed deliveries:', err);
    }
  }, []);

  // Live GPS tracking
  const startLiveTracking = useCallback(() => {
    if (!activeDelivery) return;
    
    setLiveTracking(true);
    
    // Get current position
    if (navigator.geolocation) {
      // Get initial position immediately
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          calculateETA(location);
          
          // Show success message
          console.log('✅ GPS location acquired:', location);
        },
        (err) => {
          console.error('❌ GPS error:', err);
          // Set a mock location for demo purposes
          const mockLocation = {
            lat: 9.7479, // Vaikom coordinates
            lng: 76.5276
          };
          setCurrentLocation(mockLocation);
          calculateETA(mockLocation);
          console.log('📍 Using mock location for demo:', mockLocation);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      
      // Set up interval for continuous tracking
      locationIntervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setCurrentLocation(location);
            
            // Update location to server (with error handling)
            if (activeDelivery) {
              api.put(`/delivery-assignments/${activeDelivery._id}/location`, { location })
                .catch(err => {
                  console.log('📍 Location update failed (using local tracking):', err.message);
                  // Continue with local tracking even if server update fails
                });
            }
            
            // Calculate ETA
            calculateETA(location);
            
            // Trigger route monitoring every 2 minutes (120 seconds)
            if (Date.now() % 120000 < 15000) { // Check every ~15 seconds of the 2-minute interval
              monitorRoute();
            }
          },
          (err) => {
            console.error('GPS tracking error:', err);
            // Use last known location or mock location
            if (!currentLocation) {
              const mockLocation = {
                lat: 9.7479,
                lng: 76.5276
              };
              setCurrentLocation(mockLocation);
              calculateETA(mockLocation);
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }, 15000); // Update every 15 seconds (more frequent)
    } else {
      // Fallback for browsers without geolocation
      const mockLocation = {
        lat: 9.7479,
        lng: 76.5276
      };
      setCurrentLocation(mockLocation);
      calculateETA(mockLocation);
      console.log('📍 Geolocation not supported, using mock location');
    }
  }, [activeDelivery, currentLocation]);
  
  const stopLiveTracking = useCallback(() => {
    setLiveTracking(false);
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  }, []);
  
  // Calculate ETA based on current location
  const calculateETA = useCallback((location) => {
    if (!activeDelivery || !location) return;
    
    try {
      // Get delivery location coordinates
      const deliveryCoords = activeDelivery.deliveryLocation?.coordinates || 
                           activeDelivery.deliveryLocation?.lat ? 
                           { lat: activeDelivery.deliveryLocation.lat, lng: activeDelivery.deliveryLocation.lng } :
                           { lat: 9.7479, lng: 76.5276 }; // Default Vaikom coordinates
      
      // Calculate distance (simplified)
      const distance = calculateDistance(location, deliveryCoords);
      
      // Estimate time based on distance and average speed (considering traffic)
      const avgSpeed = 25; // km/h in city with traffic
      const timeInMinutes = (distance / avgSpeed) * 60;
      
      // Add buffer time for traffic and stops
      const bufferTime = 5; // 5 minutes buffer
      const totalETA = Math.round(timeInMinutes + bufferTime);
      
      setEta(totalETA);
      console.log(`📍 ETA calculated: ${totalETA} minutes (distance: ${distance.toFixed(2)} km)`);
    } catch (error) {
      console.error('ETA calculation error:', error);
      setEta(15); // Default fallback ETA
    }
  }, [activeDelivery]);
  
  // Helper function to calculate distance between two coordinates
  const calculateDistance = (coord1, coord2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  // Start tracking when active delivery changes
  useEffect(() => {
    if (activeDelivery && activeDelivery.status !== 'delivered') {
      startLiveTracking();
    } else {
      stopLiveTracking();
    }
  }, [activeDelivery, startLiveTracking, stopLiveTracking]);
  
  // AI Route Optimization
  const optimizeRoute = useCallback(async () => {
    if (!activeDelivery || !currentLocation) return;
    
    try {
      const response = await api.post(`/delivery-assignments/${activeDelivery._id}/optimize-route`, {
        currentLocation
      });
      
      setRouteOptimization(response.data.route);
      setSuccess('Route optimized! Saves ' + response.data.route.savings);
    } catch (err) {
      console.error('Route optimization error:', err);
      setError('Route optimization failed');
      // Fallback to mock data
      const optimizedRoute = {
        distance: 4.2,
        duration: 15,
        trafficLevel: 'Medium',
        savings: '10 minutes',
        coordinates: [
          currentLocation,
          activeDelivery.deliveryLocation?.coordinates || { lat: 9.7479, lng: 76.5276 }
        ]
      };
      
      setRouteOptimization(optimizedRoute);
    }
  }, [activeDelivery, currentLocation]);
  
  // Send customer notification
  const sendCustomerNotification = useCallback(async (status, additionalData = {}) => {
    if (!activeDelivery) return;
    
    try {
      await api.post(`/delivery-assignments/${activeDelivery._id}/customer-notification`, {
        status,
        location: currentLocation,
        estimatedTime: eta,
        ...additionalData
      });
      console.log('📧 Customer notification sent for status:', status);
    } catch (err) {
      console.log('📧 Customer notification failed (continuing with delivery):', err.message);
      // Continue with delivery even if notification fails
    }
  }, [activeDelivery, currentLocation, eta]);
  
  // Update delivery status
  const updateDeliveryStatus = useCallback(async (newStatus) => {
    if (!activeDelivery) return;
    
    try {
      let endpoint = '';
      let payload = {};
      
      switch (newStatus) {
        case 'picked_up':
          endpoint = `/delivery-assignments/${activeDelivery._id}/pickup`;
          payload = {
            pickupTime: new Date(),
            pickupLocation: currentLocation || { lat: 9.7479, lng: 76.5276 }
          };
          break;
        case 'in_transit':
          endpoint = `/delivery-assignments/${activeDelivery._id}/location`;
          payload = {
            location: currentLocation || { lat: 9.7479, lng: 76.5276 },
            status: 'in_transit',
            transitStartTime: new Date()
          };
          break;
        case 'delivered':
          endpoint = `/delivery-assignments/${activeDelivery._id}/deliver`;
          payload = {
            deliveredTime: new Date(),
            deliveryLocation: currentLocation || activeDelivery.deliveryLocation?.coordinates || { lat: 9.7479, lng: 76.5276 },
            notes: 'Delivered successfully'
          };
          break;
        default:
          return;
      }
      
      const response = await api.put(endpoint, payload);
      setActiveDelivery(response.data.assignment);
      setSuccess(`Delivery status updated to ${newStatus.replace('_', ' ')}`);
      
      // Send customer notification
      await sendCustomerNotification(newStatus, {
        timestamp: new Date(),
        notes: payload.notes
      });
      
      // Stop tracking if delivered
      if (newStatus === 'delivered') {
        stopLiveTracking();
      }
    } catch (err) {
      console.error('Status update failed:', err);
      setError('Failed to update delivery status');
    }
  }, [activeDelivery, currentLocation, sendCustomerNotification, stopLiveTracking]);
  
  // Fetch performance metrics
  const fetchPerformanceMetrics = useCallback(async () => {
    try {
      const response = await api.get('/delivery-assignments/metrics');
      setPerformanceMetrics(response.data);
    } catch (err) {
      console.error('Failed to fetch performance metrics:', err);
      // Fallback to mock data
      const metrics = {
        successRate: 95,
        avgDeliveryTime: 28,
        customerRating: 4.6,
        totalDeliveries: 32,
        onTimeDeliveries: 30,
        lateDeliveries: 2,
        failedDeliveries: 1
      };
      setPerformanceMetrics(metrics);
    }
  }, []);
  
  // Fetch earnings breakdown
  const fetchEarningsBreakdown = useCallback(async () => {
    try {
      const response = await api.get('/delivery-assignments/earnings');
      setEarningsBreakdown(response.data);
    } catch (err) {
      console.error('Failed to fetch earnings breakdown:', err);
      // Fallback to mock data
      const breakdown = {
        today: 850,
        week: 4200,
        month: 16800,
        total: 16800,
        dailyAverage: 280,
        weeklyAverage: 1050,
        monthlyAverage: 4200
      };
      setEarningsBreakdown(breakdown);
    }
  }, []);
  
  // Fetch delivery history
  const fetchDeliveryHistory = useCallback(async () => {
    try {
      const response = await api.get('/delivery-assignments/my-assignments?status=delivered');
      const history = response.data.assignments || [];
      setDeliveryHistory(history);
    } catch (err) {
      console.error('Failed to fetch delivery history:', err);
    }
  }, []);
  
  // Handle order details
  const showOrderDetails = useCallback((order) => {
    setSelectedOrder(order);
    setOrderDetailsOpen(true);
  }, []);
  
  // Handle customer contact
  const contactCustomer = useCallback((type) => {
    if (!selectedOrder) return;
    
    if (type === 'call') {
      const phone = selectedOrder.deliveryLocation?.phone || selectedOrder.customer?.phone;
      if (phone) {
        window.open(`tel:${phone}`, '_self');
      }
    } else if (type === 'chat') {
      setCustomerContactOpen(true);
    }
  }, [selectedOrder]);
  
  // Handle proof upload
  const uploadProof = useCallback(async (file) => {
    if (!activeDelivery) return;
    
    try {
      // If file is provided, upload it first
      if (file) {
        const formData = new FormData();
        formData.append('photo', file);
        
        await api.post(`/delivery-assignments/${activeDelivery._id}/proof`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Handle other proof methods (signature, OTP)
        await api.post(`/delivery-assignments/${activeDelivery._id}/proof`, {
          method: 'signature', // or 'otp'
          timestamp: new Date()
        });
      }
      
      setSuccess('Proof of delivery uploaded successfully');
      setProofUploadOpen(false);
    } catch (err) {
      setError('Failed to upload proof');
    }
  }, [activeDelivery]);
  
  // Add notification
  const addNotification = useCallback((notification) => {
    const newNotification = {
      id: Date.now(),
      ...notification,
      timestamp: new Date()
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 10)); // Keep only last 10
  }, []);
  
  // Cleanup intervals
  useEffect(() => {
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, []);
  
  // Start tracking when active delivery changes
  useEffect(() => {
    if (activeDelivery && activeDelivery.status !== 'delivered') {
      startLiveTracking();
    } else {
      stopLiveTracking();
    }
  }, [activeDelivery, startLiveTracking, stopLiveTracking]);
  
  // AI Delivery Failure Risk Analysis
  const fetchDeliveryFailureRisk = useCallback(async () => {
    try {
      const response = await api.get('/delivery-assignments/risk-analysis');
      setDeliveryFailureRisk(response.data);
    } catch (err) {
      console.error('Failed to fetch delivery risk analysis:', err);
      // Fallback to mock data
      const riskAnalysis = {
        overallRisk: 'Low',
        riskScore: 15,
        factors: [
          { factor: 'Weather Conditions', risk: 'Low', impact: 5 },
          { factor: 'Traffic Density', risk: 'Medium', impact: 8 },
          { factor: 'Customer Location', risk: 'Low', impact: 3 },
          { factor: 'Time of Day', risk: 'Low', impact: 4 },
          { factor: 'Order Complexity', risk: 'Low', impact: 2 }
        ],
        recommendations: [
          'Optimal route detected',
          'Weather conditions favorable',
          'Customer location accessible'
        ],
        confidence: 92
      };
      setDeliveryFailureRisk(riskAnalysis);
    }
  }, []);
  
  // AI Anomaly Detection
  const fetchAnomalyDetection = useCallback(async () => {
    try {
      const response = await api.get('/delivery-assignments/anomaly-detection');
      setAnomalyDetection(response.data);
    } catch (err) {
      console.error('Failed to fetch anomaly detection:', err);
      // Fallback to mock data
      const anomalies = [
        {
          id: 1,
          type: 'Route Deviation',
          severity: 'Medium',
          description: 'Suggested route is 15% longer than usual',
          recommendation: 'Consider alternative route via Main Street',
          timestamp: new Date(Date.now() - 300000)
        },
        {
          id: 2,
          type: 'Unusual Delay Pattern',
          severity: 'Low',
          description: 'Current delivery time is 10 mins above average',
          recommendation: 'Monitor traffic conditions',
          timestamp: new Date(Date.now() - 600000)
        }
      ];
      setAnomalyDetection(anomalies);
    }
  }, []);
  
  // AI Earnings Forecast
  const fetchEarningsForecast = useCallback(async () => {
    try {
      const response = await api.get('/delivery-assignments/earnings-forecast');
      setEarningsForecast(response.data);
    } catch (err) {
      console.error('Failed to fetch earnings forecast:', err);
      // Fallback to mock data
      const forecast = {
        today: {
          predicted: 950,
          confidence: 88,
          range: { min: 850, max: 1050 }
        },
        week: {
          predicted: 4800,
          confidence: 85,
          range: { min: 4200, max: 5400 }
        },
        month: {
          predicted: 19200,
          confidence: 82,
          range: { min: 16800, max: 21600 }
        },
        factors: [
          { factor: 'Historical Performance', weight: 40, trend: 'Stable' },
          { factor: 'Seasonal Demand', weight: 25, trend: 'Increasing' },
          { factor: 'Weather Impact', weight: 20, trend: 'Neutral' },
          { factor: 'Market Conditions', weight: 15, trend: 'Positive' }
        ],
        insights: [
          'Weekend demand expected to increase by 15%',
          'Rainy season may affect delivery times',
          'New daycare centers in area boosting orders'
        ]
      };
      setEarningsForecast(forecast);
    }
  }, []);
  
  // Real-time route monitoring
  const monitorRoute = useCallback(async () => {
    if (!activeDelivery || !currentLocation) return;
    
    try {
      const response = await api.post(`/delivery-assignments/${activeDelivery._id}/monitor-route`, {
        currentLocation
      });
      
      // Update route optimization with monitoring data
      if (response.data.newRoute) {
        setRouteOptimizationAI(response.data.newRoute);
        setSuccess('Route recalculated: ' + response.data.recalculationReason);
      }
      
      // Update delivery progress
      if (response.data.deliveryProgress) {
        setDeliveryProgress(response.data.deliveryProgress);
      }
      
    } catch (err) {
      console.error('Route monitoring failed:', err);
    }
  }, [activeDelivery, currentLocation]);
  
  // Enhanced AI Route Optimization
  const fetchAdvancedRouteOptimization = useCallback(async () => {
    if (!activeDelivery || !currentLocation) return;
    
    try {
      const response = await api.post(`/delivery-assignments/${activeDelivery._id}/advanced-route-optimization`, {
        currentLocation
      });
      setRouteOptimizationAI(response.data.route);
      
      // Initialize delivery progress
      if (response.data.route?.primaryRoute?.waypoints) {
        setDeliveryProgress({
          currentWaypoint: response.data.route.primaryRoute.waypoints[0],
          nextStop: response.data.route.primaryRoute.waypoints[1],
          progressPercentage: 0,
          remainingDistance: response.data.route.primaryRoute.totalDistance,
          eta: response.data.route.primaryRoute.totalDuration,
          completedWaypoints: [],
          upcomingWaypoints: response.data.route.primaryRoute.waypoints.slice(1)
        });
      }
    } catch (err) {
      console.error('Failed to fetch advanced route optimization:', err);
      // Fallback to mock data
      const advancedOptimization = {
        primaryRoute: {
          sequence: [{ name: activeDelivery.customerName, priority: 'normal' }],
          distance: 4.2,
          duration: 15,
          trafficLevel: 'Medium',
          confidence: 94,
          waypoints: [
            { name: 'Current Location', coords: currentLocation, eta: 0, type: 'current' },
            { name: 'Pickup - TinyTots Store', coords: activeDelivery.pickupLocation?.coordinates, eta: 8, type: 'pickup' },
            { name: 'Delivery - Customer', coords: activeDelivery.deliveryLocation?.coordinates, eta: 15, type: 'delivery', priority: 'normal' }
          ]
        },
        alternativeRoutes: [
          {
            name: 'Highway Route',
            sequence: [{ name: activeDelivery.customerName, priority: 'normal' }],
            distance: 5.1,
            duration: 12,
            advantage: 'Faster despite longer distance',
            trafficLevel: 'Light'
          },
          {
            name: 'City Center Route',
            sequence: [{ name: activeDelivery.customerName, priority: 'normal' }],
            distance: 3.8,
            duration: 18,
            advantage: 'Shorter distance',
            trafficLevel: 'Heavy'
          }
        ],
        aiInsights: [
          'Highway route recommended during rush hours',
          'City center route best for non-peak hours',
          'Current traffic patterns suggest 7-minute delay on primary route'
        ],
        priorityAdjustments: [],
        realTimeFactors: {
          trafficImpact: {
            baseDuration: 15,
            adjustedDuration: 18,
            delayMinutes: 3,
            impactLevel: 'Medium'
          },
          weatherImpact: {
            condition: 'Clear',
            temperature: 28,
            visibility: 1.0,
            windSpeed: 10,
            impact: 'Low'
          },
          timeOfDayImpact: {
            period: 'Afternoon',
            impactMultiplier: 1.0,
            recommendation: 'Optimal delivery conditions'
          }
        },
        recommendations: [
          'Start with pickup at TinyTots Store before deliveries',
          'Send ETA updates to customers before arrival',
          'Call customers 5 minutes before arrival for smooth delivery'
        ],
        optimizationScore: 87
      };
      setRouteOptimizationAI(advancedOptimization);
    }
  }, [activeDelivery, currentLocation]);
  
  // Load AI features
  useEffect(() => {
    fetchDeliveryFailureRisk();
    fetchAnomalyDetection();
    fetchEarningsForecast();
    if (activeDelivery) {
      fetchAdvancedRouteOptimization();
    }
  }, [fetchDeliveryFailureRisk, fetchAnomalyDetection, fetchEarningsForecast, fetchAdvancedRouteOptimization, activeDelivery]);
  
  // Simulate new order notifications
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance every 30 seconds
        addNotification({
          type: 'new_order',
          title: '🔔 New Delivery Order',
          message: 'Pickup: TinyTots Store, Drop: Vaikom, Distance: 4 km',
          priority: 'high'
        });
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [addNotification]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      // Calculate stats from completed deliveries
      const today = new Date().toDateString();
      const todayDeliveries = completed.filter(d => 
        new Date(d.deliveredAt).toDateString() === today
      );
      
      const todayEarnings = todayDeliveries.reduce((sum, d) => sum + (d.agentShare || 0), 0);
      const avgRating = completed.length > 0 
        ? completed.reduce((sum, d) => sum + (d.rating || 0), 0) / completed.length 
        : 0;
      
      // Calculate weekly and monthly earnings
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const weeklyDeliveries = completed.filter(d => 
        new Date(d.deliveredAt) >= weekStart
      );
      const weeklyEarnings = weeklyDeliveries.reduce((sum, d) => sum + (d.agentShare || 0), 0);
      
      const monthlyDeliveries = completed.filter(d => 
        new Date(d.deliveredAt) >= monthStart
      );
      const monthlyEarnings = monthlyDeliveries.reduce((sum, d) => sum + (d.agentShare || 0), 0);
      
      // Calculate success rate and average delivery time
      const successRate = completed.length > 0 
        ? (completed.filter(d => d.status === 'delivered').length / completed.length) * 100
        : 0;
      
      const avgDeliveryTime = completed.length > 0
        ? completed.reduce((sum, d) => sum + (d.actualDuration || 0), 0) / completed.length
        : 0;
      
      setStats({
        todayDeliveries: todayDeliveries.length,
        todayEarnings: todayEarnings,
        avgRating: avgRating,
        onTimeRate: 97, // TODO: Calculate from actual data
        totalOrders: orders.length + (activeDelivery ? 1 : 0),
        weeklyEarnings: weeklyEarnings,
        monthlyEarnings: monthlyEarnings,
        totalDeliveries: completed.length,
        successRate: successRate,
        avgDeliveryTime: avgDeliveryTime,
      });
    } catch (err) {
      console.error('Error calculating stats:', err);
    }
  }, [completed, orders, activeDelivery]);

  // Load all data on mount (manual refresh button available instead of auto-interval)
  const loadData = useCallback(async () => {
    await Promise.all([
      fetchAvailableAssignments(),
      fetchMyAssignments(),
      fetchCompleted()
    ]);
  }, [fetchAvailableAssignments, fetchMyAssignments, fetchCompleted]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update stats when data changes
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleAccept = async (assignmentId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await api.put(`/delivery-assignments/${assignmentId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Assignment accepted:', response.data);
      setSuccess('Assignment accepted! Go to Active Delivery tab.');
      
      // Send customer notification for accepted order
      await api.post(`/delivery-assignments/${assignmentId}/customer-notification`, {
        status: 'accepted',
        timestamp: new Date(),
        notes: 'Delivery agent has accepted your order'
      });
      
      console.log('📧 Customer notified about order acceptance');
      
      await Promise.all([fetchAvailableAssignments(), fetchMyAssignments()]);
      setTab(1); // jump to Active Delivery tab after acceptance
    } catch (err) {
      console.error('Error accepting assignment:', err);
      setError(err.response?.data?.message || 'Failed to accept assignment');
      if (err.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleCompleteActive = async () => {
    if (!activeDelivery) return;
    try {
      // If the assignment is accepted but not yet picked up, mark it picked up first
      if (activeDelivery.status === 'accepted') {
        await api.put(`/delivery-assignments/${activeDelivery._id}/pickup`, {
          location: activeDelivery.pickupLocation?.coordinates || null,
        });
      }

      await api.put(`/delivery-assignments/${activeDelivery._id}/deliver`, {
        notes: 'Delivered successfully'
      });
      setSuccess('Delivery completed. Great job!');
      await Promise.all([fetchMyAssignments(), fetchCompleted()]);
      setActiveDelivery(null);
    } catch (err) {
      console.error('Error completing delivery:', err);
      setError(err.response?.data?.message || 'Failed to complete delivery');
    }
  };

  const ordersCount = orders.length;

  return (
    <Box sx={{ p: 3, bgcolor: '#f7f8fb', minHeight: '100vh' }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Delivery Agent Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.firstName} {user?.lastName} - Agent #{user?.staff?.agentId || user?._id?.slice(-6) || 'N/A'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip 
            color={liveTracking ? "success" : "default"} 
            label={liveTracking ? "Live Tracking" : "Offline"} 
            icon={<GpsFixed />} 
          />
          <Badge badgeContent={notifications.length} color="error">
            <IconButton
              color="inherit"
              onClick={(e) => setNotificationAnchor(e.currentTarget)}
            >
              <Notifications />
            </IconButton>
          </Badge>
          <Button variant="outlined" startIcon={<ErrorOutline />} onClick={() => setError('Contact support: placeholder action')}>
            Report Issue
          </Button>
          <Avatar sx={{ bgcolor: '#13b655', width: 36, height: 36, fontSize: '1rem' }}>
            {user?.name?.charAt(0).toUpperCase() || 'D'}
          </Avatar>
          <Tooltip title="Shop">
            <IconButton size="large" onClick={() => navigate('/shop')}>
              <ShoppingCart />
            </IconButton>
          </Tooltip>
          <Tooltip title="Profile">
            <IconButton size="large" sx={{ ml: 1 }} onClick={() => navigate('/profile')}>
              <Avatar sx={{ bgcolor: '#14B8A6' }}>
                <AccountCircle />
              </Avatar>
            </IconButton>
          </Tooltip>
          <Button 
            variant="outlined" 
            startIcon={<Logout />}
            onClick={() => {
              logout();
              navigate('/');
            }}
            sx={{ 
              ml: 1,
              textTransform: 'none',
              borderColor: '#d32f2f',
              color: '#d32f2f',
              '&:hover': {
                borderColor: '#b71c1c',
                backgroundColor: 'rgba(211, 47, 47, 0.04)'
              }
            }}
          >
            Logout
          </Button>
        </Stack>
      </Paper>

      {/* Enhanced Stats */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
            <Typography color="text.secondary">Today</Typography>
            <Typography variant="h4">{stats.todayDeliveries}</Typography>
            <Typography variant="caption" color="text.secondary">Deliveries</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
            <Typography color="text.secondary">Today</Typography>
            <Typography variant="h4" sx={{ color: '#13b655' }}>{fmtINR(stats.todayEarnings)}</Typography>
            <Typography variant="caption" color="text.secondary">Earnings</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
            <Typography color="text.secondary">This Week</Typography>
            <Typography variant="h4" sx={{ color: '#2196f3' }}>{fmtINR(stats.weeklyEarnings)}</Typography>
            <Typography variant="caption" color="text.secondary">Earnings</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
            <Typography color="text.secondary">This Month</Typography>
            <Typography variant="h4" sx={{ color: '#9c27b0' }}>{fmtINR(stats.monthlyEarnings)}</Typography>
            <Typography variant="caption" color="text.secondary">Earnings</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
            <Typography color="text.secondary">Success Rate</Typography>
            <Typography variant="h4" sx={{ color: '#ff9800' }}>{stats.successRate.toFixed(1)}%</Typography>
            <Typography variant="caption" color="text.secondary">Performance</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
            <Typography color="text.secondary">Avg Time</Typography>
            <Typography variant="h4" sx={{ color: '#f44336' }}>{Math.round(stats.avgDeliveryTime)}m</Typography>
            <Typography variant="caption" color="text.secondary">Delivery</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ minHeight: 44 }}>
          <Tab label={`Available Orders`} icon={<LocalShipping />} iconPosition="start" sx={{ textTransform: 'none' }} />
          <Tab label="Active Delivery" icon={<Schedule />} iconPosition="start" sx={{ textTransform: 'none' }} />
          <Tab label="Performance" icon={<Assessment />} iconPosition="start" sx={{ textTransform: 'none' }} />
          <Tab label="AI Insights" icon={<Analytics />} iconPosition="start" sx={{ textTransform: 'none' }} />
          <Tab label="Earnings" icon={<MonetizationOn />} iconPosition="start" sx={{ textTransform: 'none' }} />
          <Tab label="History" icon={<History />} iconPosition="start" sx={{ textTransform: 'none' }} />
          <Tab label="Map & Routes" icon={<Place />} iconPosition="start" sx={{ textTransform: 'none' }} />
        </Tabs>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Chip label={`${ordersCount} Orders`} color="warning" variant="outlined" />
        </Stack>
      </Box>

      {/* Available Orders */}
      {tab === 0 && (
        <Stack spacing={2}>
          {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
          {!loading && orders.length === 0 && <Typography color="text.secondary">No available orders at the moment.</Typography>}
          {!loading && orders.map((assignment) => (
            <Accordion
              key={assignment._id}
              disableGutters
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 10px 24px rgba(0,0,0,0.05)',
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Grid container spacing={1.5} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Stack spacing={0.25}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle1" fontWeight={800}>
                          {assignment.orderNumber || assignment.order?.orderNumber || 'Order'}
                        </Typography>
                        <Chip
                          size="small"
                          label={humanStatus(assignment.status)}
                          color={statusChipColor(assignment.status)}
                          variant="outlined"
                        />
                        {assignment.assignmentType === 'auto' && (
                          <Chip size="small" label="Auto-assigned" color="success" />
                        )}
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip
                          size="small"
                          icon={<Inventory2 />}
                          label={`${assignment.items?.length || 0} items`}
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          icon={<Place />}
                          label={`${assignment.pickupLocation?.zone || 'Pickup'} → ${assignment.deliveryLocation?.zone || 'Drop'}`}
                          variant="outlined"
                        />
                      </Stack>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={5}>
                    <Stack spacing={0.25}>
                      <Typography variant="body2" color="text.secondary">
                        <Storefront sx={{ fontSize: 18, verticalAlign: 'text-bottom', mr: 0.75 }} />
                        {assignment.vendorName || assignment.vendor?.vendorName || 'Vendor'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        <PersonPinCircle sx={{ fontSize: 18, verticalAlign: 'text-bottom', mr: 0.75 }} />
                        {assignment.deliveryLocation?.contactPerson || assignment.customerName || assignment.customer?.firstName || 'Customer'}
                      </Typography>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} alignItems="center">
                      <Chip
                        label={fmtINR(assignment.agentShare)}
                        sx={{ backgroundColor: '#f3fff8', color: '#13b655', fontWeight: 800 }}
                      />
                      <Chip
                        size="small"
                        label={`Fee ${fmtINR(assignment.deliveryFee)}`}
                        color="info"
                        variant="outlined"
                      />
                    </Stack>
                  </Grid>
                </Grid>
              </AccordionSummary>

              <AccordionDetails sx={{ bgcolor: '#fff' }}>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<Assessment />}
                  onClick={() => showOrderDetails(assignment)}
                  sx={{ mb: 2 }}
                >
                  View Full Details
                </Button>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Storefront sx={{ color: 'text.secondary' }} />
                          <Typography fontWeight={800}>Pickup</Typography>
                        </Stack>
                        {assignment.pickupLocation?.contactPhone && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Phone />}
                            component={Link}
                            href={`tel:${assignment.pickupLocation.contactPhone}`}
                            underline="none"
                          >
                            Call
                          </Button>
                        )}
                      </Stack>

                      <Typography variant="body2" fontWeight={700} sx={{ mb: 0.25 }}>
                        {assignment.vendorName || assignment.vendor?.vendorName || 'Vendor'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {formatAddress(assignment.pickupLocation)}
                      </Typography>

                      {formatAddress(assignment.pickupLocation) && formatAddress(assignment.pickupLocation) !== 'Address not available' && (
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<Launch />}
                          component={Link}
                          href={mapLink(formatAddress(assignment.pickupLocation))}
                          target="_blank"
                          rel="noreferrer"
                          underline="none"
                        >
                          Open in Maps
                        </Button>
                      )}
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PersonPinCircle sx={{ color: 'text.secondary' }} />
                          <Typography fontWeight={800}>Drop</Typography>
                        </Stack>
                        {(assignment.deliveryLocation?.phone || assignment.customer?.phone) && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Phone />}
                            component={Link}
                            href={`tel:${assignment.deliveryLocation?.phone || assignment.customer?.phone}`}
                            underline="none"
                          >
                            Call
                          </Button>
                        )}
                      </Stack>

                      <Typography variant="body2" fontWeight={700} sx={{ mb: 0.25 }}>
                        {assignment.deliveryLocation?.contactPerson ||
                          assignment.customerName ||
                          assignment.customer?.firstName ||
                          'Customer'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {formatAddress(assignment.deliveryLocation)}
                      </Typography>

                      {formatAddress(assignment.deliveryLocation) && formatAddress(assignment.deliveryLocation) !== 'Address not available' && (
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<Launch />}
                          component={Link}
                          href={mapLink(formatAddress(assignment.deliveryLocation))}
                          target="_blank"
                          rel="noreferrer"
                          underline="none"
                        >
                          Open in Maps
                        </Button>
                      )}
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Inventory2 sx={{ color: 'text.secondary' }} />
                          <Typography fontWeight={800}>Products</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {assignment.items?.length || 0} items
                        </Typography>
                      </Stack>

                      {assignment.items?.length ? (
                        <Table size="small" aria-label="Products to deliver">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 800 }}>Item</TableCell>
                              <TableCell sx={{ fontWeight: 800 }} align="right">Qty</TableCell>
                              <TableCell sx={{ fontWeight: 800 }} align="right">Price</TableCell>
                              <TableCell sx={{ fontWeight: 800 }} align="right">Total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {assignment.items.map((item, idx) => {
                              const qty = Number(item.quantity || 1);
                              const price = Number(item.price || 0);
                              return (
                                <TableRow key={`${assignment._id}-item-${idx}`}>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={700}>
                                      {item.name || item.product?.name || `Item ${idx + 1}`}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">{qty}</TableCell>
                                  <TableCell align="right">{fmtINR(price)}</TableCell>
                                  <TableCell align="right">{fmtINR(price * qty)}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Product details not available for this assignment.
                        </Typography>
                      )}
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 0.5 }} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
                      <Button
                        variant="contained"
                        onClick={() => {
                          if (assignment.status === 'accepted' || assignment.status === 'picked_up' || assignment.status === 'in_transit') {
                            setTab(1);
                            return;
                          }
                          handleAccept(assignment._id);
                        }}
                        disabled={!['pending', 'assigned', 'accepted', 'picked_up', 'in_transit'].includes(assignment.status)}
                        sx={{
                          fontWeight: 800,
                          backgroundColor: '#14B8A6',
                          '&:hover': { backgroundColor: '#0d9488' },
                        }}
                      >
                        {assignment.status === 'accepted' || assignment.status === 'picked_up' || assignment.status === 'in_transit'
                          ? 'Go to Active Delivery'
                          : (assignment.assignmentType === 'auto' ? 'Accept Auto-Assigned Order' : 'Accept Order')}
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}

      {/* Enhanced Active Delivery */}
      {tab === 1 && !activeDelivery && (
        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
          <Typography variant="body1" color="text.secondary">
            No active delivery at the moment.
          </Typography>
        </Paper>
      )}

      {tab === 1 && activeDelivery && (
        <Grid container spacing={2}>
          {/* Live Tracking Card */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Live Order Tracking</Typography>
                <Stack direction="row" spacing={1}>
                  <Chip color={liveTracking ? "success" : "default"} label={liveTracking ? "Tracking Active" : "Tracking Off"} icon={<GpsFixed />} />
                  {eta && (
                    <Chip color="primary" label={`ETA: ${eta} mins`} icon={<Timer />} />
                  )}
                </Stack>
              </Stack>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
                  Order ID: #{activeDelivery.orderNumber || activeDelivery._id?.slice(-6)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Customer: {activeDelivery.deliveryLocation?.contactPerson || activeDelivery.customerName || 'Customer'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Status: {activeDelivery.status === 'delivered' ? 'Completed' : activeDelivery.status.replace('_', ' ').toUpperCase()}
                </Typography>
              </Box>
              
              {/* Progress Bar */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Delivery Progress</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={
                    activeDelivery.status === 'pending' ? 0 :
                    activeDelivery.status === 'assigned' ? 20 :
                    activeDelivery.status === 'accepted' ? 40 :
                    activeDelivery.status === 'picked_up' ? 60 :
                    activeDelivery.status === 'in_transit' ? 80 : 100
                  } 
                  sx={{ mt: 0.5 }}
                />
              </Box>
              
              {/* Status Update Buttons */}
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Button 
                  variant={activeDelivery.status === 'accepted' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => updateDeliveryStatus('picked_up')}
                  disabled={activeDelivery.status !== 'accepted'}
                  startIcon={<Inventory2 />}
                >
                  Picked Up
                </Button>
                <Button 
                  variant={activeDelivery.status === 'picked_up' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => updateDeliveryStatus('in_transit')}
                  disabled={activeDelivery.status !== 'picked_up'}
                  startIcon={<LocalShipping />}
                >
                  On the Way
                </Button>
                <Button 
                  variant={activeDelivery.status === 'in_transit' ? 'contained' : 'outlined'}
                  size="small"
                  color="success"
                  onClick={() => updateDeliveryStatus('delivered')}
                  disabled={activeDelivery.status !== 'in_transit'}
                  startIcon={<CheckCircle />}
                >
                  Delivered
                </Button>
              </Stack>
              
              {/* Customer Contact */}
              <Stack direction="row" spacing={1}>
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<Phone />}
                  onClick={() => contactCustomer('call')}
                >
                  Call Customer
                </Button>
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<Chat />}
                  onClick={() => contactCustomer('chat')}
                >
                  Chat
                </Button>
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<PhotoCamera />}
                  onClick={() => setProofUploadOpen(true)}
                >
                  Upload Proof
                </Button>
              </Stack>
            </Paper>
          </Grid>
          
          {/* Route Optimization Card */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6">Route Info</Typography>
                <Button 
                  size="small" 
                  variant="outlined" 
                  startIcon={<Route />}
                  onClick={optimizeRoute}
                >
                  Optimize
                </Button>
              </Stack>
              
              {routeOptimization ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Distance:</strong> {routeOptimization.distance} km
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Duration:</strong> {routeOptimization.duration} mins
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Traffic:</strong> {routeOptimization.trafficLevel}
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                    <strong>Saves:</strong> {routeOptimization.savings}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Distance:</strong> {activeDelivery.estimatedDistance || 'N/A'} km
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Earnings:</strong> {fmtINR(activeDelivery.agentShare || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click "Optimize" for AI route suggestions
                  </Typography>
                </Box>
              )}
            </Paper>
            
            {/* Child Product Safety */}
            <Paper sx={{ p: 2, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)', mt: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Security color="warning" />
                <Typography variant="h6">Child Safety</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Handle with care - Contains child products
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip size="small" label="Temperature Sensitive" icon={<Warning />} color="warning" variant="outlined" />
                <Chip size="small" label="Fragile" icon={<Security />} color="info" variant="outlined" />
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Performance Tab */}
      {tab === 2 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Performance Metrics</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main" sx={{ mb: 0.5 }}>
                      {performanceMetrics.successRate || 95}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Success Rate</Typography>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary.main" sx={{ mb: 0.5 }}>
                      {performanceMetrics.avgDeliveryTime || 28}m
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Avg Delivery Time</Typography>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main" sx={{ mb: 0.5 }}>
                      {performanceMetrics.customerRating || 4.6}⭐
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Customer Rating</Typography>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main" sx={{ mb: 0.5 }}>
                      {performanceMetrics.totalDeliveries || 32}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Total Deliveries</Typography>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Delivery Breakdown</Typography>
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2">On-time Deliveries</Typography>
                    <Typography variant="body2" color="success.main">
                      {performanceMetrics.onTimeDeliveries || 30}
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={94} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2">Late Deliveries</Typography>
                    <Typography variant="body2" color="warning.main">
                      {performanceMetrics.lateDeliveries || 2}
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={6} color="warning" sx={{ height: 8, borderRadius: 4 }} />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2">Failed Deliveries</Typography>
                    <Typography variant="body2" color="error.main">
                      {performanceMetrics.failedDeliveries || 1}
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={3} color="error" sx={{ height: 8, borderRadius: 4 }} />
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* AI Insights Tab */}
      {tab === 3 && (
        <Grid container spacing={2}>
          {/* Delivery Failure Risk */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <ReportProblem color="warning" />
                <Typography variant="h6">Delivery Failure Risk Analysis</Typography>
              </Stack>
              {deliveryFailureRisk && (
                <Stack spacing={2}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body1" fontWeight={600}>Overall Risk</Typography>
                      <Chip 
                        label={deliveryFailureRisk.overallRisk} 
                        color={deliveryFailureRisk.overallRisk === 'Low' ? 'success' : deliveryFailureRisk.overallRisk === 'Medium' ? 'warning' : 'error'}
                      />
                    </Stack>
                    <LinearProgress 
                      variant="determinate" 
                      value={deliveryFailureRisk?.riskScore || 0} 
                      color={deliveryFailureRisk?.riskScore < 30 ? 'success' : deliveryFailureRisk?.riskScore < 70 ? 'warning' : 'error'}
                      sx={{ mb: 2 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Risk Score: {deliveryFailureRisk.riskScore}/100 (Confidence: {deliveryFailureRisk.confidence}%)
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Risk Factors</Typography>
                    {deliveryFailureRisk.factors.map((factor, idx) => (
                      <Box key={idx} sx={{ mb: 1 }}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">{factor.factor}</Typography>
                          <Chip 
                            size="small" 
                            label={factor.risk}
                            color={factor.risk === 'Low' ? 'success' : factor.risk === 'Medium' ? 'warning' : 'error'}
                          />
                        </Stack>
                        <LinearProgress 
                          variant="determinate" 
                          value={factor?.impact || 0} 
                          sx={{ height: 4, mt: 0.5 }}
                        />
                      </Box>
                    ))}
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>AI Recommendations</Typography>
                    {deliveryFailureRisk.recommendations.map((rec, idx) => (
                      <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                        ✓ {rec}
                      </Typography>
                    ))}
                  </Box>
                </Stack>
              )}
            </Paper>
          </Grid>
          
          {/* Anomaly Detection */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Analytics color="info" />
                <Typography variant="h6">Anomaly Detection</Typography>
              </Stack>
              {anomalyDetection.length > 0 ? (
                <Stack spacing={2}>
                  {anomalyDetection.map((anomaly) => (
                    <Card key={anomaly.id} sx={{ p: 2, bgcolor: anomaly.severity === 'High' ? '#fff3e0' : anomaly.severity === 'Medium' ? '#e8f5e8' : '#f3f4f6' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                        <Typography variant="subtitle2">{anomaly.type}</Typography>
                        <Chip 
                          size="small" 
                          label={anomaly.severity}
                          color={anomaly.severity === 'High' ? 'error' : anomaly.severity === 'Medium' ? 'warning' : 'default'}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {anomaly.description}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Recommendation:</strong> {anomaly.recommendation}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(anomaly.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No anomalies detected at this time.
                </Typography>
              )}
            </Paper>
          </Grid>
          
          {/* Earnings Forecast */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <TrendingUp color="success" />
                <Typography variant="h6">AI Earnings Forecast</Typography>
              </Stack>
              {earningsForecast && (
                <Stack spacing={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Card sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="success.main">{fmtINR(earningsForecast.today.predicted)}</Typography>
                        <Typography variant="caption">Today</Typography>
                        <Typography variant="caption" color="text.secondary">{earningsForecast.today.confidence}% confidence</Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="primary.main">{fmtINR(earningsForecast.week.predicted)}</Typography>
                        <Typography variant="caption">This Week</Typography>
                        <Typography variant="caption" color="text.secondary">{earningsForecast.week.confidence}% confidence</Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="secondary.main">{fmtINR(earningsForecast.month.predicted)}</Typography>
                        <Typography variant="caption">This Month</Typography>
                        <Typography variant="caption" color="text.secondary">{earningsForecast.month.confidence}% confidence</Typography>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Forecast Factors</Typography>
                    {earningsForecast.factors.map((factor, idx) => (
                      <Box key={idx} sx={{ mb: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">{factor.factor}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ mr: 1 }}>{factor.weight}%</Typography>
                            <Chip 
                              size="small" 
                              label={factor.trend}
                              color={factor.trend === 'Increasing' ? 'success' : factor.trend === 'Decreasing' ? 'error' : 'default'}
                            />
                          </Box>
                        </Stack>
                        <LinearProgress variant="determinate" value={factor?.weight || 0} sx={{ height: 4, mt: 0.5 }} />
                      </Box>
                    ))}
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>AI Insights</Typography>
                    {earningsForecast.insights.map((insight, idx) => (
                      <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                        🧠 {insight}
                      </Typography>
                    ))}
                  </Box>
                </Stack>
              )}
            </Paper>
          </Grid>
          
          {/* Advanced Route Optimization */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Route color="primary" />
                  <Typography variant="h6">Advanced AI Route Optimization</Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={fetchAdvancedRouteOptimization}
                    disabled={!activeDelivery || !currentLocation}
                  >
                    <Refresh sx={{ mr: 1 }} /> Optimize Route
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={monitorRoute}
                    disabled={!activeDelivery || !currentLocation}
                  >
                    <GpsFixed sx={{ mr: 1 }} /> Monitor Route
                  </Button>
                </Stack>
              </Stack>
              
              {routeOptimizationAI ? (
                <Grid container spacing={3}>
                  {/* Primary Route Information */}
                  <Grid item xs={12} md={6}>
                    <Card sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                      <Typography variant="h6" sx={{ mb: 2 }}>🎯 Primary Route</Typography>
                      
                      {/* Route Metrics */}
                      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <Chip label={`${routeOptimizationAI.primaryRoute.totalDistance || routeOptimizationAI.primaryRoute.distance} km`} size="small" color="primary" />
                        <Chip label={`${routeOptimizationAI.primaryRoute.totalDuration || routeOptimizationAI.primaryRoute.duration} mins`} size="small" color="secondary" />
                        <Chip label={routeOptimizationAI.primaryRoute.trafficLevel} size="small" 
                          color={routeOptimizationAI.primaryRoute.trafficLevel === 'Heavy' ? 'error' : 
                                 routeOptimizationAI.primaryRoute.trafficLevel === 'Medium' ? 'warning' : 'success'} 
                        />
                        <Chip label={`${routeOptimizationAI.primaryRoute.confidence}% confidence`} size="small" color="success" />
                      </Stack>
                      
                      {/* Optimization Score */}
                      <Box sx={{ mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="body2">Optimization Score</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {routeOptimizationAI?.optimizationScore}/100
                          </Typography>
                        </Stack>
                        <LinearProgress 
                          variant="determinate" 
                          value={routeOptimizationAI?.optimizationScore || 0} 
                          sx={{ height: 8, borderRadius: 4 }}
                          color="success"
                        />
                      </Box>
                      
                      {/* Delivery Progress */}
                      {deliveryProgress && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>📍 Delivery Progress</Typography>
                          <Stack spacing={1}>
                            <Box>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2">Progress</Typography>
                                <Typography variant="body2">{deliveryProgress.progressPercentage}%</Typography>
                              </Stack>
                              <LinearProgress 
                                variant="determinate" 
                                value={deliveryProgress?.progressPercentage || 0} 
                                sx={{ height: 6, borderRadius: 3 }}
                                color="primary"
                              />
                            </Box>
                            
                            {deliveryProgress.nextStop && (
                              <Box>
                                <Typography variant="body2" color="primary.main" fontWeight={600}>
                                  Next Stop: {deliveryProgress.nextStop.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ETA: {deliveryProgress.eta} mins • Distance: {deliveryProgress.remainingDistance} km
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      )}
                      
                      {/* Waypoints */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>🗺️ Route Waypoints</Typography>
                        <Stack spacing={1}>
                          {routeOptimizationAI.primaryRoute.waypoints.map((waypoint, idx) => (
                            <Box key={idx} sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              p: 1, 
                              borderRadius: 1,
                              bgcolor: waypoint.type === 'current' ? '#e3f2fd' : 
                                       waypoint.type === 'pickup' ? '#fff3e0' : 
                                       waypoint.type === 'delivery' ? '#f3e5f5' : 'transparent',
                              border: deliveryProgress?.currentWaypoint?.name === waypoint.name ? '2px solid #2196f3' : '1px solid #e0e0e0'
                            }}>
                              <Box sx={{ mr: 2 }}>
                                {waypoint.type === 'current' && <GpsFixed color="primary" />}
                                {waypoint.type === 'pickup' && <Storefront color="warning" />}
                                {waypoint.type === 'delivery' && <Place color="secondary" />}
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={600}>
                                  {waypoint.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ETA: {waypoint.eta} mins
                                  {waypoint.priority && ` • Priority: ${waypoint.priority}`}
                                </Typography>
                              </Box>
                              {deliveryProgress?.completedWaypoints?.some(w => w.name === waypoint.name) && (
                                <CheckCircle color="success" sx={{ ml: 1 }} />
                              )}
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    </Card>
                  </Grid>
                  
                  {/* Alternative Routes & Insights */}
                  <Grid item xs={12} md={6}>
                    <Stack spacing={2}>
                      {/* Alternative Routes */}
                      {routeOptimizationAI.alternativeRoutes?.length > 0 && (
                        <Card sx={{ p: 2 }}>
                          <Typography variant="h6" sx={{ mb: 2 }}>🔄 Alternative Routes</Typography>
                          <Stack spacing={1.5}>
                            {routeOptimizationAI.alternativeRoutes.map((route, idx) => (
                              <Box key={idx} sx={{ 
                                p: 1.5, 
                                borderRadius: 1, 
                                border: '1px solid #e0e0e0',
                                bgcolor: '#fafafa'
                              }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                  <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                      {route.name}
                                    </Typography>
                                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                      <Chip label={`${route.totalDistance || route.distance} km`} size="small" variant="outlined" />
                                      <Chip label={`${route.totalDuration || route.duration} mins`} size="small" variant="outlined" />
                                      <Chip label={route.trafficLevel} size="small" variant="outlined" 
                                        color={route.trafficLevel === 'Heavy' ? 'error' : 
                                               route.trafficLevel === 'Medium' ? 'warning' : 'success'} 
                                      />
                                    </Stack>
                                  </Box>
                                  <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="caption" color="success.main" fontWeight={600}>
                                      {route.advantage}
                                    </Typography>
                                    {route?.optimizationScore && (
                                      <Typography variant="caption" color="text.secondary">
                                        Score: {route?.optimizationScore}/100
                                      </Typography>
                                    )}
                                  </Box>
                                </Stack>
                              </Box>
                            ))}
                          </Stack>
                        </Card>
                      )}
                      
                      {/* AI Insights */}
                      <Card sx={{ p: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>🤖 AI Insights</Typography>
                        <Stack spacing={1}>
                          {routeOptimizationAI.aiInsights.map((insight, idx) => (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start' }}>
                              <Typography variant="body2" sx={{ mr: 1 }}>💡</Typography>
                              <Typography variant="body2">{insight}</Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Card>
                      
                      {/* Real-time Factors */}
                      {routeOptimizationAI.realTimeFactors && (
                        <Card sx={{ p: 2 }}>
                          <Typography variant="h6" sx={{ mb: 2 }}>📊 Real-time Factors</Typography>
                          <Stack spacing={1.5}>
                            {/* Traffic Impact */}
                            {routeOptimizationAI.realTimeFactors.trafficImpact && (
                              <Box>
                                <Typography variant="body2" fontWeight={600}>🚦 Traffic Impact</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Base: {routeOptimizationAI.realTimeFactors.trafficImpact.baseDuration} mins → 
                                  Adjusted: {routeOptimizationAI.realTimeFactors.trafficImpact.adjustedDuration} mins
                                  {routeOptimizationAI.realTimeFactors.trafficImpact.delayMinutes > 0 && 
                                    ` (+${routeOptimizationAI.realTimeFactors.trafficImpact.delayMinutes} mins delay)`
                                  }
                                </Typography>
                                <Chip 
                                  label={routeOptimizationAI.realTimeFactors.trafficImpact.impactLevel} 
                                  size="small" 
                                  color={routeOptimizationAI.realTimeFactors.trafficImpact.impactLevel === 'High' ? 'error' : 
                                         routeOptimizationAI.realTimeFactors.trafficImpact.impactLevel === 'Medium' ? 'warning' : 'success'}
                                />
                              </Box>
                            )}
                            
                            {/* Weather Impact */}
                            {routeOptimizationAI.realTimeFactors.weatherImpact && (
                              <Box>
                                <Typography variant="body2" fontWeight={600}>🌤️ Weather Impact</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {routeOptimizationAI.realTimeFactors.weatherImpact.condition} • 
                                  {routeOptimizationAI.realTimeFactors.weatherImpact.temperature}°C • 
                                  Impact: {routeOptimizationAI.realTimeFactors.weatherImpact.impact}
                                </Typography>
                                <Typography variant="caption" color="primary.main">
                                  {routeOptimizationAI.realTimeFactors.weatherImpact.recommendation}
                                </Typography>
                              </Box>
                            )}
                            
                            {/* Time of Day Impact */}
                            {routeOptimizationAI.realTimeFactors.timeOfDayImpact && (
                              <Box>
                                <Typography variant="body2" fontWeight={600}>⏰ Time of Day</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {routeOptimizationAI.realTimeFactors.timeOfDayImpact.period} • 
                                  Impact: {routeOptimizationAI.realTimeFactors.timeOfDayImpact.impactMultiplier}x
                                </Typography>
                                <Typography variant="caption" color="primary.main">
                                  {routeOptimizationAI.realTimeFactors.timeOfDayImpact.recommendation}
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </Card>
                      )}
                      
                      {/* Priority Adjustments */}
                      {routeOptimizationAI.priorityAdjustments?.length > 0 && (
                        <Card sx={{ p: 2 }}>
                          <Typography variant="h6" sx={{ mb: 2 }}>⚡ Priority Adjustments</Typography>
                          <Stack spacing={1}>
                            {routeOptimizationAI.priorityAdjustments.map((adjustment, idx) => (
                              <Box key={idx} sx={{ p: 1, borderRadius: 1, bgcolor: '#fff3cd' }}>
                                <Typography variant="body2" fontWeight={600}>
                                  {adjustment.delivery}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {adjustment.reason}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Card>
                      )}
                      
                      {/* Recommendations */}
                      {routeOptimizationAI.recommendations?.length > 0 && (
                        <Card sx={{ p: 2 }}>
                          <Typography variant="h6" sx={{ mb: 2 }}>📋 Recommendations</Typography>
                          <Stack spacing={1}>
                            {routeOptimizationAI.recommendations.map((recommendation, idx) => (
                              <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                <Typography variant="body2" sx={{ mr: 1 }}>✓</Typography>
                                <Typography variant="body2">{recommendation}</Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Card>
                      )}
                    </Stack>
                  </Grid>
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Start a delivery to see AI route optimization.
                  </Typography>
                  <Button 
                    variant="contained" 
                    onClick={fetchAdvancedRouteOptimization}
                    disabled={!activeDelivery || !currentLocation}
                  >
                    Optimize Route
                  </Button>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Enhanced Earnings Tab */}
      {tab === 4 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Earnings Summary</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f3fff8' }}>
                    <Typography variant="h5" color="success.main" sx={{ mb: 0.5 }}>
                      {fmtINR(earningsBreakdown.today || stats.todayEarnings)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Today</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                    <Typography variant="h5" color="primary.main" sx={{ mb: 0.5 }}>
                      {fmtINR(earningsBreakdown.week || stats.weeklyEarnings)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">This Week</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5' }}>
                    <Typography variant="h5" color="secondary.main" sx={{ mb: 0.5 }}>
                      {fmtINR(earningsBreakdown.month || stats.monthlyEarnings)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">This Month</Typography>
                  </Card>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Averages</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6">{fmtINR(earningsBreakdown.dailyAverage || 280)}</Typography>
                      <Typography variant="caption" color="text.secondary">Daily Average</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6">{fmtINR(earningsBreakdown.weeklyAverage || 1050)}</Typography>
                      <Typography variant="caption" color="text.secondary">Weekly Average</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6">{fmtINR(earningsBreakdown.monthlyAverage || 4200)}</Typography>
                      <Typography variant="caption" color="text.secondary">Monthly Average</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Total Stats</Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Total Deliveries</Typography>
                  <Typography variant="h5">{stats.totalDeliveries}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Total Earnings</Typography>
                  <Typography variant="h5" color="success.main">{fmtINR(earningsBreakdown.total || 16800)}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Average Rating</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Rating value={stats.avgRating} precision={0.1} readOnly size="small" />
                    <Typography variant="body1" sx={{ ml: 1 }}>{stats.avgRating.toFixed(1)}</Typography>
                  </Box>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* History Tab */}
      {tab === 5 && (
        <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Delivery History</Typography>
          {deliveryHistory.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No delivery history available.
            </Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Earnings</TableCell>
                  <TableCell>Rating</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deliveryHistory.map((delivery) => (
                  <TableRow key={delivery._id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        #{delivery.orderNumber || delivery._id?.slice(-6)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {delivery.deliveredAt ? new Date(delivery.deliveredAt).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {delivery.deliveryLocation?.zone || 'Unknown'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={delivery.status === 'delivered' ? 'Delivered' : delivery.status}
                        color={delivery.status === 'delivered' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} color="success.main">
                        {fmtINR(delivery.agentShare || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {delivery.customerRating ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Rating value={delivery.customerRating} readOnly size="small" />
                          <Typography variant="caption" sx={{ ml: 1 }}>
                            {delivery.customerRating}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">No rating</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>
      )}
      {/* Map & Routes Tab */}
      {tab === 6 && (
        <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Map & Routes</Typography>
          <Box sx={{ height: 400, borderRadius: 2 }}>
            <DaycareLocationMap 
              showDirections={true} 
              showSearch={true}
              deliveryMode={true}
              activeDelivery={activeDelivery}
              currentLocation={currentLocation}
            />
          </Box>
        </Paper>
      )}
      
      {/* Order Details Dialog */}
      <Dialog open={orderDetailsOpen} onClose={() => setOrderDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Order Details</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 1 }}>Order Information</Typography>
                <Stack spacing={1}>
                  <Typography variant="body2"><strong>Order ID:</strong> #{selectedOrder.orderNumber || selectedOrder._id?.slice(-6)}</Typography>
                  <Typography variant="body2"><strong>Customer:</strong> {selectedOrder.deliveryLocation?.contactPerson || selectedOrder.customerName || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Address:</strong> {formatAddress(selectedOrder.deliveryLocation)}</Typography>
                  <Typography variant="body2"><strong>Phone:</strong> {selectedOrder.deliveryLocation?.phone || selectedOrder.customer?.phone || 'N/A'}</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 1 }}>Delivery Information</Typography>
                <Stack spacing={1}>
                  <Typography variant="body2"><strong>Status:</strong> {selectedOrder.status}</Typography>
                  <Typography variant="body2"><strong>Delivery Fee:</strong> {fmtINR(selectedOrder.deliveryFee || 0)}</Typography>
                  <Typography variant="body2"><strong>Your Earnings:</strong> {fmtINR(selectedOrder.agentShare || 0)}</Typography>
                  <Typography variant="body2"><strong>Estimated Time:</strong> {selectedOrder.estimatedDuration || 'N/A'} mins</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 1 }}>Products</Typography>
                {selectedOrder.items?.length > 0 ? (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.name || item.product?.name || 'Item'}</TableCell>
                          <TableCell align="right">{item.quantity || 1}</TableCell>
                          <TableCell align="right">{fmtINR(item.price || 0)}</TableCell>
                          <TableCell align="right">{fmtINR((item.price || 0) * (item.quantity || 1))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Typography variant="body2" color="text.secondary">No items found</Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={() => setNotificationAnchor(null)}
        PaperProps={{ sx: { maxHeight: 300, width: 300 } }}
      >
        <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>Notifications</Typography>
        {notifications.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No new notifications
          </Typography>
        ) : (
          notifications.map((notification) => (
            <MenuItem key={notification.id} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>{notification.title}</Typography>
                <Typography variant="caption" color="text.secondary">{notification.message}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
      
      {/* Proof Upload Dialog */}
      <Dialog open={proofUploadOpen} onClose={() => setProofUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Proof of Delivery</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Please upload a photo as proof of delivery
          </Typography>
          <Button
            variant="outlined"
            component="label"
            fullWidth
            startIcon={<Upload />}
          >
            Choose Photo
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  uploadProof(file);
                }
              }}
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProofUploadOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
      
      {/* Customer Contact Dialog */}
      <Dialog open={customerContactOpen} onClose={() => setCustomerContactOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Contact Customer</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Stack spacing={2}>
              <Typography variant="body2">
                <strong>Customer:</strong> {selectedOrder.deliveryLocation?.contactPerson || selectedOrder.customerName || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Phone:</strong> {selectedOrder.deliveryLocation?.phone || selectedOrder.customer?.phone || 'N/A'}
              </Typography>
              <TextField
                multiline
                rows={4}
                label="Message to Customer"
                fullWidth
                placeholder="Type your message here..."
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerContactOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => {
            setSuccess('Message sent to customer');
            setCustomerContactOpen(false);
          }}>
            Send Message
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeliveryDashboard;

