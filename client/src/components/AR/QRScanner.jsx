import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { isMobile } from 'react-device-detect';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Alert,
  LinearProgress,
  Stack,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import {
  Close,
  CameraAlt,
  FlipCameraAndroid,
  QrCodeScanner,
} from '@mui/icons-material';

/**
 * QRScanner Component
 * 
 * Scans QR codes using device camera
 * Decodes AR experience data and launches AR viewer
 * 
 * @param {boolean} open - Dialog open state
 * @param {function} onClose - Close callback
 * @param {function} onScanSuccess - Callback when QR scan succeeds
 * @param {function} onScanError - Callback when scan fails
 */
const QRScanner = ({
  open = false,
  onClose,
  onScanSuccess,
  onScanError,
}) => {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const html5QrcodeRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [scanResult, setScanResult] = useState(null);

  // Initialize scanner
  useEffect(() => {
    if (!open) return;

    const initializeScanner = async () => {
      try {
        // Check if on desktop - show helpful message
        if (!isMobile) {
          setError('📱 QR scanning works best on mobile devices. Please use your phone to scan AR QR codes, or download the generated QR code and scan it with your phone camera.');
          return;
        }

        // Get available cameras
        const devices = await Html5Qrcode.getCameras();
        
        if (devices && devices.length > 0) {
          setCameras(devices);
          setError(null);
        } else {
          setError('📷 No cameras found on this device. Please ensure your device has a working camera.');
        }
      } catch (err) {
        console.error('Camera initialization error:', err);
        
        // Handle specific error types
        let errorMessage = 'Unable to access camera. ';
        
        if (err.name === 'NotFoundError') {
          errorMessage = '📷 No camera found on this device. For AR scanning, please use a mobile device with a camera.';
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = '🔒 Camera access denied. Please grant camera permissions in your browser settings and try again.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = '⚠️ Camera is already in use by another application. Please close other camera apps and try again.';
        } else if (!isMobile) {
          errorMessage = '💡 QR scanning is designed for mobile devices. Please scan AR QR codes using your phone camera.';
        }
        
        setError(errorMessage);
      }
    };

    initializeScanner();
  }, [open]);

  // Stop scanning
  const stopScanning = useCallback(async () => {
    if (html5QrcodeRef.current && isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error('Scanner stop error:', err);
      }
    }
  }, [isScanning]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    stopScanning();
    setScanResult(null);
    setError(null);
    if (onClose) {
      onClose();
    }
  }, [stopScanning, onClose]);

  // Handle successful scan
  const onScanSuccessHandler = useCallback(async (decodedText, decodedResult) => {
    console.log('QR Scan Success:', decodedText);
    
    try {
      // Stop scanning
      await stopScanning();
      
      // Parse the QR code data
      const url = new URL(decodedText);
      const params = new URLSearchParams(url.search);
      
      if (params.get('mode') === 'ar' && params.get('data')) {
        // Decode AR data
        const arDataStr = atob(params.get('data'));
        const arData = JSON.parse(arDataStr);
        
        setScanResult(arData);
        
        // Call success callback
        if (onScanSuccess) {
          onScanSuccess(arData);
        }
        
        // Navigate to AR viewer
        setTimeout(() => {
          navigate(`/ar-viewer?${params.toString()}`);
        }, 500);
      } else {
        // Not an AR QR code, just open the URL
        window.open(decodedText, '_blank');
        handleClose();
      }
    } catch (err) {
      console.error('QR decode error:', err);
      setError('Invalid QR code format');
      
      if (onScanError) {
        onScanError(err);
      }
    }
  }, [stopScanning, navigate, onScanSuccess, onScanError, handleClose]);

  // Handle scan failure (called continuously)
  const onScanFailureHandler = useCallback((errorMessage) => {
    // Do nothing - this is called frequently when no QR is detected
    // Only log if it's a real error, not just "No QR code found"
    if (!errorMessage.includes('NotFoundException')) {
      console.debug('Scan error:', errorMessage);
    }
  }, []);

  // Start scanning
  const startScanning = useCallback(async () => {
    if (!scannerRef.current || cameras.length === 0) return;

    try {
      setIsScanning(true);
      setError(null);

      const cameraId = cameras[currentCameraIndex].id;

      // Create scanner instance
      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode('qr-reader');
      }

      // Configure scanner
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      // Start scanning
      await html5QrcodeRef.current.start(
        cameraId,
        config,
        onScanSuccessHandler,
        onScanFailureHandler
      );
    } catch (err) {
      console.error('Scanner start error:', err);
      setError('Failed to start scanner. Please check camera permissions.');
      setIsScanning(false);
    }
  }, [cameras, currentCameraIndex, onScanSuccessHandler, onScanFailureHandler]);

  // Switch camera
  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1) return;
    
    await stopScanning();
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    
    // Restart with new camera
    setTimeout(() => {
      startScanning();
    }, 100);
  }, [cameras.length, stopScanning, currentCameraIndex, startScanning]);

  // Start scanning when dialog opens
  useEffect(() => {
    if (open && cameras.length > 0 && !isScanning) {
      startScanning();
    }
    
    return () => {
      stopScanning();
    };
  }, [open, cameras, currentCameraIndex, isScanning, startScanning, stopScanning]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundColor: '#000',
          color: '#fff',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1, color: '#fff' }}>
        <QrCodeScanner sx={{ mr: 1, color: 'primary.light' }} />
        <Typography variant="h6" component="span" sx={{ flex: 1, color: '#fff' }}>
          Scan QR Code for AR
        </Typography>
        <IconButton onClick={handleClose} size="small" sx={{ color: '#fff' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Mobile-only notice for desktop users */}
        {!isMobile && (
          <Alert 
            severity="info" 
            sx={{ 
              m: 2, 
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              color: '#fff',
              '& .MuiAlert-icon': {
                color: '#64b5f6'
              }
            }}
          >
            <Typography variant="body2">
              <strong>💡 Tip:</strong> QR scanning works best on mobile devices. 
              To view products in AR:
            </Typography>
            <Typography variant="caption" component="ol" sx={{ pl: 2, mt: 1 }}>
              <li>Generate a QR code on this page</li>
              <li>Download or print it</li>
              <li>Scan it with your phone camera to view in AR</li>
            </Typography>
          </Alert>
        )}
        
        <Box sx={{ position: 'relative', minHeight: 400 }}>
          {/* Scanner Container */}
          <Box
            id="qr-reader"
            ref={scannerRef}
            sx={{
              width: '100%',
              minHeight: 400,
              '& video': {
                width: '100%',
                height: 'auto',
                display: 'block',
              },
            }}
          />

          {/* Loading Indicator */}
          {!isScanning && !error && cameras.length > 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.8)',
              }}
            >
              <CameraAlt sx={{ fontSize: 64, color: 'primary.light', mb: 2 }} />
              <Typography variant="body1" color="primary.light">
                Initializing camera...
              </Typography>
              <LinearProgress sx={{ width: '60%', mt: 2 }} />
            </Box>
          )}

          {/* Error Display */}
          {error && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.9)',
                p: 3,
              }}
            >
              <Alert severity="error" sx={{ width: '100%' }}>
                <Typography variant="body2">{error}</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setError(null);
                    startScanning();
                  }}
                  sx={{ mt: 2 }}
                >
                  Try Again
                </Button>
              </Alert>
            </Box>
          )}

          {/* Success Message */}
          {scanResult && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,255,0,0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Alert severity="success" sx={{ maxWidth: '80%' }}>
                <Typography variant="body1" fontWeight={600}>
                  ✓ QR Code Scanned!
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {scanResult.productName}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Opening AR experience...
                </Typography>
              </Alert>
            </Box>
          )}

          {/* Controls Overlay */}
          {isScanning && !scanResult && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: 2,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.6)',
              }}
            >
              <Stack direction="column" spacing={1} alignItems="center">
                <Typography variant="body2" color="primary.light" textAlign="center">
                  Point camera at QR code
                </Typography>
                
                {cameras.length > 1 && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<FlipCameraAndroid />}
                    onClick={switchCamera}
                    sx={{ color: '#fff', borderColor: '#fff' }}
                  >
                    Switch Camera
                  </Button>
                )}
              </Stack>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default QRScanner;
