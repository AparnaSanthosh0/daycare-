import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  AlertTitle,
  Divider,
  Button,
  Stack
} from '@mui/material';
import { ViewInAr, Info, Download, Code } from '@mui/icons-material';
import Product3DViewer from './Product3DViewer';

/**
 * 3D Viewer Demo Page
 * 
 * Demonstrates the capabilities of the Product3DViewer component.
 * Shows examples with different configurations and use cases.
 */
const Product3DViewerDemo = () => {
  const [selectedExample, setSelectedExample] = useState('toy');

  // Example 3D model configurations
  // Note: Replace these URLs with actual 3D model files once available
  const examples = {
    toy: {
      title: 'Toy Product - Building Blocks',
      description: 'Interactive 3D view of colorful building blocks. Parents can rotate and zoom to see product details.',
      modelUrl: '/models/toys/building-blocks.glb', // Placeholder
      scale: 1,
      environment: 'studio',
      autoRotate: true,
      category: 'Toys'
    },
    classroom: {
      title: 'Virtual Classroom Tour',
      description: 'Explore the classroom layout in 3D. See where children learn, play, and create.',
      modelUrl: '/models/classroom/classroom-tour.glb', // Placeholder
      scale: 0.8,
      environment: 'apartment',
      autoRotate: true,
      category: 'Facilities'
    },
    meal: {
      title: 'Meal Plan Visualization',
      description: 'View today\'s lunch in 3D. Help children recognize healthy foods.',
      modelUrl: '/models/food/lunch-plate.glb', // Placeholder
      scale: 1.2,
      environment: 'city',
      autoRotate: false,
      category: 'Nutrition'
    },
    playground: {
      title: 'Playground Equipment',
      description: 'Interactive view of our outdoor play area. Safe, fun, and engaging.',
      modelUrl: '/models/facilities/playground.glb', // Placeholder
      scale: 0.7,
      environment: 'park',
      autoRotate: true,
      category: 'Facilities'
    }
  };

  const currentExample = examples[selectedExample];

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <ViewInAr sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" fontWeight={700} gutterBottom>
            3D Product Viewer Demo
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Experience products in immersive 3D. Rotate, zoom, and explore every detail
            before making a decision.
          </Typography>
        </Box>

        {/* Status Alert */}
        <Alert severity="info" icon={<Info />} sx={{ mb: 4 }}>
          <AlertTitle>Setup Required</AlertTitle>
          To use the 3D viewer with real products, you need to:
          <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            <li>Add 3D model files (GLB format) to <code>/client/public/models/</code></li>
            <li>Update product database with <code>model3DUrl</code> field</li>
            <li>Models will automatically appear in product detail pages</li>
          </ol>
        </Alert>

        {/* Example Selection */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Choose an Example
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {Object.keys(examples).map((key) => (
              <Chip
                key={key}
                label={examples[key].title}
                onClick={() => setSelectedExample(key)}
                color={selectedExample === key ? 'primary' : 'default'}
                variant={selectedExample === key ? 'filled' : 'outlined'}
                sx={{ fontWeight: selectedExample === key ? 700 : 400 }}
              />
            ))}
          </Stack>
        </Paper>

        {/* Main 3D Viewer Section */}
        <Grid container spacing={3}>
          {/* Left: 3D Viewer */}
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
              <Box sx={{ mb: 2 }}>
                <Chip label={currentExample.category} size="small" color="success" />
                <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
                  {currentExample.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentExample.description}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {/* Alert for missing model */}
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Demo Mode:</strong> Actual 3D model not loaded. 
                Add GLB files to <code>/client/public/models/</code> to see real 3D content.
              </Alert>

              {/* 3D Viewer Component */}
              <Box sx={{ bgcolor: '#f3f4f6', borderRadius: 2, p: 2 }}>
                <Product3DViewer
                  modelUrl={currentExample.modelUrl}
                  autoRotate={currentExample.autoRotate}
                  cameraControls={true}
                  height={500}
                  scale={currentExample.scale}
                  backgroundColor="#e0e7ff"
                  showControls={true}
                  environment={currentExample.environment}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Right: Details and Code */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              {/* Usage Instructions */}
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    <Info sx={{ verticalAlign: 'middle', mr: 1 }} />
                    How to Use
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    <strong>🖱️ Mouse Controls:</strong>
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem' }}>
                    <li>Drag to rotate</li>
                    <li>Scroll to zoom</li>
                    <li>Right-click + drag to pan</li>
                  </ul>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }} paragraph>
                    <strong>📱 Touch Controls:</strong>
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.875rem' }}>
                    <li>One finger to rotate</li>
                    <li>Pinch to zoom</li>
                    <li>Two fingers to pan</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Configuration */}
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    <Code sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Configuration
                  </Typography>
                  <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  modelUrl: "${currentExample.modelUrl}",
  scale: ${currentExample.scale},
  environment: "${currentExample.environment}",
  autoRotate: ${currentExample.autoRotate}
}`}
                    </pre>
                  </Box>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Quick Actions
                  </Typography>
                  <Stack spacing={1}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={() => window.open('https://sketchfab.com/search?q=toy&type=models', '_blank')}
                    >
                      Download Sample Models
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Info />}
                      onClick={() => window.open('/3D_VIEWER_GUIDE.md', '_blank')}
                    >
                      View Documentation
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>

        {/* Use Cases Section */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Use Cases in TinyTots
          </Typography>
          <Grid container spacing={2}>
            {[
              {
                icon: '🧸',
                title: 'E-commerce Products',
                description: 'Display toys, books, and supplies in 3D for better parent decision-making'
              },
              {
                icon: '🏫',
                title: 'Virtual Tours',
                description: 'Show classroom layouts and facilities to prospective parents'
              },
              {
                icon: '🍎',
                title: 'Meal Plans',
                description: 'Visualize daily meals in 3D to help children learn about nutrition'
              },
              {
                icon: '🎮',
                title: 'Learning Tools',
                description: 'Interactive 3D models for educational content and activities'
              }
            ].map((useCase, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h2">{useCase.icon}</Typography>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {useCase.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {useCase.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Next Steps */}
        <Paper sx={{ p: 3, mt: 4, bgcolor: 'primary.light' }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            🚀 Next Steps
          </Typography>
          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Download or create 3D models in GLB format</li>
            <li>Place models in <code>/client/public/models/</code> directory</li>
            <li>Update product database to include <code>model3DUrl</code> field</li>
            <li>View products with 3D models in the shop page</li>
            <li>Toggle between 2D images and 3D view on product detail pages</li>
          </ol>
          <Button
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            onClick={() => window.open('/3D_VIEWER_GUIDE.md', '_blank')}
          >
            Read Full Documentation
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default Product3DViewerDemo;
