import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  Grid,
  Slider,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Close,
  CameraAlt,
  FlipCameraIos,
  Refresh,
  Download,
  ShoppingCart,
  Palette,
  BuildCircle,
} from '@mui/icons-material';

/**
 * VirtualMakeupAR Component
 * 
 * Real-time virtual makeup and face paint try-on
 * - Face paint, temporary tattoos, makeup
 * - Uses browser's canvas API and face detection
 * - Perfect for birthday parties, festivals, costumes
 * 
 * Features:
 * - Multiple makeup styles (face paint, tattoos, party makeup)
 * - Color customization
 * - Intensity control
 * - Capture and share photos
 */
const VirtualMakeupAR = ({ product, onClose, onAddToCart }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const detectorRef = useRef(null);
  const selectedStyleRef = useRef(null);
  const selectedColorRef = useRef('#FF69B4');
  const intensityRef = useRef(70);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#FF69B4');
  const [intensity, setIntensity] = useState(70);
  const [facingMode, setFacingMode] = useState('user');
  const [capturedImage, setCapturedImage] = useState(null);
  const [showCaptureDialog, setShowCaptureDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Makeup/Face Paint Styles
  const makeupStyles = {
    facePaint: [
      {
        id: 'butterfly',
        name: 'Butterfly',
        type: 'facePaint',
        description: 'Colorful butterfly face paint',
        pattern: 'butterfly',
      },
      {
        id: 'tiger',
        name: 'Tiger',
        type: 'facePaint',
        description: 'Fierce tiger stripes',
        pattern: 'tiger',
      },
      {
        id: 'rainbow',
        name: 'Rainbow',
        type: 'facePaint',
        description: 'Rainbow cheeks',
        pattern: 'rainbow',
      },
      {
        id: 'stars',
        name: 'Stars',
        type: 'facePaint',
        description: 'Sparkly stars',
        pattern: 'stars',
      },
    ],
    tattoos: [
      {
        id: 'heart',
        name: 'Heart',
        type: 'tattoo',
        description: 'Cute heart tattoo',
        pattern: 'heart',
      },
      {
        id: 'flower',
        name: 'Flower',
        type: 'tattoo',
        description: 'Floral design',
        pattern: 'flower',
      },
      {
        id: 'unicorn',
        name: 'Unicorn',
        type: 'tattoo',
        description: 'Magical unicorn',
        pattern: 'unicorn',
      },
      {
        id: 'crown',
        name: 'Crown',
        type: 'tattoo',
        description: 'Princess crown',
        pattern: 'crown',
      },
    ],
    party: [
      {
        id: 'glitter',
        name: 'Glitter',
        type: 'party',
        description: 'Sparkly glitter',
        pattern: 'glitter',
      },
      {
        id: 'gems',
        name: 'Face Gems',
        type: 'party',
        description: 'Decorative gems',
        pattern: 'gems',
      },
      {
        id: 'confetti',
        name: 'Confetti',
        type: 'party',
        description: 'Party confetti',
        pattern: 'confetti',
      },
      {
        id: 'fireworks',
        name: 'Fireworks',
        type: 'party',
        description: 'Celebration fireworks',
        pattern: 'fireworks',
      },
    ],
  };

  // Color palette
  const colors = [
    { name: 'Pink', value: '#FF69B4' },
    { name: 'Purple', value: '#9370DB' },
    { name: 'Blue', value: '#4169E1' },
    { name: 'Green', value: '#32CD32' },
    { name: 'Yellow', value: '#FFD700' },
    { name: 'Orange', value: '#FF8C00' },
    { name: 'Red', value: '#DC143C' },
    { name: 'Rainbow', value: 'rainbow' },
  ];

  // Initialize camera and face detection
  const initCamera = async (retryCount = 0) => {
    try {
      console.log('🎨 Initializing camera for virtual makeup AR...');
      setError(null);
      setLoading(true);
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      // First, stop any existing streams to release the camera
      if (streamRef.current) {
        console.log('🔄 Releasing existing camera stream...');
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('✅ Stopped track:', track.label);
        });
        streamRef.current = null;
        // Wait a moment for the camera to be released
        await new Promise(resolve => setTimeout(resolve, 500));
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
          
          // If NotReadableError and we have devices, try selecting a specific device
          if ((fallbackErr.name === 'NotReadableError' || fallbackErr.name === 'TrackStartError') && videoDevices.length > 0 && retryCount < 2) {
            console.log('⚠️ Camera busy, trying specific device...');
            // Try each available camera
            for (const device of videoDevices) {
              try {
                console.log('🔄 Trying device:', device.label || device.deviceId);
                stream = await navigator.mediaDevices.getUserMedia({
                  video: { deviceId: { exact: device.deviceId } },
                  audio: false,
                });
                break; // Success, exit the loop
              } catch (deviceErr) {
                console.log('❌ Device failed:', device.label, deviceErr.message);
                continue; // Try next device
              }
            }
            if (!stream) {
              throw fallbackErr; // All devices failed
            }
          } else {
            throw fallbackErr;
          }
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

        console.log('✅ Camera fully initialized, hiding loading...');
        setLoading(false);
        
        // Wait for React to update DOM, then start rendering
        setTimeout(() => {
          console.log('🎬 Starting render loop now...');
          if (videoRef.current && canvasRef.current && detectorRef.current) {
            console.log('✅ All refs ready, calling startRendering()');
            startRendering();
          } else {
            console.error('❌ Refs not ready:', {
              video: !!videoRef.current,
              canvas: !!canvasRef.current,
              detector: !!detectorRef.current
            });
          }
        }, 200);
      }
    } catch (err) {
      console.error('❌ Camera initialization error:', err);
      
      let errorMessage = 'Camera access failed. ';
      let errorType = 'generic';
      
      if (err.message === 'NO_CAMERA') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
        errorType = 'no_camera';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please ensure a camera is connected to your device.';
        errorType = 'no_camera';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions in your browser settings.';
        errorType = 'permission';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Camera is in use by another application. Please:\n1. Close other apps using the camera (Zoom, Teams, Skype)\n2. Close other browser tabs with camera access\n3. Restart your browser if the issue persists';
        errorType = 'in_use';
      } else if (err.message === 'Camera API not supported in this browser') {
        errorMessage = err.message + '. Please use a modern browser like Chrome, Firefox, or Edge.';
        errorType = 'unsupported';
      } else {
        errorMessage += err.message || 'Unknown error occurred.';
      }
      
      setError({ message: errorMessage, type: errorType });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Log when style changes
  useEffect(() => {
    selectedStyleRef.current = selectedStyle;
    if (selectedStyle) {
      console.log('✨ Style selected:', selectedStyle.name, '(pattern:', selectedStyle.pattern + ')');
      console.log('📌 Ref updated, render loop will now see style');
    } else {
      console.log('🔄 Style cleared');
    }
  }, [selectedStyle]);

  // Update color ref
  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  // Update intensity ref
  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  // Retry camera initialization
  const handleRetry = () => {
    cleanup();
    initCamera();
  };

  // Force reset - stops all media tracks system-wide and waits
  const handleForceReset = async () => {
    setLoading(true);
    setError(null);
    
    console.log('🔄 Force resetting camera...');
    
    // Stop our stream
    cleanup();
    
    // Try to stop any other streams that might exist
    try {
      // Get all active media streams and stop them
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      
      // For each video device, try to acquire and immediately release
      for (const device of videoDevices) {
        try {
          console.log('🔄 Resetting device:', device.label || device.deviceId);
          const tempStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: device.deviceId },
            audio: false
          });
          // Immediately stop it to release
          tempStream.getTracks().forEach(track => {
            track.stop();
          });
        } catch (e) {
          // Device might be busy, that's okay
          console.log('⚠️ Could not reset device:', e.message);
        }
      }
    } catch (e) {
      console.log('⚠️ Device enumeration failed:', e.message);
    }
    
    // Wait longer to let Windows fully release the camera
    console.log('⏳ Waiting for camera to be released...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now try again
    await initCamera();
  };

  // Initialize face detection
  const initFaceDetection = async () => {
    try {
      console.log('🔍 Initializing face detection for makeup...');
      
      if ('FaceDetector' in window) {
        detectorRef.current = new window.FaceDetector({
          maxDetectedFaces: 1,
          fastMode: false, // More accurate for makeup application
        });
        console.log('✅ Using native FaceDetector API');
      } else {
        // Fallback
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
              landmarks: [
                { type: 'eye', locations: [
                  { x: w * 0.35, y: h * 0.35 },
                  { x: w * 0.65, y: h * 0.35 },
                ]},
                { type: 'mouth', locations: [
                  { x: w * 0.5, y: h * 0.65 },
                ]},
              ],
            }];
          },
        };
      }
    } catch (err) {
      console.error('❌ Face detection init error:', err);
      // Fallback detector
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

  // Render loop
  const startRendering = () => {
    console.log('🎨 Starting makeup render loop');
    
    let frameCount = 0;
    
    const render = async () => {
      if (!videoRef.current || !canvasRef.current || !detectorRef.current) {
        console.log('⚠️ Render loop waiting for refs...');
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const currentStyle = selectedStyleRef.current;

      // Log first few frames
      frameCount++;
      if (frameCount <= 5) {
        console.log(`🎬 Frame ${frameCount}: video=${video.videoWidth}x${video.videoHeight}, canvas=${canvas.width}x${canvas.height}, style=${currentStyle?.name || 'none'}`);
      }

      // Ensure canvas matches video dimensions
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log(`📐 Canvas sized: ${canvas.width}x${canvas.height}`);
      }

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Apply makeup/face paint
      if (currentStyle) {
        if (frameCount <= 5) {
          console.log(`✨ Applying ${currentStyle.pattern} effect...`);
        }
        
        try {
          const faces = await detectorRef.current.detect(video);
          
          if (faces && faces.length > 0) {
            const face = faces[0];
            if (frameCount <= 5) {
              console.log('👤 Face detected:', face.boundingBox);
            }
            applyMakeup(ctx, face, currentStyle);
          } else {
            // No faces detected, use fallback positioning
            if (frameCount <= 3) {
              console.log('⚠️ No faces detected, using fallback positioning');
            }
            const fallbackBounds = {
              x: canvas.width * 0.25,
              y: canvas.height * 0.15,
              width: canvas.width * 0.5,
              height: canvas.height * 0.6,
            };
            applyMakeup(ctx, { boundingBox: fallbackBounds }, currentStyle);
          }
        } catch (err) {
          if (frameCount <= 3) {
            console.error('Face detection error:', err);
          }
          // Still try to render with fallback
          const fallbackBounds = {
            x: canvas.width * 0.25,
            y: canvas.height * 0.15,
            width: canvas.width * 0.5,
            height: canvas.height * 0.6,
          };
          applyMakeup(ctx, { boundingBox: fallbackBounds }, currentStyle);
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();
  };

  // Apply makeup based on selected style
  const applyMakeup = (ctx, face, style) => {
    const bounds = face.boundingBox;
    const alpha = intensityRef.current / 100;

    ctx.save();
    ctx.globalAlpha = alpha;

    switch (style.pattern) {
      case 'butterfly':
        drawButterfly(ctx, bounds);
        break;
      case 'tiger':
        drawTiger(ctx, bounds);
        break;
      case 'rainbow':
        drawRainbow(ctx, bounds);
        break;
      case 'stars':
        drawStars(ctx, bounds);
        break;
      case 'heart':
        drawHeart(ctx, bounds);
        break;
      case 'flower':
        drawFlower(ctx, bounds);
        break;
      case 'unicorn':
        drawUnicorn(ctx, bounds);
        break;
      case 'crown':
        drawCrown(ctx, bounds);
        break;
      case 'glitter':
        drawGlitter(ctx, bounds);
        break;
      case 'gems':
        drawGems(ctx, bounds);
        break;
      case 'confetti':
        drawConfetti(ctx, bounds);
        break;
      case 'fireworks':
        drawFireworks(ctx, bounds);
        break;
      default:
        break;
    }

    ctx.restore();
  };

  // Drawing functions for different patterns
  const drawButterfly = (ctx, bounds) => {
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height * 0.35;
    const size = bounds.width * 0.25;

    ctx.fillStyle = selectedColorRef.current;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;

    // Left wing (upper)
    ctx.beginPath();
    ctx.ellipse(cx - size * 1.2, cy - size * 0.3, size * 0.8, size * 1, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right wing (upper)
    ctx.beginPath();
    ctx.ellipse(cx + size * 1.2, cy - size * 0.3, size * 0.8, size * 1, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Left wing (lower)
    ctx.beginPath();
    ctx.ellipse(cx - size * 0.7, cy + size * 0.6, size * 0.6, size * 0.8, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Right wing (lower)
    ctx.beginPath();
    ctx.ellipse(cx + size * 0.7, cy + size * 0.6, size * 0.6, size * 0.8, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Body
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.12, size * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Antennae
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.5);
    ctx.lineTo(cx - size * 0.2, cy - size * 1.2);
    ctx.moveTo(cx, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.2, cy - size * 1.2);
    ctx.stroke();
  };

  const drawTiger = (ctx, bounds) => {
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;

    ctx.strokeStyle = selectedColorRef.current;
    ctx.lineWidth = 8; // Thicker lines for visibility
    ctx.lineCap = 'round';

    // Draw tiger stripes across the face
    for (let i = 0; i < 5; i++) {
      const offsetX = (i - 2) * bounds.width * 0.12;
      const offsetY = bounds.height * 0.25;
      
      ctx.beginPath();
      ctx.moveTo(cx + offsetX, cy - offsetY);
      ctx.lineTo(cx + offsetX + bounds.width * 0.02, cy + offsetY);
      ctx.stroke();
    }

    // Add whisker dots on cheeks
    ctx.fillStyle = selectedColorRef.current;
    const dotSize = bounds.width * 0.02;
    
    // Left cheek dots
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(
        bounds.x + bounds.width * 0.2,
        bounds.y + bounds.height * 0.5 + (i - 1) * dotSize * 2,
        dotSize,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    
    // Right cheek dots
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(
        bounds.x + bounds.width * 0.8,
        bounds.y + bounds.height * 0.5 + (i - 1) * dotSize * 2,
        dotSize,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  };

  const drawRainbow = (ctx, bounds) => {
    const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
    const cheekSize = bounds.width * 0.15;
    const stripeHeight = cheekSize * 0.25;
    
    // Left cheek - rainbow stripes
    const leftX = bounds.x + bounds.width * 0.25;
    const leftY = bounds.y + bounds.height * 0.5;
    
    colors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(
        leftX - cheekSize / 2,
        leftY - cheekSize / 2 + i * stripeHeight,
        cheekSize,
        stripeHeight
      );
    });

    // Right cheek - rainbow stripes
    const rightX = bounds.x + bounds.width * 0.75;
    const rightY = bounds.y + bounds.height * 0.5;
    
    colors.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(
        rightX - cheekSize / 2,
        rightY - cheekSize / 2 + i * stripeHeight,
        cheekSize,
        stripeHeight
      );
    });
  };

  const drawStars = (ctx, bounds) => {
    ctx.fillStyle = selectedColorRef.current;
    
    // Draw stars around face
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const x = bounds.x + bounds.width / 2 + Math.cos(angle) * bounds.width * 0.4;
      const y = bounds.y + bounds.height / 2 + Math.sin(angle) * bounds.height * 0.4;
      
      drawStar(ctx, x, y, 5, bounds.width * 0.03, bounds.width * 0.015);
    }
  };

  const drawStar = (ctx, x, y, points, outer, inner) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = (Math.PI * i) / points;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  };

  const drawHeart = (ctx, bounds) => {
    const x = bounds.x + bounds.width * 0.8;
    const y = bounds.y + bounds.height * 0.3;
    const size = bounds.width * 0.08;

    ctx.fillStyle = selectedColorRef.current;
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x, y, x - size / 2, y - size / 2, x - size, y);
    ctx.bezierCurveTo(x - size * 1.5, y, x - size * 1.5, y + size * 0.5, x - size * 1.5, y + size * 0.5);
    ctx.bezierCurveTo(x - size * 1.5, y + size, x - size * 0.5, y + size * 1.5, x, y + size * 2);
    ctx.bezierCurveTo(x + size * 0.5, y + size * 1.5, x + size * 1.5, y + size, x + size * 1.5, y + size * 0.5);
    ctx.bezierCurveTo(x + size * 1.5, y + size * 0.5, x + size * 1.5, y, x + size, y);
    ctx.bezierCurveTo(x + size / 2, y - size / 2, x, y, x, y + size * 0.3);
    ctx.closePath();
    ctx.fill();
  };

  const drawFlower = (ctx, bounds) => {
    const x = bounds.x + bounds.width * 0.2;
    const y = bounds.y + bounds.height * 0.3;
    const size = bounds.width * 0.05;

    ctx.fillStyle = selectedColorRef.current;
    
    // Petals
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      
      ctx.beginPath();
      ctx.arc(px, py, size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Center
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawUnicorn = (ctx, bounds) => {
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y;
    const size = bounds.width * 0.15;

    // Horn
    ctx.fillStyle = selectedColorRef.current;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * 0.3, y + size);
    ctx.lineTo(x + size * 0.3, y + size);
    ctx.closePath();
    ctx.fill();

    // Add sparkles
    ctx.fillStyle = '#FFD700';
    drawStar(ctx, x - size * 0.5, y + size * 0.3, 5, size * 0.1, size * 0.05);
    drawStar(ctx, x + size * 0.5, y + size * 0.3, 5, size * 0.1, size * 0.05);
  };

  const drawCrown = (ctx, bounds) => {
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height * 0.1;
    const width = bounds.width * 0.4;
    const height = bounds.height * 0.1;

    ctx.fillStyle = selectedColorRef.current;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(x - width / 2, y + height);
    ctx.lineTo(x - width / 3, y);
    ctx.lineTo(x - width / 6, y + height * 0.6);
    ctx.lineTo(x, y);
    ctx.lineTo(x + width / 6, y + height * 0.6);
    ctx.lineTo(x + width / 3, y);
    ctx.lineTo(x + width / 2, y + height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const drawGlitter = (ctx, bounds) => {
    ctx.fillStyle = selectedColorRef.current;
    
    // Random glitter particles
    for (let i = 0; i < 20; i++) {
      const x = bounds.x + Math.random() * bounds.width;
      const y = bounds.y + Math.random() * bounds.height;
      const size = Math.random() * 3 + 1;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawGems = (ctx, bounds) => {
    const positions = [
      { x: 0.3, y: 0.35 }, // Left eye area
      { x: 0.7, y: 0.35 }, // Right eye area
      { x: 0.5, y: 0.25 }, // Forehead
    ];

    positions.forEach(pos => {
      const x = bounds.x + bounds.width * pos.x;
      const y = bounds.y + bounds.height * pos.y;
      const size = bounds.width * 0.02;

      // Gem shape (diamond)
      ctx.fillStyle = selectedColorRef.current;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  };

  const drawConfetti = (ctx, bounds) => {
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];
    
    for (let i = 0; i < 15; i++) {
      const x = bounds.x + Math.random() * bounds.width;
      const y = bounds.y + Math.random() * bounds.height;
      const size = Math.random() * 8 + 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      ctx.fillStyle = color;
      ctx.fillRect(x, y, size, size * 1.5);
    }
  };

  const drawFireworks = (ctx, bounds) => {
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height * 0.3;
    
    ctx.strokeStyle = selectedColorRef.current;
    ctx.lineWidth = 3;

    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const length = bounds.width * 0.15;
      
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(angle) * length,
        cy + Math.sin(angle) * length
      );
      ctx.stroke();
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (!canvasRef.current) return;

    const dataUrl = canvasRef.current.toDataURL('image/png');
    setCapturedImage(dataUrl);
    setShowCaptureDialog(true);
  };

  // Download photo
  const downloadPhoto = () => {
    if (!capturedImage) return;

    const link = document.createElement('a');
    link.href = capturedImage;
    link.download = `tinytots-makeup-${Date.now()}.png`;
    link.click();
  };

  // Switch camera
  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setLoading(true);
  };

  // Cleanup
  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  // Get current styles based on active tab
  const getCurrentStyles = () => {
    switch (activeTab) {
      case 0:
        return makeupStyles.facePaint;
      case 1:
        return makeupStyles.tattoos;
      case 2:
        return makeupStyles.party;
      default:
        return makeupStyles.facePaint;
    }
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
            Virtual Makeup Studio
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {product?.name || 'Face Paint & Makeup'}
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
          <Box sx={{ textAlign: 'center', p: 4, maxWidth: 550, mx: 'auto' }}>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2, 
                textAlign: 'left',
                '& .MuiAlert-message': { whiteSpace: 'pre-line' }
              }}
            >
              {typeof error === 'object' ? error.message : error}
            </Alert>
            
            {/* Show specific tips for "camera in use" error */}
            {(typeof error === 'object' && error.type === 'in_use') && (
              <Alert severity="warning" sx={{ mb: 2, textAlign: 'left' }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  HP Camera Issue Detected
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  This is a known issue with HP laptop cameras. Try these steps:
                </Typography>
                <Typography variant="body2" component="ol" sx={{ pl: 2, m: 0 }}>
                  <li>Click <strong>"Force Reset Camera"</strong> below</li>
                  <li>If that doesn't work, press <strong>Win + I</strong> → Privacy → Camera → Toggle OFF then ON</li>
                  <li>As a last resort, restart your laptop</li>
                </Typography>
              </Alert>
            )}
            
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleRetry}
                startIcon={<Refresh />}
              >
                Retry Camera
              </Button>
              {(typeof error === 'object' && error.type === 'in_use') && (
                <Button
                  variant="contained"
                  color="warning"
                  onClick={handleForceReset}
                  startIcon={<Refresh />}
                >
                  Force Reset Camera
                </Button>
              )}
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

        <video ref={videoRef} style={{ display: 'none' }} playsInline muted />

        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: loading || error ? 'none' : 'block',
          }}
        />

        {/* Controls */}
        {!loading && !error && (
          <>
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

              <Tooltip title={!selectedStyle ? "Select a style first" : "Capture Photo"}>
                <span>
                  <IconButton
                    onClick={capturePhoto}
                    disabled={!selectedStyle}
                    sx={{
                      bgcolor: selectedStyle ? 'primary.main' : 'rgba(255, 255, 255, 0.5)',
                      color: 'white',
                      width: 64,
                      height: 64,
                      '&:hover': { bgcolor: selectedStyle ? 'primary.dark' : 'rgba(255, 255, 255, 0.5)' },
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

              <Tooltip title="Clear Makeup / Tattoos">
                <IconButton
                  onClick={() => setSelectedStyle(null)}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': { bgcolor: 'white' },
                  }}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Stack>

            {/* Intensity Slider */}
            {selectedStyle && (
              <Paper
                sx={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  p: 2,
                  minWidth: 200,
                }}
              >
                <Typography variant="caption" gutterBottom>
                  Intensity
                </Typography>
                <Slider
                  value={intensity}
                  onChange={(e, val) => setIntensity(val)}
                  min={10}
                  max={100}
                  valueLabelDisplay="auto"
                />
              </Paper>
            )}
          </>
        )}
      </Box>

      {/* Style Selection */}
      {!loading && !error && (
        <Paper elevation={3} sx={{ maxHeight: '250px', overflowY: 'auto' }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            variant="fullWidth"
          >
            <Tab label="Face Paint" />
            <Tab label="Tattoos" />
            <Tab label="Party" />
          </Tabs>

          <Box sx={{ p: 2 }}>
            <Grid container spacing={1} mb={2}>
              {getCurrentStyles().map((style) => (
                <Grid item xs={6} sm={3} key={style.id}>
                  <Paper
                    onClick={() => {
                      console.log('🎨 User clicked style:', style.name, 'pattern:', style.pattern);
                      setSelectedStyle(style);
                    }}
                    sx={{
                      p: 1,
                      cursor: 'pointer',
                      textAlign: 'center',
                      border: 2,
                      borderColor: selectedStyle?.id === style.id ? 'primary.main' : 'transparent',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.light',
                        transform: 'scale(1.05)',
                      },
                    }}
                  >
                    <Palette sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="caption" fontWeight="bold" display="block">
                      {style.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
                      {style.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {/* Color Selection */}
            <Typography variant="caption" gutterBottom>
              Choose Color:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
              {colors.map((color) => (
                <Box
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: color.value === 'rainbow' 
                      ? 'linear-gradient(45deg, red, yellow, green, blue)'
                      : color.value,
                    background: color.value === 'rainbow' 
                      ? 'linear-gradient(45deg, red, yellow, green, blue)'
                      : color.value,
                    cursor: 'pointer',
                    border: 3,
                    borderColor: selectedColor === color.value ? 'primary.main' : 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                  }}
                  title={color.name}
                />
              ))}
            </Stack>
          </Box>
        </Paper>
      )}

      {/* Capture Dialog */}
      <Dialog
        open={showCaptureDialog}
        onClose={() => setShowCaptureDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Your Masterpiece! 🎨</DialogTitle>
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
            Love this look? Download your photo or add the product to cart!
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
            onClick={() => {
              if (onAddToCart && product) {
                onAddToCart(product);
              }
              setShowCaptureDialog(false);
            }}
            startIcon={<ShoppingCart />}
          >
            Add to Cart
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VirtualMakeupAR;
