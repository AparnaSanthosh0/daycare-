import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Warning,
  Videocam,
  Refresh,
} from '@mui/icons-material';

/**
 * CameraDiagnostics Component
 * 
 * Helps users troubleshoot camera access issues
 */
const CameraDiagnostics = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(null);
  const [browserSupport, setBrowserSupport] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkBrowserSupport();
    checkPermissions();
    enumerateDevices();
  }, []);

  const checkBrowserSupport = () => {
    const support = {
      mediaDevices: !!navigator.mediaDevices,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      enumerateDevices: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
    };
    setBrowserSupport(support);
  };

  const checkPermissions = async () => {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' });
        setPermissions(result.state);
        
        result.addEventListener('change', () => {
          setPermissions(result.state);
        });
      } catch (err) {
        setPermissions('unknown');
      }
    } else {
      setPermissions('not-supported');
    }
  };

  const enumerateDevices = async () => {
    setLoading(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setDevices([]);
        return;
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      
      console.log('📹 Detected video devices:', videoDevices);
      setDevices(videoDevices);
    } catch (err) {
      console.error('Error enumerating devices:', err);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const testCamera = async (deviceId = null) => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const constraints = deviceId 
        ? { video: { deviceId: { exact: deviceId } }, audio: false }
        : { video: true, audio: false };
      
      console.log('Testing camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setTestResult({
        success: true,
        message: `Camera ${deviceId || 'default'} is working!`,
        stream: stream,
      });
      
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
      }, 2000);
      
    } catch (err) {
      console.error('Camera test failed:', err);
      setTestResult({
        success: false,
        message: err.message,
        errorName: err.name,
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (isSupported) => {
    return isSupported ? (
      <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
    ) : (
      <Cancel sx={{ color: 'error.main', mr: 1 }} />
    );
  };

  const getPermissionColor = (state) => {
    switch (state) {
      case 'granted': return 'success';
      case 'denied': return 'error';
      case 'prompt': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Videocam sx={{ mr: 1 }} />
        Camera Diagnostics
      </Typography>

      {/* Browser Support */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Browser Support
        </Typography>
        <List dense>
          <ListItem>
            {getStatusIcon(browserSupport.mediaDevices)}
            <ListItemText 
              primary="MediaDevices API"
              secondary={browserSupport.mediaDevices ? 'Supported' : 'Not supported'}
            />
          </ListItem>
          <ListItem>
            {getStatusIcon(browserSupport.getUserMedia)}
            <ListItemText 
              primary="getUserMedia API"
              secondary={browserSupport.getUserMedia ? 'Supported' : 'Not supported'}
            />
          </ListItem>
        </List>
      </Paper>

      {/* Permission Status */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Camera Permission Status
        </Typography>
        {permissions ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              label={permissions.toUpperCase()}
              color={getPermissionColor(permissions)}
              icon={permissions === 'granted' ? <CheckCircle /> : permissions === 'denied' ? <Cancel /> : <Warning />}
            />
            {permissions === 'denied' && (
              <Alert severity="error" sx={{ flex: 1 }}>
                Camera access is blocked. Click the camera icon in your browser's address bar to allow access.
              </Alert>
            )}
            {permissions === 'prompt' && (
              <Alert severity="info" sx={{ flex: 1 }}>
                Camera permission not yet granted. You'll be prompted when accessing the camera.
              </Alert>
            )}
          </Box>
        ) : (
          <CircularProgress size={24} />
        )}
      </Paper>

      {/* Available Cameras */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Available Camera Devices
          </Typography>
          <Button 
            startIcon={<Refresh />}
            onClick={enumerateDevices}
            size="small"
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : devices.length > 0 ? (
          <List>
            {devices.map((device, index) => (
              <React.Fragment key={device.deviceId}>
                <ListItem>
                  <ListItemText 
                    primary={device.label || `Camera ${index + 1}`}
                    secondary={`Device ID: ${device.deviceId.substring(0, 20)}...`}
                  />
                  <Button 
                    variant="outlined"
                    size="small"
                    onClick={() => testCamera(device.deviceId)}
                    disabled={testing}
                  >
                    Test
                  </Button>
                </ListItem>
                {index < devices.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Alert severity="warning">
            No camera devices detected. This is normal if you haven't granted camera permission yet.
            Try clicking "Test Default Camera" below to grant access.
          </Alert>
        )}
      </Paper>

      {/* Test Camera */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Quick Camera Test
        </Typography>
        <Stack spacing={2}>
          <Button 
            variant="contained"
            startIcon={testing ? <CircularProgress size={20} /> : <Videocam />}
            onClick={() => testCamera()}
            disabled={testing}
            fullWidth
          >
            {testing ? 'Testing...' : 'Test Default Camera'}
          </Button>
          
          {testResult && (
            <Alert severity={testResult.success ? 'success' : 'error'}>
              {testResult.success ? (
                <>
                  <strong>✅ Success!</strong> {testResult.message}
                </>
              ) : (
                <>
                  <strong>❌ Failed:</strong> {testResult.errorName} - {testResult.message}
                </>
              )}
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Troubleshooting Guide */}
      <Paper sx={{ p: 2, bgcolor: 'info.lighter' }}>
        <Typography variant="h6" gutterBottom>
          Troubleshooting Steps
        </Typography>
        <Typography variant="body2" component="div">
          <ol>
            <li>Click "Test Default Camera" above and allow camera access when prompted</li>
            <li>Check Device Manager (Win+X) - ensure camera is enabled</li>
            <li>Close other apps that might be using the camera (Skype, Zoom, Teams)</li>
            <li>Try a different browser (Chrome, Edge, Firefox)</li>
            <li>Restart your browser completely</li>
          </ol>
        </Typography>
      </Paper>
    </Box>
  );
};

export default CameraDiagnostics;
