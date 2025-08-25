import React, { useMemo, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Chip,
  Rating,
  Badge,
  AppBar,
  Toolbar,
  IconButton,
  Fab,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  Add,
  Favorite,
  Share,
  Search,
  Menu,
  AccountCircle,
  ArrowBack
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import SimpleCart from './SimpleCart';

// Styled Components
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
  }
}));

const ProductImage = styled(CardMedia)({
  height: 200,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
});

const PriceTag = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 700,
  color: theme.palette.primary.main,
  marginBottom: theme.spacing(1)
}));

const AddToCartButton = styled(Button)(({ theme }) => ({
  borderRadius: '25px',
  textTransform: 'none',
  fontWeight: 600,
  padding: '8px 24px',
  background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
  '&:hover': {
    background: 'linear-gradient(45deg, #5a67d8 0%, #6b46c1 100%)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  }
}));

const FloatingCartButton = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: 24,
  right: 24,
  background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
  '&:hover': {
    background: 'linear-gradient(45deg, #5a67d8 0%, #6b46c1 100%)',
    transform: 'scale(1.1)',
  },
  zIndex: 1000
}));

const EcommerceDemo = () => {
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(4);
  const [query, setQuery] = useState('');

  // Sample products data (prices in INR and baby categories)
  const products = [
    {
      id: 1,
      name: 'Cotton Baby Onesie',
      price: 399, // INR
      originalPrice: 499,
      image: 'https://images.unsplash.com/photo-1618354691329-0b2a5b9ebd8a?w=300&h=200&fit=crop',
      category: 'Clothing',
      rating: 4.7,
      reviews: 112,
      inStock: true,
      isNew: true,
      description: 'Soft breathable cotton onesie for newborns (0-3 months)'
    }, 
    {
      id: 2,
      name: 'Baby Feeding Bottle (BPA-Free)',
      price: 299,
      image: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=300&h=200&fit=crop',
      category: 'Feeding',
      rating: 4.6,
      reviews: 89,
      inStock: true,
      isBestseller: true,
      description: 'Anti-colic design, easy to clean, safe materials'
    },
    {
      id: 3,
      name: 'Baby Lotion (200ml)',
      price: 249,
      image: 'https://images.unsplash.com/photo-1604881987925-6a6a2b4715b0?w=300&h=200&fit=crop',
      category: 'Care',
      rating: 4.7,
      reviews: 156,
      inStock: true,
      description: 'Gentle moisturizing lotion for delicate baby skin'
    },
    {
      id: 4,
      name: 'Storybook Collection',
      price: 299,
      image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=200&fit=crop',
      category: 'Books',
      rating: 4.9,
      reviews: 203,
      inStock: true,
      description: 'Set of 5 beautifully illustrated children\'s storybooks'
    },
    {
      id: 5,
      name: 'Baby Musical Rattle Set',
      price: 349,
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=200&fit=crop',
      category: 'Toys',
      rating: 4.5,
      reviews: 78,
      inStock: true,
      isNew: true,
      description: 'Colorful rattles to stimulate senses and motor skills'
    },
    {
      id: 6,
      name: 'Baby Blanket (Fleece)',
      price: 599,
      originalPrice: 699,
      image: 'https://images.unsplash.com/photo-1617957743090-4cc668a6cf2d?w=300&h=200&fit=crop',
      category: 'Bedding',
      rating: 4.8,
      reviews: 92,
      inStock: true,
      isBestseller: true,
      description: 'Warm, lightweight, and skin-friendly fleece blanket'
    }
  ];

  const addToCart = (product) => {
    setCartItemCount(prev => prev + 1);
    // Here you would typically add the item to your cart state/context
    console.log('Added to cart:', product.name);
  };

  // Filter products by search query (name/category/description)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  }, [products, query]);

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="sticky" sx={{ backgroundColor: 'white', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/') }>
            <ArrowBack />
          </IconButton>
          
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
            TinyTots Shop
          </Typography>

          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
            <TextField
              size="small"
              placeholder="Search products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ width: { xs: '100%', sm: 420 }, backgroundColor: '#f5f6fa', borderRadius: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
            />
          </Box>
          
          <IconButton color="inherit">
            <AccountCircle />
          </IconButton>
          
          <IconButton color="inherit" onClick={() => setCartOpen(true)}>
            <Badge badgeContent={cartItemCount} color="error">
              <ShoppingCartIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 8,
          textAlign: 'center'
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" fontWeight={700} gutterBottom>
            TinyTots Shop
          </Typography>
          <Typography variant="h5" sx={{ opacity: 0.9, mb: 4 }}>
            Educational toys and supplies for growing minds
          </Typography>

        </Container>
      </Box>

      {/* Products Section */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {filtered.length === 0 && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            No products match “{query}”.
          </Typography>
        )}
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
          Featured Products
        </Typography>
        
        <Grid container spacing={4}>
          {filtered.map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <StyledCard>
                <Box sx={{ position: 'relative' }}>
                  <ProductImage
                    image={product.image}
                    title={product.name}
                  />
                  
                  {/* Product Badges */}
                  <Box sx={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {product.isNew && (
                      <Chip label="New" color="success" size="small" sx={{ fontWeight: 600 }} />
                    )}
                    {product.isBestseller && (
                      <Chip label="Bestseller" color="warning" size="small" sx={{ fontWeight: 600 }} />
                    )}
                    {!product.inStock && (
                      <Chip label="Out of Stock" color="error" size="small" sx={{ fontWeight: 600 }} />
                    )}
                  </Box>
                  
                  {/* Favorite Button */}
                  <IconButton
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      '&:hover': { backgroundColor: 'white' }
                    }}
                  >
                    <Favorite sx={{ color: 'grey.400' }} />
                  </IconButton>
                </Box>
                
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Chip
                    label={product.category}
                    size="small"
                    variant="outlined"
                    color="primary"
                    sx={{ mb: 2 }}
                  />
                  
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {product.name}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {product.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Rating value={product.rating} precision={0.1} size="small" readOnly />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      ({product.reviews})
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <PriceTag>₹{product.price}</PriceTag>
                    {product.originalPrice && (
                      <Typography
                        variant="body2"
                        sx={{ textDecoration: 'line-through', color: 'text.secondary' }}
                      >
                        ₹{product.originalPrice}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
                
                <CardActions sx={{ p: 3, pt: 0 }}>
                  <AddToCartButton
                    variant="contained"
                    fullWidth
                    startIcon={<Add />}
                    onClick={() => addToCart(product)}
                    disabled={!product.inStock}
                  >
                    {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                  </AddToCartButton>
                </CardActions>
              </StyledCard>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Floating Cart Button */}
      <FloatingCartButton onClick={() => setCartOpen(true)}>
        <Badge badgeContent={cartItemCount} color="error">
          <ShoppingCartIcon />
        </Badge>
      </FloatingCartButton>

      {/* Shopping Cart Modal */}
      <SimpleCart
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </Box>
  );
};

export default EcommerceDemo;