import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  IconButton,
  Paper
} from '@mui/material';
import {
  CameraAlt,
  GpsFixed,
  Fingerprint,
  CheckCircle,
  Warning,
  Cancel,
  Refresh
} from '@mui/icons-material';
import api from '../config/api';

/**
 * BlockchainAttendanceCapture Component
 * 
 * Captures attendance with:
 * - Photo verification (cryptographic hash)
 * - GPS location proof
 * - Immutable blockchain recording
 * - Cannot be altered or deleted
 */
const BlockchainAttendanceCapture = ({
  open,
  onClose,
  entityType,
  entityId,
  entityName,
  actionType, // 'check-in' or 'check-out'
  onSuccess
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [useFallback, setUseFallback] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const steps = ['GPS Location', 'Photo Verification', 'Blockchain Recording'];

  // Initialize camera when component opens
  useEffect(() => {
    if (open && activeStep === 1) {
      initializeCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, activeStep]);

  // Get GPS location when component opens
  useEffect(() => {
    if (open && activeStep === 0) {
      getGPSLocation();
    }
  }, [open, activeStep]);

  const initializeCamera = async () => {
    setCameraError(null);
    
    // Check if mediaDevices is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera not supported by this browser. Please use file upload below.');
      setUseFallback(true);
      return;
    }

    try {
      // Try with specific constraints first
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 }
        });
      } catch (err1) {
        console.warn('Specific constraints failed, trying basic video:', err1);
        // Fallback to basic video request
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        } catch (err2) {
          console.warn('Basic video failed, trying any video device:', err2);
          // Last attempt: try to get any video device
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'user' } }
          });
        }
      }

      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraError(null);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      
      let errorMessage = 'Camera access failed. ';
      
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera detected. Please connect a camera or use file upload below.';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please enable camera access in your browser settings.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Camera is in use by another application. Please close other apps using the camera.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera does not meet requirements. Please try file upload below.';
      } else {
        errorMessage += err.message || 'Unknown error.';
      }
      
      setCameraError(errorMessage);
      setUseFallback(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const getGPSLocation = () => {
    setLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('GPS not supported by browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };

        // Reverse geocode to get address (optional)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}`
          );
          const data = await response.json();
          location.address = data.display_name;
        } catch (err) {
          console.warn('Could not fetch address:', err);
        }

        setGpsLocation(location);
        setLoading(false);
      },
      (err) => {
        console.error('GPS error:', err);
        let errorMessage = err.message;
        
        // Provide helpful instructions for permission denied
        if (err.code === 1 || err.message.includes('denied') || err.message.includes('denied')) {
          errorMessage = 'Location access denied. Please enable location permissions and refresh.';
        } else if (err.code === 2) {
          errorMessage = 'Location unavailable. Please check your device settings.';
        } else if (err.code === 3) {
          errorMessage = 'Location request timed out. Please try again.';
        }
        
        setGpsError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob
    canvas.toBlob((blob) => {
      setPhoto(blob);
      setPhotoPreview(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }, 'image/jpeg', 0.8);
  };

  const retakePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setCameraError(null);
    setUseFallback(false);
    initializeCamera();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file size must be less than 10MB');
      return;
    }

    // Read file and create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhoto(file);
      setPhotoPreview(e.target.result);
      setCameraError(null);
      stopCamera();
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !gpsLocation) {
      setError('GPS location is required for blockchain verification');
      return;
    }
    if (activeStep === 1 && !photo) {
      setError('Photo is required for blockchain verification');
      return;
    }
    setActiveStep((prev) => prev + 1);
    setError(null);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError(null);
  };

  const submitToBlockchain = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create FormData for photo upload
      const formData = new FormData();
      formData.append('photo', photo, `${actionType}_${entityId}_${Date.now()}.jpg`);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);
      formData.append('entityName', entityName);
      formData.append('latitude', gpsLocation.latitude);
      formData.append('longitude', gpsLocation.longitude);
      formData.append('accuracy', gpsLocation.accuracy);
      formData.append('address', gpsLocation.address || '');
      formData.append('deviceId', navigator.userAgent);

      // Submit to blockchain (immutable record)
      const response = await api.post(
        `/blockchain/attendance/${actionType}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        setResult(response.data);
        if (onSuccess) {
          onSuccess(response.data);
        }
      }
    } catch (err) {
      console.error('Error submitting to blockchain:', err);
      setError(err.response?.data?.error || 'Failed to record to blockchain');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setActiveStep(0);
    setPhoto(null);
    setPhotoPreview(null);
    setGpsLocation(null);
    setGpsError(null);
    setCameraError(null);
    setUseFallback(false);
    setError(null);
    setResult(null);
    onClose();
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // GPS Location
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <GpsFixed sx={{ fontSize: 80, color: gpsLocation ? 'success.main' : 'text.secondary', mb: 2 }} />
            
            {!gpsLocation && !gpsError && (
              <Alert severity="info" sx={{ mb: 2, textAlign: 'left', maxWidth: 600, mx: 'auto' }}>
                <Typography variant="body2">
                  <strong>Location Permission Required:</strong> This system needs to verify your GPS location 
                  to create an immutable attendance record. When prompted, please click "Allow" to grant location access.
                </Typography>
              </Alert>
            )}
            
            {loading && (
              <CircularProgress sx={{ display: 'block', mx: 'auto', mb: 2 }} />
            )}

            {gpsError && (
              <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  {gpsError}
                </Typography>
                <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                  <strong>How to enable location permissions:</strong>
                </Typography>
                <Typography variant="caption" display="block" sx={{ ml: 1 }}>
                  1. Click the lock icon (🔒) or info icon (ⓘ) in your browser's address bar
                </Typography>
                <Typography variant="caption" display="block" sx={{ ml: 1 }}>
                  2. Find "Location" permissions and set it to "Allow"
                </Typography>
                <Typography variant="caption" display="block" sx={{ ml: 1, mb: 1 }}>
                  3. Refresh this page or click "Retry" below
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={getGPSLocation}
                    startIcon={<Refresh />}
                  >
                    Retry
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </Button>
                </Box>
              </Alert>
            )}

            {gpsLocation && (
              <Card sx={{ maxWidth: 500, mx: 'auto' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="success.main">
                    <CheckCircle sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Location Verified
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Latitude: {gpsLocation.latitude.toFixed(6)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Longitude: {gpsLocation.longitude.toFixed(6)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Accuracy: ±{gpsLocation.accuracy.toFixed(0)}m
                  </Typography>
                  {gpsLocation.address && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {gpsLocation.address}
                    </Typography>
                  )}
                  <Chip
                    icon={<CheckCircle />}
                    label="GPS Proof Captured"
                    color="success"
                    size="small"
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </Card>
            )}

            {!loading && !gpsLocation && !gpsError && (
              <Button
                variant="contained"
                onClick={getGPSLocation}
                startIcon={<GpsFixed />}
              >
                Get GPS Location
              </Button>
            )}
          </Box>
        );

      case 1: // Photo Capture
        return (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {!photo ? (
              <>
                <Typography variant="body1" gutterBottom>
                  Take a photo for verification
                </Typography>
                
                {cameraError && (
                  <Alert severity="warning" sx={{ mb: 2, textAlign: 'left', maxWidth: 600, mx: 'auto' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      {cameraError}
                    </Typography>
                    <Typography variant="caption" display="block">
                      You can upload a photo instead using the button below.
                    </Typography>
                  </Alert>
                )}
                
                {!useFallback && (
                  <Paper sx={{ maxWidth: 640, mx: 'auto', mb: 2, overflow: 'hidden' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      style={{ width: '100%', display: 'block' }}
                    />
                  </Paper>
                )}
                
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {!useFallback && (
                    <Button
                      variant="contained"
                      size="large"
                      onClick={capturePhoto}
                      startIcon={<CameraAlt />}
                    >
                      Capture Photo
                    </Button>
                  )}
                  
                  <Button
                    variant={useFallback ? "contained" : "outlined"}
                    size="large"
                    onClick={() => fileInputRef.current?.click()}
                    startIcon={<CameraAlt />}
                  >
                    {useFallback ? 'Upload Photo' : 'Or Upload File'}
                  </Button>
                  
                  {cameraError && !useFallback && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => {
                        setUseFallback(false);
                        setCameraError(null);
                        initializeCamera();
                      }}
                      startIcon={<Refresh />}
                    >
                      Retry Camera
                    </Button>
                  )}
                </Box>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </>
            ) : (
              <>
                <Typography variant="h6" gutterBottom color="success.main">
                  <CheckCircle sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Photo Captured
                </Typography>
                <Paper sx={{ maxWidth: 640, mx: 'auto', mb: 2, overflow: 'hidden' }}>
                  <img
                    src={photoPreview}
                    alt="Captured"
                    style={{ width: '100%', display: 'block' }}
                  />
                </Paper>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    onClick={retakePhoto}
                    startIcon={<Refresh />}
                  >
                    Retake Photo
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => fileInputRef.current?.click()}
                    startIcon={<CameraAlt />}
                  >
                    Upload Different Photo
                  </Button>
                </Box>
                <Chip
                  icon={<Fingerprint />}
                  label="Photo will be cryptographically hashed"
                  size="small"
                  sx={{ mt: 2 }}
                />
              </>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </Box>
        );

      case 2: // Blockchain Recording
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            {!result ? (
              <>
                <Typography variant="h6" gutterBottom>
                  Ready to Record to Blockchain
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  This will create an immutable record that cannot be altered or deleted.
                </Typography>

                <Card sx={{ maxWidth: 500, mx: 'auto', mb: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Verification Summary:
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                      <Chip
                        icon={<CheckCircle />}
                        label="GPS Location Verified"
                        color="success"
                        size="small"
                      />
                      <Chip
                        icon={<CheckCircle />}
                        label="Photo Captured & Hashed"
                        color="success"
                        size="small"
                      />
                      <Chip
                        icon={<Fingerprint />}
                        label="Blockchain Recording Ready"
                        color="primary"
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>

                <Alert severity="warning" sx={{ maxWidth: 500, mx: 'auto', mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Important:</strong> Once recorded to blockchain, this {actionType} cannot be modified or deleted.
                  </Typography>
                </Alert>

                <Button
                  variant="contained"
                  size="large"
                  color="primary"
                  onClick={submitToBlockchain}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <Fingerprint />}
                >
                  {loading ? 'Recording to Blockchain...' : 'Record to Blockchain'}
                </Button>
              </>
            ) : (
              <>
                <CheckCircle sx={{ fontSize: 100, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom color="success.main">
                  Successfully Recorded!
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Your {actionType} has been recorded to the blockchain.
                </Typography>

                <Card sx={{ maxWidth: 600, mx: 'auto' }}>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Blockchain Details:
                    </Typography>
                    <Box sx={{ textAlign: 'left', mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        <strong>Block Number:</strong> #{result.blockNumber}
                      </Typography>
                      <Typography
                        variant="body2"
                        gutterBottom
                        sx={{
                          wordBreak: 'break-all',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem'
                        }}
                      >
                        <strong>Hash:</strong> {result.hash}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Time:</strong> {new Date(result.actionTime).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>GPS Verified:</strong> {result.gpsVerified ? '✅ Yes' : '❌ No'}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Photo Verified:</strong> {result.photoVerified ? '✅ Yes' : '❌ No'}
                      </Typography>
                    </Box>

                    <Alert severity="success" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        🔒 This record is now immutable and tamper-proof!
                      </Typography>
                    </Alert>
                  </CardContent>
                </Card>
              </>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {actionType === 'check-in' ? '📥 Check-In' : '📤 Check-Out'} - {entityName}
        <Typography variant="body2" color="text.secondary">
          Blockchain Attendance with GPS & Photo Verification
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        {!result && (
          <>
            <Button onClick={handleClose} startIcon={<Cancel />}>
              Cancel
            </Button>
            {activeStep > 0 && activeStep < 2 && (
              <Button onClick={handleBack}>
                Back
              </Button>
            )}
            {activeStep < 2 && (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={
                  (activeStep === 0 && !gpsLocation) ||
                  (activeStep === 1 && !photo)
                }
              >
                Next
              </Button>
            )}
          </>
        )}
        {result && (
          <Button variant="contained" onClick={handleClose} color="success">
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BlockchainAttendanceCapture;
