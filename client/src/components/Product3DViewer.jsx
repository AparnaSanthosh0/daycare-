import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, PresentationControls } from '@react-three/drei';
import { Box, Typography, CircularProgress, Alert, IconButton, Tooltip } from '@mui/material';
import { Fullscreen, FullscreenExit, Refresh, ZoomIn, ZoomOut } from '@mui/icons-material';

// Component to load and display the 3D model
function Model({ url, scale = 1, position = [0, 0, 0] }) {
  // useGLTF handles loading and throws errors that Suspense can catch
  const { scene } = useGLTF(url);
  
  useEffect(() => {
    if (!scene) return;
    
    // Center and configure the model
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  if (!scene) {
    return null;
  }

  return <primitive object={scene} scale={scale} position={position} />;
}

// Loading fallback component
function Loader() {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100%"
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(243, 244, 246, 0.9)',
        zIndex: 100
      }}
    >
      <CircularProgress size={60} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Loading 3D Model...
      </Typography>
    </Box>
  );
}

// Error Boundary Component
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error('3D Model Error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="100%"
          p={3}
        >
          <Alert severity="warning" sx={{ maxWidth: 400 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Unable to load 3D model
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {this.state.error || 'The model file may be missing or corrupted.'}
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              💡 Try refreshing the page or viewing the product images instead.
            </Typography>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * Product3DViewer Component
 * 
 * A reusable 3D product viewer using Three.js and React Three Fiber
 * 
 * @param {string} modelUrl - URL to the GLB/GLTF model file
 * @param {boolean} autoRotate - Enable auto-rotation (default: true)
 * @param {boolean} cameraControls - Enable camera controls (default: true)
 * @param {number} height - Height of the viewer in pixels (default: 500)
 * @param {number} scale - Scale of the model (default: 1)
 * @param {array} position - Position of the model [x, y, z] (default: [0, 0, 0])
 * @param {string} backgroundColor - Background color (default: '#f5f5f5')
 * @param {boolean} showControls - Show control buttons (default: true)
 * @param {string} environment - Environment preset for lighting (default: 'city')
 */
const Product3DViewer = ({
  modelUrl,
  autoRotate = true,
  cameraControls = true,
  height = 500,
  scale = 1,
  position = [0, 0, 0],
  backgroundColor = '#f5f5f5',
  showControls = true,
  environment = 'city'
}) => {
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [key, setKey] = useState(0); // For reset functionality
  const [loading, setLoading] = useState(true);

  // Validate model URL
  useEffect(() => {
    if (!modelUrl) {
      setError('No model URL provided');
      return;
    }
    
    // Check if URL is valid
    if (!modelUrl.endsWith('.glb') && !modelUrl.endsWith('.gltf')) {
      setError('Invalid model format. Only GLB and GLTF files are supported.');
      return;
    }
    
    setLoading(false);
  }, [modelUrl]);

  // Handle errors from Model component
  const handleModelError = (err) => {
    console.error('Model loading error:', err);
    setError(err?.message || 'Failed to load 3D model');
    setLoading(false);
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle zoom
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  // Reset view
  const handleReset = () => {
    setZoom(1);
    setKey(prev => prev + 1); // Force re-render to reset camera
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="body2">
          Failed to load 3D model. Please check the model URL.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {error}
        </Typography>
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: isFullscreen ? '100vh' : height,
        backgroundColor,
        borderRadius: isFullscreen ? 0 : 2,
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 1,
        overflow: 'hidden',
        boxShadow: isFullscreen ? 'none' : '0 4px 12px rgba(0,0,0,0.1)'
      }}
    >
      {/* Control Buttons */}
      {showControls && (
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,
            display: 'flex',
            gap: 1,
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: 1,
            padding: 0.5
          }}
        >
          <Tooltip title="Zoom In">
            <IconButton size="small" onClick={handleZoomIn}>
              <ZoomIn />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton size="small" onClick={handleZoomOut}>
              <ZoomOut />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset View">
            <IconButton size="small" onClick={handleReset}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton size="small" onClick={toggleFullscreen}>
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Instructions */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: 2,
          fontSize: '0.875rem'
        }}
      >
        <Typography variant="caption">
          🖱️ Drag to rotate • Scroll to zoom • Right-click to pan
        </Typography>
      </Box>

      {/* 3D Canvas */}
      <Canvas
        key={key}
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ 
          preserveDrawingBuffer: true,
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(backgroundColor);
        }}
      >
        {/* Ambient and directional lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />

        {/* Environment lighting */}
        <Environment preset={environment} />

        {/* Model with error boundary */}
        <Suspense fallback={null}>
          <ModelErrorBoundary onError={handleModelError}>
            <PresentationControls
              enabled={cameraControls}
              global
              config={{ mass: 2, tension: 500 }}
              snap={{ mass: 4, tension: 1500 }}
              rotation={[0, 0, 0]}
              polar={[-Math.PI / 3, Math.PI / 3]}
              azimuth={[-Infinity, Infinity]}
            >
              <Model 
                url={modelUrl} 
                scale={scale * zoom} 
                position={position}
              />
            </PresentationControls>
          </ModelErrorBoundary>
        </Suspense>

        {/* Camera controls */}
        {cameraControls && (
          <OrbitControls
            autoRotate={autoRotate}
            autoRotateSpeed={2}
            enableZoom={true}
            enablePan={true}
            minDistance={2}
            maxDistance={10}
          />
        )}
      </Canvas>

      {/* Loading overlay */}
      {loading && <Loader />}
    </Box>
  );
};

export default Product3DViewer;
