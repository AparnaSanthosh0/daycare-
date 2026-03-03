import React, { useState, useRef, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Chip,
  IconButton,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  ArrowBack,
  VolumeUp,
  Explore,
  School,
  Nature,
  Pets,
  ViewInAr,
  CropSquare,
} from '@mui/icons-material';

// 360° Environments with hotspots
const ENVIRONMENTS = {
  classroom: {
    name: 'Classroom',
    icon: <School />,
    backgroundImage: '/images/vr-360/classroom1.jpg',
    hotspots: [
      // Center items
      { id: 1, position: [0, 0.3, 0.5], label: 'Blackboard', emoji: '📋', color: '#424242' },
      { id: 2, position: [0, 2.0, 0.5], label: 'Clock', emoji: '🕐', color: '#F44336' },
      
      // Left side items
      { id: 3, position: [-3.0, -1.5, 0.5], label: 'Desk', emoji: '🪑', color: '#8D6E63' },
      { id: 4, position: [-2.5, -0.8, 0.5], label: 'Chair', emoji: '💺', color: '#2196F3' },
      { id: 5, position: [-1.5, 0.3, 0.5], label: 'Books', emoji: '📚', color: '#4CAF50' },
      { id: 6, position: [-0.8, 0.3, 0.5], label: 'Book Stand', emoji: '📚', color: '#9C27B0' },
      { id: 7, position: [-3.8, 0.2, 0.5], label: 'Shelf', emoji: '📖', color: '#FF9800' },
      { id: 8, position: [-3.8, -0.6, 0.5], label: 'Plant', emoji: '🪴', color: '#4CAF50' },
      { id: 9, position: [-3.5, 2.3, 0.5], label: 'Fan', emoji: '💨', color: '#03A9F4' },
      { id: 10, position: [-3.8, 0.9, 0.5], label: 'Box', emoji: '📦', color: '#795548' },
      
      // Right side items  
      { id: 11, position: [3.0, -1.5, 0.5], label: 'Desk', emoji: '🪑', color: '#8D6E63' },
      { id: 12, position: [2.5, -0.8, 0.5], label: 'Chair', emoji: '💺', color: '#2196F3' },
      { id: 13, position: [0.8, 0.3, 0.5], label: 'Book Stand', emoji: '📚', color: '#9C27B0' },
      { id: 14, position: [3.5, 2.3, 0.5], label: 'Fan', emoji: '💨', color: '#03A9F4' },
      
      // Back desk items
      { id: 15, position: [0, -2.0, 0.5], label: 'Pencils', emoji: '✏️', color: '#FF9800' },
      { id: 16, position: [-1.5, -1.8, 0.5], label: 'Books', emoji: '📖', color: '#4CAF50' },
      { id: 17, position: [1.5, -1.8, 0.5], label: 'Books', emoji: '📖', color: '#4CAF50' },
    ],
  },
  forest: {
    name: 'Forest',
    icon: <Nature />,
    backgroundImage: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=2000&q=80',
    hotspots: [
      { id: 1, position: [2, 0, -3], label: 'Tree', emoji: '🌳', color: '#4CAF50' },
      { id: 2, position: [-2, 1, -2], label: 'Bird', emoji: '🐦', color: '#03A9F4' },
      { id: 3, position: [0, -1, -4], label: 'Flower', emoji: '🌸', color: '#E91E63' },
      { id: 4, position: [3, 0.5, 1], label: 'Butterfly', emoji: '🦋', color: '#9C27B0' },
      { id: 5, position: [-3, 0, 0], label: 'Leaf', emoji: '🍃', color: '#8BC34A' },
      { id: 6, position: [1, 1.5, 2], label: 'Sky', emoji: '☁️', color: '#2196F3' },
    ],
  },
  zoo: {
    name: 'Zoo',
    icon: <Pets />,
    backgroundImage: 'https://images.unsplash.com/photo-1549366021-9f761d450615?w=2000&q=80',
    hotspots: [
      { id: 1, position: [2, 0, -3], label: 'Lion', emoji: '🦁', color: '#FF9800' },
      { id: 2, position: [-2, 1, -2], label: 'Elephant', emoji: '🐘', color: '#9E9E9E' },
      { id: 3, position: [0, -1, -4], label: 'Monkey', emoji: '🐵', color: '#795548' },
      { id: 4, position: [3, 0.5, 1], label: 'Giraffe', emoji: '🦒', color: '#FFEB3B' },
      { id: 5, position: [-3, 0, 0], label: 'Zebra', emoji: '🦓', color: '#000000' },
      { id: 6, position: [1, 1.5, 2], label: 'Tiger', emoji: '🐯', color: '#FF6F00' },
    ],
  },
};

// Interactive Hotspot Component
function Hotspot({ position, label, emoji, color, onClick }) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();

  const handleClick = (e) => {
    e.stopPropagation();
    console.log('Mesh clicked! Label:', label);
    onClick(label);
  };

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerDown={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        scale={hovered ? 1.3 : 1}
        renderOrder={1}
      >
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.4}
          transparent
          opacity={0.9}
          depthTest={true}
          depthWrite={true}
        />
      </mesh>
      
      {/* Label */}
      <Html center distanceFactor={5}>
        <div
          onClick={handleClick}
          style={{
            background: hovered ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.85)',
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#333',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.2s ease',
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
        >
          {emoji} {label}
        </div>
      </Html>

      {/* Pulsing ring effect */}
      {hovered && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <ringGeometry args={[0.25, 0.35, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// Flat Image Display with Interactive Hotspots
function FlatImageDisplay({ imageUrl }) {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  
  // Calculate aspect ratio for proper display
  const aspect = texture.image ? texture.image.width / texture.image.height : 16 / 9;
  const width = 10;
  const height = width / aspect;

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
}

// 360° Sphere with panoramic image
function PanoramaSphere({ imageUrl }) {
  const texture = useLoader(THREE.TextureLoader, imageUrl);

  return (
    <mesh>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

// Main VR Scene
function VRScene({ environment, onHotspotClick, is360Mode }) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={1} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      {/* Display Mode - Flat or 360° */}
      <Suspense fallback={null}>
        {is360Mode ? (
          <PanoramaSphere imageUrl={environment.backgroundImage} />
        ) : (
          <FlatImageDisplay imageUrl={environment.backgroundImage} />
        )}
      </Suspense>

      {/* Interactive Hotspots */}
      {environment.hotspots.map((hotspot) => (
        <Hotspot
          key={hotspot.id}
          position={hotspot.position}
          label={hotspot.label}
          emoji={hotspot.emoji}
          color={hotspot.color}
          onClick={onHotspotClick}
        />
      ))}

      {/* Orbit Controls for rotation and zoom */}
      <OrbitControls
        enableZoom={true}
        enablePan={!is360Mode}
        enableRotate={true}
        rotateSpeed={0.5}
        zoomSpeed={1.2}
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={is360Mode ? 0.1 : 3}
        maxDistance={is360Mode ? 1 : 20}
      />
    </>
  );
}

// Main Component
export default function VR360Explorer() {
  const navigate = useNavigate();
  const [selectedEnv, setSelectedEnv] = useState('classroom');
  const [lastClicked, setLastClicked] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [is360Mode, setIs360Mode] = useState(false);

  const currentEnvironment = ENVIRONMENTS[selectedEnv];

  // Text-to-speech function with better browser compatibility
  const speak = (text) => {
    console.log('Attempting to speak:', text);
    
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported in this browser');
      alert(`${text} (Speech not supported)`);
      return;
    }

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';
      
      utterance.onstart = () => {
        console.log('Speech started:', text);
      };
      
      utterance.onend = () => {
        console.log('Speech ended:', text);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        alert(`${text} (Speech error)`);
      };
      
      // Speak immediately
      console.log('Speaking now...');
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('Error in speak function:', error);
      alert(`${text} (Error: ${error.message})`);
    }
  };

  const handleHotspotClick = (label) => {
    console.log('Hotspot clicked:', label);
    setLastClicked(label);
    speak(label);
    
    // Visual feedback
    setTimeout(() => setLastClicked(null), 2000);
  };

  const handleEnvironmentChange = (envKey) => {
    setIsNavigating(true);
    setTimeout(() => {
      setSelectedEnv(envKey);
      setIsNavigating(false);
    }, 300);
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
      }}
    >
      {/* Header */}
      <AppBar position="static" sx={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard', { state: { initialTab: 11 } })}>
            <ArrowBack />
          </IconButton>
          <Explore sx={{ ml: 1, mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Interactive Explorer - {currentEnvironment.name}
          </Typography>
          <Chip
            icon={is360Mode ? <CropSquare /> : <ViewInAr />}
            label={is360Mode ? '2D View' : '360° View'}
            color="info"
            onClick={() => setIs360Mode(!is360Mode)}
            sx={{ fontWeight: 'bold', cursor: 'pointer', mr: 1 }}
          />
          <Chip
            icon={<VolumeUp />}
            label="Test Audio"
            color="secondary"
            onClick={() => speak('Hello! Audio is working!')}
            sx={{ fontWeight: 'bold', cursor: 'pointer', mr: 1 }}
          />
          <Chip
            icon={<VolumeUp />}
            label="Click objects to hear"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 'bold' }}
          />
        </Toolbar>
      </AppBar>

      {/* 3D Canvas */}
      <Box sx={{ width: '100%', height: 'calc(100vh - 64px - 80px)', position: 'relative' }}>
        <Canvas
          key={is360Mode ? '360' : '2d'}
          camera={{ 
            position: is360Mode ? [0, 0, 0.1] : [0, 0, 10], 
            fov: is360Mode ? 75 : 50 
          }}
          style={{
            opacity: isNavigating ? 0.3 : 1,
            transition: 'opacity 0.3s ease',
          }}
          onPointerMissed={() => console.log('Canvas clicked but no object hit')}
        >
          <VRScene environment={currentEnvironment} onHotspotClick={handleHotspotClick} is360Mode={is360Mode} />
        </Canvas>

        {/* Click Feedback */}
        {lastClicked && (
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              px: 4,
              py: 2,
              background: 'rgba(76, 175, 80, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: 3,
              animation: 'pulse 0.5s ease',
              '@keyframes pulse': {
                '0%': { transform: 'translateX(-50%) scale(0.8)', opacity: 0 },
                '50%': { transform: 'translateX(-50%) scale(1.1)', opacity: 1 },
                '100%': { transform: 'translateX(-50%) scale(1)', opacity: 1 },
              },
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <VolumeUp sx={{ color: 'white', fontSize: 32 }} />
              <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                {lastClicked}
              </Typography>
            </Stack>
          </Paper>
        )}

        {/* Instructions */}
        <Paper
          sx={{
            position: 'absolute',
            bottom: '100px',
            right: '20px',
            px: 3,
            py: 2,
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            maxWidth: '280px',
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold" color="primary" gutterBottom>
            🖱️ How to Explore:
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            • Toggle {is360Mode ? '2D' : '360°'} view at top
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            • Drag to rotate view
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            • Scroll to zoom in/out
          </Typography>
          {!is360Mode && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              • Right-drag to pan
            </Typography>
          )}
          <Typography variant="body2">
            • Click labels to hear names
          </Typography>
        </Paper>
      </Box>

      {/* Environment Selector */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '80px',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          px: 2,
        }}
      >
        {Object.entries(ENVIRONMENTS).map(([key, env]) => (
          <Button
            key={key}
            variant={selectedEnv === key ? 'contained' : 'outlined'}
            size="large"
            startIcon={env.icon}
            onClick={() => handleEnvironmentChange(key)}
            sx={{
              minWidth: '140px',
              height: '50px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderRadius: 3,
              color: selectedEnv === key ? 'white' : '#fff',
              borderColor: 'rgba(255, 255, 255, 0.5)',
              '&:hover': {
                borderColor: 'white',
                background: selectedEnv === key ? undefined : 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            {env.name}
          </Button>
        ))}
      </Box>
    </Box>
  );
}
