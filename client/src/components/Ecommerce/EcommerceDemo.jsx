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
  Search,
  AccountCircle,
  ArrowBack
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import SimpleCart from './SimpleCart';
import api from '../../config/api';

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
  const [query, setQuery] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [wishlist, setWishlist] = useState(new Set());
  const cartCount = useMemo(() => cartItems.reduce((sum, i) => sum + i.quantity, 0), [cartItems]);

  // Load products from backend so vendor-added items appear in the shop
  const [products, setProducts] = useState([]);

  React.useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/api/products');
        // Normalize fields expected by UI
        const mapped = (data.products || []).map((p) => ({
          id: p._id,
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice || null,
          image: p.image || '/logo192.svg',
          category: p.category || 'General',
          rating: p.rating || 4.5,
          reviews: p.reviews || 0,
          inStock: p.inStock !== false,
          isNew: !!p.isNew,
          isBestseller: !!p.isBestseller,
          description: p.description || ''
        }));
        setProducts(mapped);
      } catch (e) {
        // Fallback to empty; keep demo functional
        setProducts([]);
      }
    };
    load();
  }, []);

  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const toggleWishlist = (productId) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId); else next.add(productId);
      return next;
    });
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
            <Badge badgeContent={cartCount} color="error">
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
                    onClick={() => toggleWishlist(product.id)}
                    sx={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      '&:hover': { backgroundColor: 'white' }
                    }}
                  >
                    <Favorite sx={{ color: wishlist.has(product.id) ? 'error.main' : 'grey.400' }} />
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
        <Badge badgeContent={cartCount} color="error">
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