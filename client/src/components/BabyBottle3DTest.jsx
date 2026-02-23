import React, { useState } from 'react';
import { Box, Container, Typography, Button, Paper, Tabs, Tab } from '@mui/material';
import { ArrowBack, Upload } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Image3DViewer from './Image3DViewer';

/**
 * Test page for Image3DViewer with baby bottle image
 */
const BabyBottle3DTest = () => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null);

  // Sample images
  const demoImages = [
    'https://i.ibb.co/qYWLZ3h/baby-bottles-colorful.jpg', // Colorful baby bottles on glass stands
    '/uploads/products/1761160546259-281234121.jpg', // First baby bottle image
    '/uploads/products/1761159717786-945026485.jpg', // Alternative view
  ];

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const currentImage = uploadedImage || demoImages[selectedImage];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="lg">
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/shop')}
          sx={{ mb: 3 }}
        >
          Back to Shop
        </Button>

        <Typography variant="h3" fontWeight={700} gutterBottom textAlign="center" color="primary">
          🍼 Baby Bottle 3D Display
        </Typography>
        
        <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
          Drag to rotate 360° • Scroll to zoom • Auto-rotating
        </Typography>

        <Typography variant="body2" color="success.main" textAlign="center" sx={{ mb: 4, fontWeight: 600 }}>
          ✨ Creating 3D illusion from 2D images - No 3D models needed!
        </Typography>

        {/* Upload or Select Demo Image */}
        <Paper sx={{ p: 2, mb: 3, textAlign: 'center' }}>
          <Typography variant="subtitle1" gutterBottom>
            Try Your Own Image:
          </Typography>
          <Button
            variant="contained"
            component="label"
            startIcon={<Upload />}
            sx={{ mr: 2 }}
          >
            Upload Your Product Image
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleImageUpload}
            />
          </Button>
          {!uploadedImage && (
            <Tabs
              value={selectedImage}
              onChange={(e, newValue) => setSelectedImage(newValue)}
              centered
              sx={{ mt: 2 }}
            >
              <Tab label="Colorful Bottles" />
              <Tab label="Demo Image 2" />
              <Tab label="Demo Image 3" />
            </Tabs>
          )}
          {uploadedImage && (
            <Button
              variant="outlined"
              onClick={() => setUploadedImage(null)}
              sx={{ ml: 2 }}
            >
              Clear Upload
            </Button>
          )}
        </Paper>

        {/* 3D Viewer */}
        <Paper elevation={6} sx={{ borderRadius: 3, overflow: 'hidden', mb: 4 }}>
          <Image3DViewer
            imageUrl={currentImage}
            autoRotate={true}
            height={650}
            backgroundColor="#ffffff"
            showControls={true}
          />
        </Paper>

        {/* Features Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              🖱️ Interactive Controls
            </Typography>
            <Typography variant="body2">
              • <strong>Drag</strong> - Rotate 360° in any direction<br />
              • <strong>Scroll</strong> - Zoom in/out smoothly<br />
              • <strong>Hover</strong> - 3D tilt effect<br />
              • <strong>Auto-rotate</strong> - Continuous spinning
            </Typography>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              🎨 Visual Effects
            </Typography>
            <Typography variant="body2">
              • <strong>3D Perspective</strong> - CSS 3D transforms<br />
              • <strong>Drop Shadow</strong> - Realistic depth<br />
              • <strong>Smooth Animation</strong> - 60 FPS<br />
              • <strong>Fullscreen Mode</strong> - Immersive view
            </Typography>
          </Paper>
        </Box>

        <Paper sx={{ p: 3, bgcolor: 'info.light' }}>
          <Typography variant="h6" gutterBottom>
            💡 How It Works:
          </Typography>
          <Typography variant="body2">
            This creates a <strong>3D illusion</strong> using CSS 3D transforms on a 2D image!<br />
            <strong>No actual 3D models, AI, or paid tools needed.</strong><br /><br />
            
            Perfect for:
            • E-commerce product displays<br />
            • Portfolio showcases<br />
            • Interactive presentations<br />
            • Any 2D image you want to make look 3D!
          </Typography>
        </Paper>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Built with React + Material-UI + CSS 3D Transforms
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default BabyBottle3DTest;
