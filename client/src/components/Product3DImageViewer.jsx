import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, IconButton, Tooltip, Typography, Chip } from '@mui/material';
import { Fullscreen, FullscreenExit, Refresh, ZoomIn, ZoomOut, ThreeSixty, TouchApp } from '@mui/icons-material';

/**
 * Product3DImageViewer - Creates realistic 3D product shape from 2D images
 * 
 * Features:
 * - Cylindrical/curved surface effect for realistic product shape
 * - Multiple slices create depth illusion
 * - Dynamic lighting and shadows
 * - Interactive drag to rotate
 * - Professional product showcase
 */
const Product3DImageViewer = ({
  imageUrl,
  productName = 'Product',
  autoRotate = true,
  height = 500,
  backgroundColor = '#f8f9fa',
  showControls = true,
  slices = 24, // Number of slices for 3D effect - more = smoother
}) => {
  const [rotationY, setRotationY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const containerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, rotationY: 0 });
  const animationRef = useRef(null);

  // Auto-rotation effect - smooth continuous rotation
  useEffect(() => {
    if (autoRotate && !isDragging) {
      animationRef.current = setInterval(() => {
        setRotationY(prev => (prev + 0.6) % 360);
      }, 16);
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

  // Handle mouse/touch start
  const handleStart = useCallback((clientX) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: clientX,
      rotationY: rotationY,
    };
  }, [rotationY]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    handleStart(touch.clientX);
  };

  // Handle mouse/touch move
  const handleMove = useCallback((clientX) => {
    if (!isDragging) return;
    const deltaX = clientX - dragStartRef.current.x;
    setRotationY(dragStartRef.current.rotationY + deltaX * 0.5);
  }, [isDragging]);

  const handleMouseMove = (e) => handleMove(e.clientX);
  const handleTouchMove = (e) => {
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  };

  const handleEnd = () => setIsDragging(false);

  // Handle wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)));
  };

  // Control functions
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.5));
  const handleReset = () => { setZoom(1); setRotationY(0); };
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  // Generate cylinder slices for 3D effect
  const generateSlices = () => {
    const sliceElements = [];
    const totalSlices = slices;
    const anglePerSlice = 360 / totalSlices; // Full cylinder
    const radius = 100; // Cylinder radius in pixels
    
    for (let i = 0; i < totalSlices; i++) {
      // Calculate angle for this slice (full 360 degrees)
      const sliceAngle = i * anglePerSlice;
      
      // Calculate effective angle after rotation
      const effectiveAngle = ((sliceAngle + rotationY) % 360 + 360) % 360;
      
      // Calculate lighting - light from front (0 degrees)
      // Front is brightest, sides are medium, back is darkest
      const lightAngle = effectiveAngle * Math.PI / 180;
      const baseBrightness = 0.5 + Math.cos(lightAngle) * 0.5; // 0 to 1
      const brightness = 0.4 + baseBrightness * 0.6; // 0.4 to 1.0
      
      // Visibility - show slices facing the camera (front 180 degrees)
      const facingCamera = Math.cos(effectiveAngle * Math.PI / 180);
      const isVisible = facingCamera > -0.15; // Show slightly past 90 degrees
      const opacity = isVisible ? Math.min(1, 0.5 + facingCamera * 0.6) : 0;
      
      sliceElements.push(
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: `${(100 / totalSlices) * 1.2}%`, // Overlap to prevent gaps
            height: '100%',
            left: '50%',
            transformStyle: 'preserve-3d',
            transform: `
              translateX(-50%)
              rotateY(${sliceAngle}deg) 
              translateZ(${radius}px)
            `,
            opacity: opacity,
            overflow: 'hidden',
            backfaceVisibility: 'hidden',
          }}
        >
          <Box
            sx={{
              width: `${totalSlices * 100}%`,
              height: '100%',
              marginLeft: `-${i * 100}%`,
              filter: `brightness(${brightness}) saturate(${0.9 + baseBrightness * 0.2})`,
            }}
          >
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
              }}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => { e.currentTarget.src = '/logo192.svg'; }}
            />
          </Box>
        </Box>
      );
    }
    
    return sliceElements;
  };

  // Shadow calculation
  const shadowX = Math.sin(rotationY * Math.PI / 180) * 30;
  const shadowScale = 0.7 + Math.abs(Math.cos(rotationY * Math.PI / 180)) * 0.3;

  return (
    <Box
      sx={{
        width: '100%',
        height: isFullscreen ? '100vh' : height,
        background: `
          radial-gradient(ellipse at 50% 30%, 
            rgba(255,255,255,0.9) 0%, 
            ${backgroundColor} 40%,
            rgba(230,230,235,1) 100%
          )
        `,
        borderRadius: isFullscreen ? 0 : 3,
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 1,
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
    >
      {/* 3D Badge */}
      <Chip
        icon={<ThreeSixty sx={{ fontSize: 16 }} />}
        label="360° Product View"
        size="small"
        sx={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 10,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 600,
          backdropFilter: 'blur(10px)',
          '& .MuiChip-icon': { color: 'white' },
        }}
      />

      {/* Control Buttons */}
      {showControls && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            display: 'flex',
            gap: 0.5,
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: 2,
            padding: 0.5,
            boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          }}
        >
          <Tooltip title="Zoom In">
            <IconButton size="small" onClick={handleZoomIn}>
              <ZoomIn fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton size="small" onClick={handleZoomOut}>
              <ZoomOut fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset View">
            <IconButton size="small" onClick={handleReset}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton size="small" onClick={toggleFullscreen}>
              {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Floor/Ground reflection */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '5%',
          left: '50%',
          transform: `translateX(calc(-50% + ${shadowX}px)) scaleX(${shadowScale})`,
          width: '50%',
          height: '15%',
          background: `radial-gradient(ellipse at center, rgba(0,0,0,0.2) 0%, transparent 70%)`,
          filter: 'blur(12px)',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* Main 3D Container */}
      <Box
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleEnd}
        onMouseLeave={() => { handleEnd(); setIsHovering(false); }}
        onMouseEnter={() => setIsHovering(true)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleEnd}
        onWheel={handleWheel}
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
          userSelect: 'none',
        }}
      >
        {/* 3D Cylinder Container */}
        <Box
          sx={{
            position: 'relative',
            width: '60%',
            maxWidth: 350,
            height: '70%',
            transformStyle: 'preserve-3d',
            transform: `
              rotateY(${rotationY}deg)
              scale(${zoom})
            `,
            transition: isDragging ? 'none' : 'transform 0.05s ease-out',
          }}
        >
          {imageLoaded && generateSlices()}
          
          {/* Hidden image for loading */}
          {!imageLoaded && (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={imageUrl}
                alt={productName}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => { e.currentTarget.src = '/logo192.svg'; setImageLoaded(true); }}
              />
            </Box>
          )}
        </Box>
      </Box>

      {/* Instructions */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(30,30,40,0.9) 100%)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        <TouchApp sx={{ fontSize: 20, color: '#667eea' }} />
        <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
          Drag to rotate product • Scroll to zoom
        </Typography>
      </Box>

      {/* Zoom indicator */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: 2,
          fontSize: '0.75rem',
          fontWeight: 700,
        }}
      >
        {Math.round(zoom * 100)}%
      </Box>

      {/* Rotation indicator */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 50,
          left: 16,
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: '4px 10px',
          borderRadius: 2,
          fontSize: '0.7rem',
          fontWeight: 500,
        }}
      >
        {Math.round(((rotationY % 360) + 360) % 360)}°
      </Box>
    </Box>
  );
};

export default Product3DImageViewer;
