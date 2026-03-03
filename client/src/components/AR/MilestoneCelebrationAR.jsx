import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Card,
  CardContent,
} from '@mui/material';
import {
  Close,
  FlipCameraIos,
  PhotoCamera,
  Download,
  Refresh,
  EmojiEvents,
  Celebration,
  Star,
  Favorite,
  AutoAwesome,
} from '@mui/icons-material';

/**
 * MilestoneCelebrationAR Component
 * 
 * Immersive AR celebration experience when children achieve milestones
 * - Camera-based AR overlay with celebration effects
 * - Confetti, fireworks, balloons, stars animations
 * - Photo capture with celebration overlay
 * - Share celebration moments
 * 
 * Features:
 * - Live camera with AR effects
 * - Multiple celebration themes
 * - Capture and download photos
 * - Milestone information display
 */
const MilestoneCelebrationAR = ({ milestone, child, onClose, onSavePhoto }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [celebrationType, setCelebrationType] = useState('confetti');
  const [facingMode, setFacingMode] = useState('user');
  const [capturedImage, setCapturedImage] = useState(null);
  const [showCaptureDialog, setShowCaptureDialog] = useState(false);

  // Celebration themes
  const celebrationTypes = [
    {
      id: 'confetti',
      name: '🎊 Confetti',
      colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'],
      icon: <Celebration />,
    },
    {
      id: 'fireworks',
      name: '🎆 Fireworks',
      colors: ['#FF1744', '#00E5FF', '#76FF03', '#FFEA00', '#E040FB'],
      icon: <AutoAwesome />,
    },
    {
      id: 'stars',
      name: '⭐ Stars',
      colors: ['#FFD700', '#FFA500', '#FFFF00', '#FFE4B5'],
      icon: <Star />,
    },
    {
      id: 'hearts',
      name: '💖 Hearts',
      colors: ['#FF69B4', '#FF1493', '#FF69B4', '#FFB6C1', '#FFC0CB'],
      icon: <Favorite />,
    },
    {
      id: 'balloons',
      name: '🎈 Balloons',
      colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'],
      icon: <EmojiEvents />,
    },
  ];

  // Particle class for animations
  class Particle {
    constructor(x, y, type, colors) {
      this.x = x;
      this.y = y;
      this.type = type;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.size = Math.random() * 15 + 5;
      this.speedX = (Math.random() - 0.5) * 3;
      this.speedY = Math.random() * -8 - 2;
      this.gravity = 0.15;
      this.opacity = 1;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = (Math.random() - 0.5) * 5;
      this.life = 100;
    }

    update() {
      this.speedY += this.gravity;
      this.x += this.speedX;
      this.y += this.speedY;
      this.rotation += this.rotationSpeed;
      this.life -= 1;
      this.opacity = this.life / 100;

      // Special behavior for different types
      if (this.type === 'balloons') {
        this.speedY = -2; // Float up
        this.speedX = Math.sin(this.y * 0.01) * 2;
      } else if (this.type === 'hearts') {
        this.x += Math.sin(this.y * 0.05) * 2;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.translate(this.x, this.y);
      ctx.rotate((this.rotation * Math.PI) / 180);

      if (this.type === 'confetti') {
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size / 3);
      } else if (this.type === 'stars') {
        this.drawStar(ctx, 0, 0, 5, this.size, this.size / 2);
      } else if (this.type === 'hearts') {
        this.drawHeart(ctx, 0, 0, this.size);
      } else if (this.type === 'fireworks') {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.type === 'balloons') {
        this.drawBalloon(ctx, 0, 0, this.size);
      }

      ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
    }

    drawHeart(ctx, x, y, size) {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      const topCurveHeight = size * 0.3;
      ctx.moveTo(x, y + topCurveHeight);
      ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
      ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + (size + topCurveHeight) / 1.2, x, y + size);
      ctx.bezierCurveTo(x, y + (size + topCurveHeight) / 1.2, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
      ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
      ctx.closePath();
      ctx.fill();
    }

    drawBalloon(ctx, x, y, size) {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(x, y, size / 2, size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // String
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + size * 0.6);
      ctx.lineTo(x, y + size * 0.6 + 20);
      ctx.stroke();
    }

    isDead() {
      return this.life <= 0;
    }
  }

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      console.log('🎥 Initializing camera for milestone celebration...');
      setError(null);

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setLoading(false);
          startAnimation();
        };
      }
    } catch (err) {
      console.error('Camera initialization error:', err);
      setError('Camera access denied. Please enable camera permissions.');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Start celebration animation
  const startAnimation = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const animate = () => {
      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Add new particles periodically
      if (Math.random() < 0.3) {
        const theme = celebrationTypes.find(t => t.id === celebrationType);
        for (let i = 0; i < 5; i++) {
          particlesRef.current.push(
            new Particle(
              Math.random() * canvas.width,
              canvas.height + 20,
              celebrationType,
              theme.colors
            )
          );
        }
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.update();
        particle.draw(ctx);
        return !particle.isDead();
      });

      // Draw milestone overlay at top
      drawMilestoneOverlay(ctx, canvas.width, canvas.height);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  // Draw milestone information overlay
  const drawMilestoneOverlay = (ctx, width, height) => {
    // Semi-transparent background at top
    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, 150);

    // Milestone text
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 MILESTONE ACHIEVED! 🎉', width / 2, 40);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(milestone?.title || milestone?.milestone || 'Great Job!', width / 2, 80);

    // Child name
    if (child?.name) {
      ctx.font = '20px Arial';
      ctx.fillText(`Way to go, ${child.name}! 🌟`, width / 2, 115);
    }
  };

  // Capture photo with celebration overlay
  const capturePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL('image/png');
    setCapturedImage(imageData);
    setShowCaptureDialog(true);
  };

  // Download captured photo
  const downloadPhoto = () => {
    if (!capturedImage) return;

    const link = document.createElement('a');
    link.href = capturedImage;
    link.download = `milestone-${child?.name || 'celebration'}-${Date.now()}.png`;
    link.click();
  };

  // Save photo to album
  const saveToAlbum = () => {
    if (onSavePhoto && capturedImage) {
      onSavePhoto(capturedImage, milestone, child);
    }
    setShowCaptureDialog(false);
  };

  // Toggle camera facing mode
  const toggleCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Stop camera and animation
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Change celebration type
  const handleCelebrationChange = (type) => {
    setCelebrationType(type);
    particlesRef.current = []; // Clear existing particles
  };

  // Initialize on mount
  useEffect(() => {
    initCamera();
    return () => stopCamera();
  }, [facingMode, initCamera]);

  // Handle close
  const handleClose = () => {
    stopCamera();
    if (onClose) onClose();
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'black',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEvents sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Milestone Celebration AR
            </Typography>
            <Typography variant="caption">
              Celebrate {child?.name}'s achievement!
            </Typography>
          </Box>
        </Box>
        <IconButton color="inherit" onClick={handleClose}>
          <Close />
        </IconButton>
      </Paper>

      {/* Main content */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'white',
              zIndex: 10,
            }}
          >
            <CircularProgress color="inherit" size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Starting celebration...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
            <Button color="inherit" onClick={initCamera} sx={{ ml: 2 }}>
              Retry
            </Button>
          </Alert>
        )}

        {/* Video (hidden) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ display: 'none' }}
        />

        {/* Canvas for AR overlay */}
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Controls overlay */}
        {!loading && !error && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              p: 3,
            }}
          >
            {/* Celebration type selector */}
            <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, textAlign: 'center' }}>
              Choose Celebration Style:
            </Typography>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {celebrationTypes.map((type) => (
                <Grid item xs={2.4} key={type.id}>
                  <Tooltip title={type.name}>
                    <Chip
                      icon={type.icon}
                      label={type.name.split(' ')[1]}
                      onClick={() => handleCelebrationChange(type.id)}
                      color={celebrationType === type.id ? 'primary' : 'default'}
                      sx={{
                        width: '100%',
                        bgcolor: celebrationType === type.id ? undefined : 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontWeight: celebrationType === type.id ? 'bold' : 'normal',
                      }}
                    />
                  </Tooltip>
                </Grid>
              ))}
            </Grid>

            {/* Action buttons */}
            <Stack direction="row" spacing={2} justifyContent="center">
              <Tooltip title="Flip Camera">
                <IconButton
                  onClick={toggleCamera}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  <FlipCameraIos />
                </IconButton>
              </Tooltip>

              <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={<PhotoCamera />}
                onClick={capturePhoto}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                }}
              >
                Capture Celebration
              </Button>

              <Tooltip title="Refresh Effects">
                <IconButton
                  onClick={() => particlesRef.current = []}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        )}
      </Box>

      {/* Milestone info card (bottom-left corner) */}
      {milestone && !loading && !error && (
        <Card
          sx={{
            position: 'absolute',
            bottom: 200,
            left: 20,
            maxWidth: 300,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
          }}
        >
          <CardContent>
            <Typography variant="h6" color="primary" gutterBottom>
              🎯 Milestone Details
            </Typography>
            <Typography variant="body2" paragraph>
              <strong>{milestone.title || milestone.milestone}</strong>
            </Typography>
            {milestone.category && (
              <Chip
                label={milestone.category}
                size="small"
                color="primary"
                sx={{ mb: 1 }}
              />
            )}
            {milestone.completedDate && (
              <Typography variant="caption" display="block" color="text.secondary">
                Achieved: {new Date(milestone.completedDate).toLocaleDateString()}
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Capture dialog */}
      <Dialog
        open={showCaptureDialog}
        onClose={() => setShowCaptureDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Celebration color="primary" />
            <Typography variant="h6">Celebration Captured! 🎉</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {capturedImage && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={capturedImage}
                alt="Captured celebration"
                style={{
                  maxWidth: '100%',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCaptureDialog(false)}>Cancel</Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={downloadPhoto}
          >
            Download
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={saveToAlbum}
          >
            Save to Album
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MilestoneCelebrationAR;
