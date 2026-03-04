import React, { useEffect, useRef, useState } from 'react';
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
  Stack,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Close,
  CameraAlt,
  FlipCameraIos,
  Refresh,
  ShoppingCart,
  Palette,
} from '@mui/icons-material';

/**
 * OutfitAR
 *
 * Camera-based AR overlay that approximates a dress/top on the child's upper body.
 * Parents can customize:
 * - Color (tint)
 * - Pattern (solid, stripes, polka dots, checks)
 * - Intensity (opacity)
 *
 * This is optimized as a fun preview / configurator rather than precise body tracking.
 */
const OutfitAR = ({ product, onClose, onAddToCart }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const detectorRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('user');
  const [selectedColor, setSelectedColor] = useState('#FF69B4');
  const [pattern, setPattern] = useState('solid'); // 'solid' | 'stripes' | 'dots' | 'checks'
  const [intensity, setIntensity] = useState(70);

  // Keep latest values available inside render loop
  const styleRef = useRef({
    color: selectedColor,
    pattern,
    intensity,
  });

  useEffect(() => {
    styleRef.current = { ...styleRef.current, color: selectedColor };
  }, [selectedColor]);

  useEffect(() => {
    styleRef.current = { ...styleRef.current, pattern };
  }, [pattern]);

  useEffect(() => {
    styleRef.current = { ...styleRef.current, intensity };
  }, [intensity]);

  const colors = [
    { name: 'Pink', value: '#FF69B4' },
    { name: 'Sky Blue', value: '#4FC3F7' },
    { name: 'Lavender', value: '#B39DDB' },
    { name: 'Mint', value: '#81C784' },
    { name: 'Sunny Yellow', value: '#FFD54F' },
    { name: 'Coral', value: '#FF8A65' },
    { name: 'Classic White', value: '#FFFFFF' },
    { name: 'Navy', value: '#283593' },
  ];

  const patterns = [
    { id: 'solid', label: 'Solid' },
    { id: 'stripes', label: 'Stripes' },
    { id: 'dots', label: 'Polka Dots' },
    { id: 'checks', label: 'Checks' },
  ];

  const initCamera = async () => {
    try {
      setError(null);
      setLoading(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback basic constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => resolve();
        });

        await initDetector();
        setLoading(false);

        setTimeout(() => {
          if (videoRef.current && canvasRef.current && detectorRef.current) {
            startRendering();
          }
        }, 150);
      }
    } catch (err) {
      let msg = 'Camera access failed. ';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera access denied. Please allow camera permissions in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No camera found. Please ensure a camera is connected to your device.';
      } else if (err.message === 'Camera API not supported in this browser') {
        msg = `${err.message}. Please use a modern browser like Chrome, Edge or Firefox.`;
      } else {
        msg += err.message || 'Unknown error.';
      }
      setError(msg);
      setLoading(false);
    }
  };

  const initDetector = async () => {
    try {
      if ('FaceDetector' in window) {
        detectorRef.current = new window.FaceDetector({
          maxDetectedFaces: 1,
          fastMode: true,
        });
      } else {
        // Fallback: approximate face and upper body in center
        detectorRef.current = {
          detect: async (video) => {
            const w = video.videoWidth;
            const h = video.videoHeight;
            return [
              {
                boundingBox: {
                  x: w * 0.3,
                  y: h * 0.15,
                  width: w * 0.4,
                  height: h * 0.3,
                },
              },
            ];
          },
        };
      }
    } catch {
      detectorRef.current = {
        detect: async (video) => {
          const w = video.videoWidth;
          const h = video.videoHeight;
          return [
            {
              boundingBox: {
                x: w * 0.3,
                y: h * 0.15,
                width: w * 0.4,
                height: h * 0.3,
              },
            },
          ];
        },
      };
    }
  };

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (mounted) {
        await initCamera();
      }
    };
    run();
    return () => {
      mounted = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const startRendering = () => {
    const render = async () => {
      if (!videoRef.current || !canvasRef.current || !detectorRef.current) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Draw base video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const faces = await detectorRef.current.detect(video);
        const face = faces && faces[0];
        if (face) {
          drawOutfit(ctx, face.boundingBox, canvas.width, canvas.height);
        } else {
          // Fallback: approximate torso in center
          const w = canvas.width;
          const h = canvas.height;
          const fallbackFace = {
            x: w * 0.3,
            y: h * 0.15,
            width: w * 0.4,
            height: h * 0.3,
          };
          drawOutfit(ctx, fallbackFace, w, h);
        }
      } catch {
        const w = canvas.width;
        const h = canvas.height;
        const fallbackFace = {
          x: w * 0.3,
          y: h * 0.15,
          width: w * 0.4,
          height: h * 0.3,
        };
        drawOutfit(ctx, fallbackFace, w, h);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();
  };

  // Approximate a dress region below the detected face and render with current style
  const drawOutfit = (ctx, faceBounds, canvasWidth, canvasHeight) => {
    const { color, pattern, intensity } = styleRef.current;
    const alpha = (intensity || 0) / 100;
    if (alpha <= 0.01) return;

    const faceWidth = faceBounds.width;
    const faceHeight = faceBounds.height;

    // Torso rectangle below face
    const torsoWidth = faceWidth * 1.4;
    const torsoHeight = faceHeight * 2.4;
    const torsoX = faceBounds.x + faceWidth / 2 - torsoWidth / 2;
    const torsoY = faceBounds.y + faceHeight * 0.8;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Dress base shape (simple rounded rectangle with a triangle neckline)
    ctx.fillStyle = color || '#FF69B4';

    const radius = torsoWidth * 0.1;
    const x = torsoX;
    const y = torsoY;
    const w = torsoWidth;
    const h = torsoHeight;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    // Neckline (simple V)
    ctx.globalAlpha = Math.min(1, alpha + 0.1);
    ctx.beginPath();
    const neckWidth = w * 0.35;
    ctx.moveTo(x + w / 2 - neckWidth / 2, y + radius);
    ctx.lineTo(x + w / 2, y + radius + neckWidth * 0.6);
    ctx.lineTo(x + w / 2 + neckWidth / 2, y + radius);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fill();

    // Apply pattern on top of base shape
    switch (pattern) {
      case 'stripes':
        drawStripes(ctx, x, y, w, h);
        break;
      case 'dots':
        drawDots(ctx, x, y, w, h);
        break;
      case 'checks':
        drawChecks(ctx, x, y, w, h);
        break;
      default:
        break;
    }

    ctx.restore();
  };

  const drawStripes = (ctx, x, y, w, h) => {
    const stripeHeight = h * 0.12;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let yy = y + stripeHeight * 0.5; yy < y + h; yy += stripeHeight * 2) {
      ctx.fillRect(x, yy, w, stripeHeight);
    }
  };

  const drawDots = (ctx, x, y, w, h) => {
    const radius = Math.min(w, h) * 0.035;
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    const cols = Math.floor(w / (radius * 3));
    const rows = Math.floor(h / (radius * 3));
    for (let i = 0; i <= cols; i++) {
      for (let j = 0; j <= rows; j++) {
        const cx = x + radius * 2 + i * radius * 3;
        const cy = y + radius * 2 + j * radius * 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const drawChecks = (ctx, x, y, w, h) => {
    const cell = Math.min(w, h) * 0.12;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let xx = x; xx < x + w; xx += cell) {
      for (let yy = y; yy < y + h; yy += cell) {
        if (((Math.floor((xx - x) / cell) + Math.floor((yy - y) / cell)) % 2) === 0) {
          ctx.fillRect(xx, yy, cell, cell);
        }
      }
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    setLoading(true);
  };

  const handleAddToCart = () => {
    if (onAddToCart && product) {
      onAddToCart(product);
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
            Outfit AR Customizer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {product?.name || 'Dress / Outfit'}
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
        {loading && !error && (
          <Box textAlign="center">
            <CircularProgress size={60} />
            <Typography color="white" mt={2}>
              Initializing camera...
            </Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ textAlign: 'center', p: 4, maxWidth: 520, mx: 'auto' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                onClick={initCamera}
                startIcon={<Refresh />}
              >
                Retry Camera
              </Button>
            </Stack>
          </Box>
        )}

        <video
          ref={videoRef}
          style={{ display: 'none' }}
          playsInline
          muted
        />

        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: loading || error ? 'none' : 'block',
          }}
        />

        {/* Camera & capture controls */}
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

            <Tooltip title="Capture Photo (coming soon)">
              <span>
                <IconButton
                  disabled
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.5)',
                    color: 'white',
                    width: 64,
                    height: 64,
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

            <Tooltip title="Reset Style">
              <IconButton
                onClick={() => {
                  setSelectedColor('#FF69B4');
                  setPattern('solid');
                  setIntensity(70);
                }}
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

      {/* Customization Panel */}
      {!loading && !error && (
        <Paper elevation={3} sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Color
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {colors.map((c) => (
                  <Box
                    key={c.value}
                    onClick={() => setSelectedColor(c.value)}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: c.value,
                      border: 2,
                      borderColor: selectedColor === c.value ? 'primary.main' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'scale(1.1)',
                      },
                    }}
                    title={c.name}
                  />
                ))}
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Pattern
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {patterns.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.label}
                    icon={<Palette fontSize="small" />}
                    size="small"
                    color={pattern === p.id ? 'primary' : 'default'}
                    onClick={() => setPattern(p.id)}
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Intensity
              </Typography>
              <Slider
                value={intensity}
                min={10}
                max={100}
                valueLabelDisplay="auto"
                onChange={(e, val) => setIntensity(val)}
              />
            </Grid>
          </Grid>

          <Box
            sx={{
              mt: 2,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              See how different colors and patterns look on your child before you buy.
            </Typography>
            <Button
              variant="contained"
              color="success"
              startIcon={<ShoppingCart />}
              onClick={handleAddToCart}
              disabled={!product}
            >
              Add This Outfit to Cart
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default OutfitAR;

