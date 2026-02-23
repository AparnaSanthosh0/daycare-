import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, PresentationControls } from '@react-three/drei';
import { isMobile } from 'react-device-detect';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  Fab,
  Button,
  Stack,
} from '@mui/material';
import {
  Fullscreen,
  FullscreenExit,
  Refresh,
  ZoomIn,
  ZoomOut,
  ViewInAr,
  CameraAlt,
  Close,
  ShoppingCart,
  Info,
} from '@mui/icons-material';

/**
 * Model Component
 * Loads and displays 3D model with AR-specific settings
 */
function ARModel({ url, scale = 1, position = [0, 0, 0] }) {
  console.log('🎭 ARModel: Loading model from:', url);
  
  const { scene } = useGLTF(url);
  
  useEffect(() => {
    if (!scene) {
      console.error('❌ ARModel: No scene found in model');
      return;
    }
    
    console.log('🎨 ARModel: Configuring model for AR display');
    
    // Configure model for AR display
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Enhance materials for better AR visibility
        if (child.material) {
          child.material.needsUpdate = true;
        }
      }
    });
  }, [scene]);

  if (!scene) {
    console.log('⚠️ ARModel: Scene not ready, returning null');
    return null;
  }

  console.log('✅ ARModel: Rendering model');
  return <primitive object={scene} scale={scale} position={position} />;
}

/**
 * Fallback Model Component
 * Shows a simple cube when model fails to load
 */
function FallbackModel({ scale = 1, position = [0, 0, 0] }) {
  console.log('⚠️ Using fallback model (cube)');
  return (
    <mesh scale={scale} position={position} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color="#1976d2" 
        metalness={0.3} 
        roughness={0.5} 
      />
    </mesh>
  );
}

/**
 * ARViewer Component
 * 
 * Displays 3D models in AR mode with enhanced mobile experience
 * Optimized for viewing products in real-world context
 * 
 * @param {string} modelUrl - URL to 3D model (GLB/GLTF)
 * @param {string} productName - Product name
 * @param {string} productId - Product ID
 * @param {number} price - Product price
 * @param {function} onClose - Close callback
 * @param {function} onAddToCart - Add to cart callback
 */
const ARViewer = ({
  modelUrl,
  productName = 'Product',
  productId,
  price,
  onClose,
  onAddToCart,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showInfo, setShowInfo] = useState(true);
  const [rotation, setRotation] = useState(0);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  
  // Debug: Log received props
  useEffect(() => {
    console.log('🎨 ARViewer component mounted');
    console.log('Model URL:', modelUrl);
    console.log('Product Name:', productName);
    console.log('Product ID:', productId);
    console.log('Price:', price);
  }, []);

  // Validate model URL
  useEffect(() => {
    console.log('🔍 Validating model URL:', modelUrl);
    
    if (!modelUrl) {
      console.error('❌ No model URL provided');
      setError('No 3D model available for AR view');
      return;
    }

    if (!modelUrl.endsWith('.glb') && !modelUrl.endsWith('.gltf')) {
      console.error('❌ Invalid model format:', modelUrl);
      setError('Invalid model format. Only GLB and GLTF files are supported.');
      return;
    }

    console.log('✅ Model URL validated');
    setLoading(false);
  }, [modelUrl]);

  // Auto-hide info panel after 5 seconds
  useEffect(() => {
    if (showInfo) {
      const timer = setTimeout(() => {
        setShowInfo(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showInfo]);

  // Auto-rotation animation
  useEffect(() => {
    const animate = () => {
      setRotation((prev) => (prev + 0.005) % (Math.PI * 2));
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  // Add to cart handler
  const handleAddToCart = () => {
    if (onAddToCart && productId) {
      onAddToCart({ id: productId, name: productName, price });
    }
  };

  if (error) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          p: 3,
        }}
      >
        <Alert
          severity="error"
          action={
            onClose && (
              <IconButton color="inherit" size="small" onClick={onClose}>
                <Close />
              </IconButton>
            )
          }
        >
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: isFullscreen ? '100vh' : '600px',
        position: 'relative',
        backgroundColor: '#000',
        overflow: 'hidden',
      }}
    >
      {/* AR Badge */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          px: 2,
          py: 1,
          backgroundColor: 'rgba(25, 118, 210, 0.95)',
          color: '#fff',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <ViewInAr />
        <Typography variant="body2" fontWeight={600}>
          AR Mode
        </Typography>
      </Paper>

      {/* Info Panel */}
      {showInfo && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            left: 16,
            zIndex: 10,
            p: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            maxWidth: 400,
            mx: 'auto',
          }}
        >
          <Stack direction="row" alignItems="flex-start" spacing={2}>
            <Info color="primary" />
            <Box flex={1}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {productName}
              </Typography>
              {price && (
                <Typography variant="body2" color="primary" fontWeight={600}>
                  ₹{price}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                👋 Drag to rotate • 🔍 Pinch to zoom • 📱 Move your phone around
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setShowInfo(false)}>
              <Close fontSize="small" />
            </IconButton>
          </Stack>
        </Paper>
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        style={{ touchAction: 'none' }} // Important for mobile
      >
        {/* AR-optimized lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-10, -10, -5]} intensity={0.6} />
        <pointLight position={[0, 5, 0]} intensity={0.5} />

        {/* Environment for realistic reflections */}
        <Environment preset="city" />

        {/* Ground plane for AR effect */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.3} />
        </mesh>

        {/* Model with AR controls */}
        <Suspense 
          fallback={
            <mesh>
              <boxGeometry args={[0.5, 0.5, 0.5]} />
              <meshBasicMaterial color="#1976d2" wireframe />
            </mesh>
          }
        >
          <PresentationControls
            enabled={true}
            global
            config={{ mass: 2, tension: 500 }}
            snap={{ mass: 4, tension: 1500 }}
            rotation={[0, rotation, 0]}
            polar={[-Math.PI / 3, Math.PI / 3]}
            azimuth={[-Infinity, Infinity]}
          >
            <ARModel url={modelUrl} scale={zoom} position={[0, 0, 0]} />
          </PresentationControls>
        </Suspense>

        {/* Enhanced camera controls for mobile */}
        <OrbitControls
          autoRotate={false}
          autoRotateSpeed={1}
          enableZoom={true}
          enablePan={isMobile}
          enableDamping={true}
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={10}
          touches={{
            ONE: 2, // TOUCH.ROTATE
            TWO: 1, // TOUCH.DOLLY_PAN
          }}
        />
      </Canvas>

      {/* Loading overlay */}
      {loading && (
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
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 100,
          }}
        >
          <CircularProgress size={60} />
          <Typography variant="body2" color="primary.light" sx={{ mt: 2 }}>
            Loading AR Experience...
          </Typography>
        </Box>
      )}

      {/* Control Panel */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          px: 2,
          py: 1.5,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: 3,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Zoom Out">
            <IconButton onClick={handleZoomOut} size="small" disabled={zoom <= 0.5}>
              <ZoomOut />
            </IconButton>
          </Tooltip>

          <Tooltip title="Reset View">
            <IconButton onClick={handleReset} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>

          <Tooltip title="Zoom In">
            <IconButton onClick={handleZoomIn} size="small" disabled={zoom >= 3}>
              <ZoomIn />
            </IconButton>
          </Tooltip>

          {isMobile && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mx: 1 }}>
                |
              </Typography>
              <Tooltip title="Take Screenshot">
                <IconButton
                  onClick={() => {
                    const canvas = containerRef.current?.querySelector('canvas');
                    if (canvas) {
                      canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `ar-${productName}-${Date.now()}.png`;
                        link.click();
                      });
                    }
                  }}
                  size="small"
                >
                  <CameraAlt />
                </IconButton>
              </Tooltip>
            </>
          )}

          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            <IconButton onClick={toggleFullscreen} size="small">
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Action Buttons */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: 'absolute',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
        }}
      >
        {onAddToCart && (
          <Button
            variant="contained"
            startIcon={<ShoppingCart />}
            onClick={handleAddToCart}
            sx={{
              backgroundColor: 'rgba(25, 118, 210, 0.95)',
              backdropFilter: 'blur(10px)',
              fontWeight: 600,
            }}
          >
            Add to Cart
          </Button>
        )}

        {onClose && (
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          >
            Close
          </Button>
        )}
      </Stack>

      {/* Info Toggle Button */}
      {!showInfo && (
        <Fab
          size="small"
          color="primary"
          onClick={() => setShowInfo(true)}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 10,
          }}
        >
          <Info />
        </Fab>
      )}
    </Box>
  );
};

export default ARViewer;
