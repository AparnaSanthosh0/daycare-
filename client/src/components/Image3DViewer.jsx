import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { Fullscreen, FullscreenExit, Refresh, ZoomIn, ZoomOut, ThreeSixty } from '@mui/icons-material';

/**
 * Image3DViewer - Creates 3D illusion from 2D product images
 * 
 * Features:
 * - 360° rotation on drag
 * - Zoom in/out
 * - Fullscreen mode
 * - Reset view
 * - 3D perspective effects
 */
const Image3DViewer = ({
  imageUrl,
  autoRotate = true,
  height = 500,
  backgroundColor = '#f5f5f5',
  showControls = true
}) => {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, rotation: 0 });
  const animationRef = useRef(null);

  // Auto-rotation effect
  useEffect(() => {
    if (autoRotate && !isDragging) {
      animationRef.current = setInterval(() => {
        setRotation(prev => (prev + 0.5) % 360);
      }, 30);
    } else {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    }
    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [autoRotate, isDragging]);

  // Handle mouse down
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      rotation: rotation
    };
  };

  // Handle mouse move
  const handleMouseMove = (e) => {
    if (!isDragging) {
      // Add tilt effect on hover
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setTilt({ x: y * 10, y: -x * 10 });
      }
      return;
    }

    const delta = e.clientX - dragStartRef.current.x;
    const newRotation = (dragStartRef.current.rotation + delta * 0.5) % 360;
    setRotation(newRotation);
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setIsDragging(false);
    setTilt({ x: 0, y: 0 });
  };

  // Handle wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // Control functions
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setTilt({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

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
        boxShadow: isFullscreen ? 'none' : '0 4px 12px rgba(0,0,0,0.1)',
        cursor: isDragging ? 'grabbing' : 'grab'
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
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <ThreeSixty sx={{ fontSize: 18 }} />
        <Typography variant="caption">
          🖱️ Drag to rotate • Scroll to zoom • Auto-rotating
        </Typography>
      </Box>

      {/* 3D Image Container */}
      <Box
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '1000px',
          userSelect: 'none'
        }}
      >
        <Box
          sx={{
            width: '80%',
            height: '80%',
            transform: `
              rotateY(${rotation}deg) 
              rotateX(${tilt.x}deg) 
              rotateZ(${tilt.y}deg) 
              scale(${zoom})
            `,
            transformStyle: 'preserve-3d',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src={imageUrl}
            alt="Product 3D View"
            draggable={false}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
              backfaceVisibility: 'visible',
              pointerEvents: 'none'
            }}
            onError={(e) => {
              e.currentTarget.src = '/logo192.svg';
            }}
          />
        </Box>
      </Box>

      {/* Rotation indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: 1,
          fontSize: '0.75rem'
        }}
      >
        {Math.round(rotation)}°
      </Box>

      {/* Zoom indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 40,
          left: 10,
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: 1,
          fontSize: '0.75rem'
        }}
      >
        {Math.round(zoom * 100)}%
      </Box>
    </Box>
  );
};

export default Image3DViewer;
