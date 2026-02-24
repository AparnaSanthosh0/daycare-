import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import {
  Face,
  Palette,
  PhotoCamera,
  ArrowBack,
  Star,
  InfoOutlined,
} from '@mui/icons-material';
import FaceAccessoriesAR from '../components/AR/FaceAccessoriesAR';
import VirtualMakeupAR from '../components/AR/VirtualMakeupAR';
import { useShop } from '../contexts/ShopContext';

/**
 * FaceARPage
 * 
 * Unified page for face-based AR experiences
 * - Face Accessories Try-On (hats, glasses, masks)
 * - Virtual Makeup Studio (face paint, tattoos, party makeup)
 * 
 * Perfect for:
 * - Birthday party planning
 * - Festival decorations
 * - Costume accessories
 * - Face paint previews
 */
const FaceARPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToCart, products } = useShop();

  const [activeAR, setActiveAR] = useState(null); // 'accessories' or 'makeup'
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Get product from URL if provided
  React.useEffect(() => {
    const productId = searchParams.get('productId');
    if (productId && products) {
      const product = products.find(p => p._id === productId);
      if (product) {
        setSelectedProduct(product);
      }
    }
  }, [searchParams, products]);

  // AR Experience cards
  const arExperiences = [
    {
      id: 'accessories',
      title: 'Face Accessories Try-On',
      description: 'Try on hats, sunglasses, hair accessories, and masks in real-time',
      icon: <Face sx={{ fontSize: 60 }} />,
      features: [
        'Party hats & birthday crowns',
        'Cool sunglasses',
        'Fun masks & face covers',
        'Hair accessories & headbands',
      ],
      difficulty: 'EASY',
      estimatedTime: '2-3 mins',
      color: 'primary',
    },
    {
      id: 'makeup',
      title: 'Virtual Makeup Studio',
      description: 'Preview face paint, temporary tattoos, and party makeup',
      icon: <Palette sx={{ fontSize: 60 }} />,
      features: [
        'Birthday face paint designs',
        'Temporary tattoos',
        'Festival & party makeup',
        'Custom colors & intensity',
      ],
      difficulty: 'EASY',
      estimatedTime: '3-5 mins',
      color: 'secondary',
    },
  ];

  // Sample products for demonstration
  const demoProducts = [
    {
      _id: 'demo-1',
      name: 'Party Hat Collection',
      image: '/assets/products/party-hat.jpg',
      price: 15.99,
      category: 'accessories',
      arType: 'accessories',
    },
    {
      _id: 'demo-2',
      name: 'Face Paint Set',
      image: '/assets/products/face-paint.jpg',
      price: 24.99,
      category: 'makeup',
      arType: 'makeup',
    },
    {
      _id: 'demo-3',
      name: 'Cool Kids Sunglasses',
      image: '/assets/products/sunglasses.jpg',
      price: 12.99,
      category: 'accessories',
      arType: 'accessories',
    },
    {
      _id: 'demo-4',
      name: 'Temporary Tattoo Pack',
      image: '/assets/products/tattoos.jpg',
      price: 8.99,
      category: 'makeup',
      arType: 'makeup',
    },
  ];

  const handleStartAR = (type, product = null) => {
    setActiveAR(type);
    if (product) {
      setSelectedProduct(product);
    }
  };

  const handleCloseAR = () => {
    setActiveAR(null);
  };

  const handleAddToCart = (product) => {
    addToCart(product, 1);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box mb={4}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
          >
            Back
          </Button>

          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Face AR Studio
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Try on accessories and preview makeup in real-time!
          </Typography>

          <Alert severity="info" icon={<InfoOutlined />} sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Camera Required:</strong> These experiences use your device camera.
              Please allow camera access when prompted for the best experience.
            </Typography>
          </Alert>
        </Box>

        {/* AR Experience Cards */}
        <Grid container spacing={3} mb={4}>
          {arExperiences.map((experience) => (
            <Grid item xs={12} md={6} key={experience.id}>
              <Card
                elevation={3}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      mb: 2,
                      color: `${experience.color}.main`,
                    }}
                  >
                    {experience.icon}
                  </Box>

                  <Typography variant="h5" fontWeight="bold" gutterBottom textAlign="center">
                    {experience.title}
                  </Typography>

                  <Stack direction="row" spacing={1} justifyContent="center" mb={2}>
                    <Chip
                      label={experience.difficulty}
                      color="success"
                      size="small"
                      icon={<Star />}
                    />
                    <Chip
                      label={experience.estimatedTime}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  <Typography variant="body2" color="text.secondary" mb={2} textAlign="center">
                    {experience.description}
                  </Typography>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Features:
                    </Typography>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                      {experience.features.map((feature, idx) => (
                        <li key={idx}>
                          <Typography variant="body2">{feature}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    color={experience.color}
                    fullWidth
                    size="large"
                    startIcon={<PhotoCamera />}
                    onClick={() => handleStartAR(experience.id)}
                  >
                    Start AR Experience
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Product Showcase */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Try These Products
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Select a product and see how it looks on you using AR
          </Typography>

          <Grid container spacing={2}>
            {demoProducts.map((product) => (
              <Grid item xs={6} sm={3} key={product._id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                  onClick={() => handleStartAR(product.arType, product)}
                >
                  <CardMedia
                    component="div"
                    sx={{
                      height: 140,
                      bgcolor: 'grey.200',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {product.arType === 'accessories' ? (
                      <Face sx={{ fontSize: 60, color: 'grey.400' }} />
                    ) : (
                      <Palette sx={{ fontSize: 60, color: 'grey.400' }} />
                    )}
                  </CardMedia>
                  <CardContent sx={{ p: 1.5 }}>
                    <Typography variant="body2" fontWeight="bold" noWrap>
                      {product.name}
                    </Typography>
                    <Typography variant="h6" color="primary.main">
                      ${product.price}
                    </Typography>
                    <Chip
                      label={`Try with ${product.arType === 'accessories' ? 'Face AR' : 'Makeup AR'}`}
                      size="small"
                      color="primary"
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* How It Works */}
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            How It Works
          </Typography>

          <Grid container spacing={3} mt={1}>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: 24,
                    fontWeight: 'bold',
                  }}
                >
                  1
                </Box>
                <Typography variant="h6" gutterBottom>
                  Choose Experience
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Select face accessories or makeup studio based on what you want to try
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: 24,
                    fontWeight: 'bold',
                  }}
                >
                  2
                </Box>
                <Typography variant="h6" gutterBottom>
                  Allow Camera
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Grant camera permission to see yourself with virtual items in real-time
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Box
                  sx={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: 24,
                    fontWeight: 'bold',
                  }}
                >
                  3
                </Box>
                <Typography variant="h6" gutterBottom>
                  Try & Buy
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Customize, capture photos, and add your favorites to cart
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Container>

      {/* AR Components (rendered when active) */}
      {activeAR === 'accessories' && (
        <FaceAccessoriesAR
          product={selectedProduct}
          onClose={handleCloseAR}
          onAddToCart={handleAddToCart}
        />
      )}

      {activeAR === 'makeup' && (
        <VirtualMakeupAR
          product={selectedProduct}
          onClose={handleCloseAR}
          onAddToCart={handleAddToCart}
        />
      )}
    </Box>
  );
};

export default FaceARPage;
