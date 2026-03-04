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
import api from '../config/api';

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
  const { addToCart } = useShop();

  const [activeAR, setActiveAR] = useState(null); // 'accessories' or 'makeup'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [arProducts, setArProducts] = useState([]); // Real shop products suitable for face AR

  // Load AR-compatible products from backend so try-on items are actually purchasable
  React.useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data } = await api.get('/products', { params: { all: true } });
        const list = data.products || [];

        const mapped = list.map((p) => {
          const hasActiveDiscount = p.discountStatus === 'active' && p.activeDiscount > 0;
          const discountedPrice = hasActiveDiscount
            ? Math.round(p.price * (1 - p.activeDiscount / 100) * 100) / 100
            : p.price;

          return {
            id: p._id || p.id,
            _id: p._id || p.id,
            name: p.name,
            price: discountedPrice,
            originalPrice: hasActiveDiscount ? p.price : (p.originalPrice || null),
            activeDiscount: hasActiveDiscount ? p.activeDiscount : 0,
            discountStatus: p.discountStatus || 'none',
            image: p.image || (Array.isArray(p.images) && p.images[0]) || '/logo192.svg',
            category: p.category || 'General',
            stockQty: p.stockQty ?? 0,
            inStock: (p.stockQty ?? 0) > 0 && (p.inStock !== false),
            description: p.description || '',
            arType: 'accessories',
          };
        });

        // Filter to products that make sense for face AR (accessories / makeup)
        const filtered = mapped.filter((p) => {
          const cat = (p.category || '').toLowerCase();
          const name = (p.name || '').toLowerCase();
          if (
            cat.includes('makeup') ||
            cat.includes('face paint') ||
            name.includes('face paint') ||
            name.includes('tattoo') ||
            name.includes('makeup')
          ) {
            p.arType = 'makeup';
            return true;
          }

          if (
            cat.includes('accessor') ||
            cat.includes('hat') ||
            cat.includes('cap') ||
            cat.includes('glass') ||
            cat.includes('sunglass') ||
            name.includes('hat') ||
            name.includes('crown') ||
            name.includes('sunglass')
          ) {
            p.arType = 'accessories';
            return true;
          }

          return false;
        });

        if (mounted) {
          setArProducts(filtered);

          // If a productId is present in URL, preselect that product
          const productId = searchParams.get('productId');
          if (productId) {
            const found = filtered.find((p) => p.id === productId || p._id === productId);
            if (found) {
              setSelectedProduct(found);
            }
          }
        }
      } catch {
        if (mounted) {
          setArProducts([]);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [searchParams]);

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
    addToCart(product, null, 1);
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
            {arProducts.map((product) => (
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
