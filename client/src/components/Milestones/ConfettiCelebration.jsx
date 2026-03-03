import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Chip,
  Paper,
} from '@mui/material';
import {
  Close,
  Download,
  EmojiEvents,
  Celebration,
  Star,
  Favorite,
  AutoAwesome,
} from '@mui/icons-material';

/**
 * ConfettiCelebration Component
 * 
 * Simple celebration animation for milestone achievements
 * - NO camera required
 * - NO 3D rendering
 * - Pure CSS + Canvas 2D animations
 * - Confetti, balloons, stars, hearts
 * - Screenshot capability
 * - Works on all devices
 */
const ConfettiCelebration = ({ milestone, child, onClose, onSavePhoto }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const particlesRef = useRef([]);
  const containerRef = useRef(null);
  const audioRef = useRef(null);

  const [celebrationType, setCelebrationType] = useState('confetti');
  const [isAnimating, setIsAnimating] = useState(true);

  const childName = child?.name || 'Champion';
  const milestoneName = milestone?.milestone || 'Great Achievement';

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
      colors: ['#FF69B4', '#FF1493', '#FFB6C1', '#FFC0CB'],
      icon: <Favorite />,
    },
    {
      id: 'balloons',
      name: '🎈 Balloons',
      colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'],
      icon: <EmojiEvents />,
    },
  ];

  const currentTheme = celebrationTypes.find(t => t.id === celebrationType) || celebrationTypes[0];

  // Particle class for animations
  class Particle {
    constructor(x, y, type, colors) {
      this.x = x;
      this.y = y;
      this.type = type;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.size = Math.random() * 15 + 5;
      this.speedX = (Math.random() - 0.5) * 6;
      this.speedY = Math.random() * -12 - 4;
      this.gravity = 0.2;
      this.opacity = 1;
      this.rotation = Math.random() * 360;
      this.rotationSpeed = (Math.random() - 0.5) * 10;
      this.life = 150;
      this.maxLife = 150;
    }

    update() {
      // Different physics for different types
      if (this.type === 'balloons') {
        this.speedY = -1.5; // Float up slowly
        this.speedX = Math.sin(this.y * 0.01) * 1.5;
      } else if (this.type === 'hearts') {
        this.speedY += this.gravity * 0.3;
        this.x += Math.sin(this.y * 0.05) * 1.5;
      } else if (this.type === 'stars') {
        this.speedY += this.gravity * 0.5;
        this.speedX *= 0.98;
      } else if (this.type === 'fireworks') {
        this.speedX *= 0.99;
        this.speedY += this.gravity * 0.3;
      } else {
        // confetti
        this.speedY += this.gravity;
      }

      this.x += this.speedX;
      this.y += this.speedY;
      this.rotation += this.rotationSpeed;
      this.life -= 1;
      this.opacity = Math.max(0, this.life / this.maxLife);
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
        this.drawStar(ctx);
      } else if (this.type === 'hearts') {
        this.drawHeart(ctx);
      } else if (this.type === 'fireworks') {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        // Sparkle trail
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-this.size, 0);
        ctx.lineTo(this.size, 0);
        ctx.stroke();
      } else if (this.type === 'balloons') {
        this.drawBalloon(ctx);
      }

      ctx.restore();
    }

    drawStar(ctx) {
      const spikes = 5;
      const outerRadius = this.size;
      const innerRadius = this.size / 2;

      ctx.fillStyle = this.color;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / spikes) * i - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    drawHeart(ctx) {
      const size = this.size;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(0, size / 4);
      ctx.bezierCurveTo(-size / 2, -size / 3, -size, size / 4, 0, size);
      ctx.bezierCurveTo(size, size / 4, size / 2, -size / 3, 0, size / 4);
      ctx.closePath();
      ctx.fill();
    }

    drawBalloon(ctx) {
      const size = this.size;
      ctx.fillStyle = this.color;
      // Balloon body
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.6, size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Balloon knot
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, size * 0.8);
      ctx.lineTo(0, size * 1.2);
      ctx.stroke();
      // Balloon highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.ellipse(-size * 0.2, -size * 0.3, size * 0.2, size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    isAlive() {
      return this.life > 0;
    }
  }

  // Initialize canvas and start animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Play celebration sound
    playSuccessSound();

    // Create initial burst of particles
    createParticleBurst();

    // Animation loop
    const animate = () => {
      if (!isAnimating) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Add new particles periodically
      if (Math.random() < 0.3 && particlesRef.current.length < 200) {
        const x = Math.random() * canvas.width;
        const y = -20;
        particlesRef.current.push(new Particle(x, y, celebrationType, currentTheme.colors));
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.update();
        particle.draw(ctx);
        return particle.isAlive() && particle.y < canvas.height + 50;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [celebrationType, isAnimating]);

  // Create burst of particles from center
  const createParticleBurst = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 3;

    for (let i = 0; i < 100; i++) {
      particlesRef.current.push(
        new Particle(centerX, centerY, celebrationType, currentTheme.colors)
      );
    }
  };

  // Play success sound
  const playSuccessSound = () => {
    try {
      // Create a simple success chime using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 523.25; // C5
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Play second note
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 659.25; // E5
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.5);
      }, 150);
    } catch (error) {
      console.log('Audio not available:', error);
    }
  };

  // Capture screenshot
  const handleCapture = () => {
    const container = containerRef.current;
    if (!container) return;

    // Use html2canvas or simple canvas toDataURL
    const canvas = canvasRef.current;
    if (canvas) {
      const imageData = canvas.toDataURL('image/png');
      if (onSavePhoto) {
        onSavePhoto(imageData, milestone, child);
      }
      
      // Download image
      const link = document.createElement('a');
      link.download = `milestone-${milestone?.milestone?.replace(/\s+/g, '-')}-celebration.png`;
      link.href = imageData;
      link.click();
    }
  };

  // Change celebration type
  const changeCelebrationType = (type) => {
    setCelebrationType(type);
    particlesRef.current = []; // Clear particles
    createParticleBurst(); // Create new burst
    playSuccessSound();
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth={false}
      fullScreen
      PaperProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent
        ref={containerRef}
        sx={{
          p: 0,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Canvas for particles */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />

        {/* Close button */}
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            },
            zIndex: 10,
          }}
        >
          <Close />
        </IconButton>

        {/* Celebration message */}
        <Box
          sx={{
            textAlign: 'center',
            zIndex: 5,
            animation: 'bounceIn 1s ease-out',
            '@keyframes bounceIn': {
              '0%': { transform: 'scale(0)', opacity: 0 },
              '50%': { transform: 'scale(1.1)', opacity: 1 },
              '100%': { transform: 'scale(1)', opacity: 1 },
            },
          }}
        >
          <Paper
            elevation={10}
            sx={{
              p: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 4,
              maxWidth: 600,
            }}
          >
            <Box
              sx={{
                fontSize: 80,
                mb: 2,
                animation: 'pulse 1.5s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.1)' },
                },
              }}
            >
              🎉
            </Box>

            <Typography
              variant="h3"
              fontWeight="bold"
              color="primary"
              gutterBottom
              sx={{
                background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Amazing Work, {childName}!
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mt: 2, mb: 3 }}>
              ✨ Milestone Achieved ✨
            </Typography>

            <Chip
              label={milestoneName}
              color="success"
              sx={{
                fontSize: 18,
                p: 3,
                height: 'auto',
                borderRadius: 2,
              }}
            />

            <Typography variant="body1" sx={{ mt: 3, color: 'text.secondary' }}>
              {milestone?.category && `Category: ${milestone.category.toUpperCase()}`}
            </Typography>

            {milestone?.critical && (
              <Chip
                label="Critical Milestone ⭐"
                color="warning"
                size="small"
                sx={{ mt: 2 }}
              />
            )}

            {/* Celebration type selector */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle2" gutterBottom>
                Choose Celebration:
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ gap: 1 }}>
                {celebrationTypes.map((type) => (
                  <Chip
                    key={type.id}
                    label={type.name}
                    icon={type.icon}
                    onClick={() => changeCelebrationType(type.id)}
                    color={celebrationType === type.id ? 'primary' : 'default'}
                    variant={celebrationType === type.id ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Action buttons */}
            <Stack direction="row" spacing={2} sx={{ mt: 4 }} justifyContent="center">
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={handleCapture}
                size="large"
              >
                Save Photo
              </Button>
              <Button
                variant="outlined"
                onClick={onClose}
                size="large"
              >
                Continue
              </Button>
            </Stack>
          </Paper>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ConfettiCelebration;
