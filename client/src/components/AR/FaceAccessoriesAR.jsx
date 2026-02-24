import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Close,
  CameraAlt,
  FlipCameraIos,
  PhotoCamera,
  ShoppingCart,
  Refresh,
  Download,
  BuildCircle,
} from '@mui/icons-material';

/**
 * FaceAccessoriesAR Component
 * 
 * Real-time face accessories try-on using device camera
 * - Hats, sunglasses, hair accessories, masks
 * - Uses browser's MediaPipe Face Detection
 * - Works on mobile and desktop
 * 
 * Features:
 * - Live camera preview
 * - Multiple accessory options
 * - Capture photo with accessory
 * - Add to cart directly
 */
const FaceAccessoriesAR = ({ product, onClose, onAddToCart }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const detectorRef = useRef(null);
  const selectedAccessoryRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAccessory, setSelectedAccessory] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
  const [capturedImage, setCapturedImage] = useState(null);
  const [showCaptureDialog, setShowCaptureDialog] = useState(false);

  // Accessory presets based on product type
  const accessories = [
    {
      id: 'hat-1',
      name: 'Party Hat',
      type: 'hat',
      image: product?.image || '/assets/accessories/party-hat.png',
      position: { x: 0.5, y: 0.15 },
      scale: 0.35,
    },
    {
      id: 'glasses-1',
      name: 'Cool Sunglasses',
      type: 'glasses',
      image: '/assets/accessories/sunglasses.png',
      position: { x: 0.5, y: 0.42 },
      scale: 0.28,
    },
    {
      id: 'mask-1',
      name: 'Fun Mask',
      type: 'mask',
      image: '/assets/accessories/mask.png',
      position: { x: 0.5, y: 0.52 },
      scale: 0.3,
    },
    {
      id: 'headband-1',
      name: 'Cute Headband',
      type: 'headband',
      image: '/assets/accessories/headband.png',
      position: { x: 0.5, y: 0.2 },
      scale: 0.32,
    },
  ];

  // Initialize camera and face detection
  const initCamera = async () => {
    try {
      console.log('🎥 Initializing camera for face accessories AR...');
      setError(null);
      setLoading(true);
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      let stream;
      
      // Try with ideal constraints first
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err) {
        console.log('⚠️ Trying fallback camera constraints...');
        // Fallback: try with basic constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (fallbackErr) {
          console.log('⚠️ Trying to enumerate devices...');
          // Check if any video input devices exist
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          if (videoDevices.length === 0) {
            throw new Error('NO_CAMERA');
          }
          throw fallbackErr;
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        console.log('📹 Starting video playback...');
        await videoRef.current.play();
        
        console.log('⏳ Waiting for video metadata...');
        await new Promise(resolve => {
          videoRef.current.onloadedmetadata = () => {
            console.log(`✅ Video ready: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
            resolve();
          };
        });

        console.log('🔍 Initializing face detection...');
        await initFaceDetection();

        console.log('✅ Camera fully initialized');
        setLoading(false);
        
        // Wait for React to update DOM, then start rendering
        setTimeout(() => {
          console.log('🎬 Starting accessories render loop...');
          if (videoRef.current && canvasRef.current && detectorRef.current) {
            console.log('✅ All refs ready for accessories');
            startRendering();
          } else {
            console.error('❌ Refs not ready for accessories');
          }
        }, 200);
      }
    } catch (err) {
      console.error('❌ Camera initialization error:', err);
      
      let errorMessage = 'Camera access failed. ';
      
      if (err.message === 'NO_CAMERA') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please ensure a camera is connected to your device.';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions in your browser settings.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Camera is in use by another application. Please close other apps using the camera.';
      } else if (err.message === 'Camera API not supported in this browser') {
        errorMessage = err.message + '. Please use a modern browser like Chrome, Firefox, or Edge.';
      } else {
        errorMessage += err.message || 'Unknown error occurred.';
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (mounted) {
        await initCamera();
      }
    };

    init();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [facingMode]);

  // Sync selectedAccessory to ref for render loop
  useEffect(() => {
    selectedAccessoryRef.current = selectedAccessory;
    if (selectedAccessory) {
      console.log('✨ Accessory selected:', selectedAccessory.name);
    }
  }, [selectedAccessory]);

  // Retry camera initialization
  const handleRetry = () => {
    cleanup();
    initCamera();
  };

  // Initialize MediaPipe Face Detection
  const initFaceDetection = async () => {
    try {
      console.log('🔍 Initializing face detection...');
      
      // Check if FaceDetector API is available
      if ('FaceDetector' in window) {
        detectorRef.current = new window.FaceDetector({
          maxDetectedFaces: 1,
          fastMode: true,
        });
        console.log('✅ Using native FaceDetector API');
      } else {
        // Fallback to basic face estimation using video dimensions
        console.log('⚠️ FaceDetector not available, using fallback');
        detectorRef.current = {
          detect: async (video) => {
            // Estimate face position (center of video)
            const w = video.videoWidth;
            const h = video.videoHeight;
            return [{
              boundingBox: {
                x: w * 0.25,
                y: h * 0.15,
                width: w * 0.5,
                height: h * 0.6,
              },
            }];
          },
        };
      }
    } catch (err) {
      console.error('❌ Face detection init error:', err);
      // Use fallback
      detectorRef.current = {
        detect: async (video) => {
          const w = video.videoWidth;
          const h = video.videoHeight;
          return [{
            boundingBox: {
              x: w * 0.25,
              y: h * 0.15,
              width: w * 0.5,
              height: h * 0.6,
            },
          }];
        },
      };
    }
  };

  // Render loop - draw video and overlays
  const startRendering = () => {
    console.log('👓 Starting accessories render loop');
    let frameCount = 0;
    
    const render = async () => {
      if (!videoRef.current || !canvasRef.current || !detectorRef.current) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      frameCount++;

      // Set canvas size to match video (only if changed)
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log(`📐 Canvas sized: ${canvas.width}x${canvas.height}`);
      }

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Debug indicator - blue square in top-right corner
      ctx.fillStyle = '#0000FF';
      ctx.fillRect(canvas.width - 30, 10, 20, 20);

      // Detect faces and draw accessories
      const currentAccessory = selectedAccessoryRef.current;
      if (currentAccessory) {
        if (frameCount <= 3) {
          console.log(`👓 Applying ${currentAccessory.name} accessory...`);
        }
        
        try {
          const faces = await detectorRef.current.detect(video);
          
          if (faces && faces.length > 0) {
            const face = faces[0];
            if (frameCount <= 3) {
              console.log('👤 Face detected for accessory');
            }
            drawAccessory(ctx, face.boundingBox, currentAccessory);
          }
        } catch (err) {
          if (frameCount <= 3) {
            console.error('Face detection error:', err);
          }
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();
  };

  // Draw accessory on detected face
  const drawAccessory = (ctx, faceBounds, accessory) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Calculate accessory position based on face bounds and accessory type
    const faceWidth = faceBounds.width;
    const faceHeight = faceBounds.height;
    
    let x, y, width, height;

    switch (accessory.type) {
      case 'hat':
        // Position above forehead
        width = faceWidth * accessory.scale * 2;
        height = width; // Maintain aspect ratio
        x = faceBounds.x + (faceWidth / 2) - (width / 2);
        y = faceBounds.y - (height * 0.6);
        break;
      
      case 'glasses':
        // Position on eyes
        width = faceWidth * accessory.scale * 2.5;
        height = width * 0.4;
        x = faceBounds.x + (faceWidth / 2) - (width / 2);
        y = faceBounds.y + (faceHeight * 0.35);
        break;
      
      case 'mask':
        // Position on lower face
        width = faceWidth * accessory.scale * 2;
        height = width * 0.6;
        x = faceBounds.x + (faceWidth / 2) - (width / 2);
        y = faceBounds.y + (faceHeight * 0.5);
        break;
      
      case 'headband':
        // Position on top of head
        width = faceWidth * accessory.scale * 2.2;
        height = width * 0.3;
        x = faceBounds.x + (faceWidth / 2) - (width / 2);
        y = faceBounds.y + (faceHeight * 0.05);
        break;
      
      default:
        // Default positioning
        width = faceWidth * accessory.scale * 2;
        height = width;
        x = faceBounds.x + (faceWidth / 2) - (width / 2);
        y = faceBounds.y;
    }

    // Load and draw image
    img.onload = () => {
      ctx.drawImage(img, x, y, width, height);
    };
    
    img.src = accessory.image;
  };

  // Capture photo with accessory
  const capturePhoto = () => {
    if (!canvasRef.current) return;

    const dataUrl = canvasRef.current.toDataURL('image/png');
    setCapturedImage(dataUrl);
    setShowCaptureDialog(true);
  };

  // Download captured photo
  const downloadPhoto = () => {
    if (!capturedImage) return;

    const link = document.createElement('a');
    link.href = capturedImage;
    link.download = `tinytots-tryonn-${Date.now()}.png`;
    link.click();
  };

  // Switch camera (front/back)
  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setLoading(true);
  };

  // Cleanup resources
  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // Handle accessory selection
  const handleAccessorySelect = (accessory) => {
    setSelectedAccessory(accessory);
  };

  // Handle add to cart
  const handleAddToCart = () => {
    if (onAddToCart && product) {
      onAddToCart(product);
    }
    setShowCaptureDialog(false);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'background.paper',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight="bold">
            Try On Accessories
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {product?.name || 'Face Accessories'}
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </Paper>

      {/* Camera View */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          bgcolor: 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading && (
          <Box textAlign="center">
            <CircularProgress size={60} />
            <Typography color="white" mt={2}>
              Initializing camera...
            </Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ textAlign: 'center', p: 4, maxWidth: 500, mx: 'auto' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                onClick={handleRetry}
                startIcon={<Refresh />}
              >
                Retry Camera
              </Button>
              <Button
                component={Link}
                to="/camera-diagnostics"
                variant="outlined"
                startIcon={<BuildCircle />}
              >
                Diagnose Issue
              </Button>
            </Stack>
            <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
              Having trouble? Use the diagnostics tool to identify camera issues.
            </Typography>
          </Box>
        )}

        {/* Video (hidden, used for face detection) */}
        <video
          ref={videoRef}
          style={{ display: 'none' }}
          playsInline
          muted
        />

        {/* Canvas (visible, shows video + overlays) */}
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: loading || error ? 'none' : 'block',
          }}
        />

        {/* Camera Controls */}
        {!loading && !error && (
          <Stack
            direction="row"
            spacing={2}
            sx={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <Tooltip title="Flip Camera">
              <IconButton
                onClick={switchCamera}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': { bgcolor: 'white' },
                }}
              >
                <FlipCameraIos />
              </IconButton>
            </Tooltip>

            <Tooltip title={!selectedAccessory ? "Select an accessory first" : "Capture Photo"}>
              <span>
                <IconButton
                  onClick={capturePhoto}
                  disabled={!selectedAccessory}
                  sx={{
                    bgcolor: selectedAccessory ? 'primary.main' : 'rgba(255, 255, 255, 0.5)',
                    color: 'white',
                    width: 64,
                    height: 64,
                    '&:hover': { bgcolor: selectedAccessory ? 'primary.dark' : 'rgba(255, 255, 255, 0.5)' },
                    '&.Mui-disabled': {
                      opacity: 0.6,
                      color: 'white',
                    },
                  }}
                >
                  <CameraAlt fontSize="large" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Reset">
              <IconButton
                onClick={() => setSelectedAccessory(null)}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': { bgcolor: 'white' },
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>

      {/* Accessory Selection */}
      {!loading && !error && (
        <Paper
          elevation={3}
          sx={{
            p: 2,
            maxHeight: '180px',
            overflowX: 'auto',
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Select Accessory:
          </Typography>
          <Grid container spacing={1}>
            {accessories.map((accessory) => (
              <Grid item xs={3} sm={2} key={accessory.id}>
                <Paper
                  onClick={() => handleAccessorySelect(accessory)}
                  sx={{
                    p: 1,
                    cursor: 'pointer',
                    textAlign: 'center',
                    border: 2,
                    borderColor: selectedAccessory?.id === accessory.id ? 'primary.main' : 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'primary.light',
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={accessory.image}
                    alt={accessory.name}
                    sx={{
                      width: '100%',
                      height: 60,
                      objectFit: 'contain',
                      mb: 0.5,
                    }}
                    onError={(e) => {
                      e.target.src = product?.image || '/assets/placeholder.png';
                    }}
                  />
                  <Typography variant="caption" noWrap>
                    {accessory.name}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Capture Dialog */}
      <Dialog
        open={showCaptureDialog}
        onClose={() => setShowCaptureDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Your Photo</DialogTitle>
        <DialogContent>
          {capturedImage && (
            <Box
              component="img"
              src={capturedImage}
              alt="Captured"
              sx={{
                width: '100%',
                borderRadius: 1,
                mb: 2,
              }}
            />
          )}
          <Typography variant="body2" color="text.secondary">
            Love this look? Add to cart or download your photo!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCaptureDialog(false)}>
            Close
          </Button>
          <Button onClick={downloadPhoto} startIcon={<Download />}>
            Download
          </Button>
          <Button
            variant="contained"
            onClick={handleAddToCart}
            startIcon={<ShoppingCart />}
          >
            Add to Cart
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FaceAccessoriesAR;
