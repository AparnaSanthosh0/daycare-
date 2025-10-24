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
  IconButton,
  Fab
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  Add,
  Favorite
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useLocation, useNavigate } from 'react-router-dom';
import SimpleCart from './SimpleCart';
import ShopHeader from './ShopHeader';
import CategoryBar from './CategoryBar';
import HeroCarousel from './HeroCarousel';
import api, { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { useShop } from '../../contexts/ShopContext';
import { recommendForUser, collectSignalsFromContext } from '../../utils/recommendations';

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

const ProductImage = styled(CardMedia)(({ theme }) => ({
  // Make image area larger than details
  height: 260,
  width: '100%',
  backgroundColor: '#f3f4f6',
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  [theme.breakpoints.up('sm')]: {
    height: 300,
  },
  [theme.breakpoints.up('md')]: {
    height: 340,
  },
}));

const PriceTag = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 700,
  color: theme.palette.success.main,
  marginBottom: theme.spacing(1)
}));

const AddToCartButton = styled(Button)(({ theme }) => ({
  borderRadius: '25px',
  textTransform: 'none',
  fontWeight: 600,
  padding: '8px 24px',
  background: theme.palette.success.main,
  color: theme.palette.success.contrastText,
  '&:hover': {
    background: theme.palette.success.dark,
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  }
}));

const FloatingCartButton = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: 24,
  right: 24,
  background: theme.palette.success.main,
  color: theme.palette.success.contrastText,
  '&:hover': {
    background: theme.palette.success.dark,
    transform: 'scale(1.1)',
  },
  zIndex: 1000
}));

const EcommerceDemo = ({ initialCategory = 'all', initialQuery = '', filterMode = 'intersection' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery || '');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const { addToCart, wishlist, toggleWishlist, cartCount, interactions, recentlyViewed, cartItems } = useShop();
  const productsRef = React.useRef(null);

  // Load products from backend so vendor-added items appear in the shop
  const [products, setProducts] = useState([]);

  // Whether the currently selected filter is a fashion category key (top-level hook)
  const isFashionKey = React.useMemo(() => {
    const k = String(selectedCategory || '').toLowerCase();
    return ['boy', 'girl', 'footwear', 'fashion'].includes(k);
  }, [selectedCategory]);

  React.useEffect(() => {
    // hydrate query from navigation state (header search)
    const q = location.state && location.state.q;
    if (typeof q === 'string') {
      setQuery(q);
    } else {
      // Always apply initialQuery on route change; clears when empty
      setQuery(initialQuery || '');
    }
    // update category if prop changes (e.g., /fashion route)
    setSelectedCategory(initialCategory || 'all');
    const load = async () => {
      try {
        const { data } = await api.get('/api/products', { params: { all: true } });
        // Helper to form a valid absolute URL for images regardless of API_BASE_URL shape
        const toAbsoluteImageUrl = (maybePath) => {
          if (!maybePath) return null;
          // Already absolute
          if (typeof maybePath === 'string' && /^https?:\/\//i.test(maybePath)) return maybePath.trim();
          try {
            // Derive an origin (strip trailing '/api' if present). If API_BASE_URL is relative, fall back to window origin.
            let origin = API_BASE_URL.replace(/\/?api\/?$/i, '').replace(/\/$/, '');
            if (!/^https?:\/\//i.test(origin)) {
              if (typeof window !== 'undefined' && window.location?.origin) {
                origin = window.location.origin;
              }
            }
            // Normalize Windows backslashes and trim
            let resource = String(maybePath).trim().replace(/\\/g, '/');
            // Ensure leading slash on resource
            resource = resource.startsWith('/') ? resource : `/${resource}`;
            // Encode spaces and unsafe chars but keep slashes
            const encoded = resource.split('/').map((seg, i) => (i === 0 ? seg : encodeURIComponent(seg))).join('/');
            const u = new URL(encoded, origin);
            return u.href;
          } catch (e) {
            return String(maybePath);
          }
        };

        // Normalize fields expected by UI and compute image URL
        const mapped = (data.products || []).map((p) => ({
          id: p._id,
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice || null,
          image: toAbsoluteImageUrl(p.image || (Array.isArray(p.images) && p.images.length ? p.images[0] : null)) || '/logo192.svg',
          imageFit: p.imageFit || 'cover',
          imageFocalX: typeof p.imageFocalX === 'number' ? p.imageFocalX : 50,
          imageFocalY: typeof p.imageFocalY === 'number' ? p.imageFocalY : 50,
          category: p.category || 'General',
          rating: p.rating || 4.5,
          reviews: p.reviews || 0,
          inStock: p.inStock !== false,
          isNew: !!p.isNew,
          isBestseller: !!p.isBestseller,
          description: p.description || '',
        }));
        setProducts(mapped);
      } catch (e) {
        console.error('Failed to load /api/products', e?.response?.status, e?.message);
        // Fallback demo items so the shop doesn't look empty
        setProducts([
          { id: 'd1', name: 'Festive Kurta Set', price: 1299, category: 'Fashion', image: 'https://images.unsplash.com/photo-1593032457869-0038260b2f6b?q=80&w=1200&auto=format&fit=crop', rating: 4.6, reviews: 112, inStock: true, isNew: true, description: 'Comfortable cotton kurta for kids' },
          { id: 'd2', name: 'Embroidered Lehenga', price: 1899, category: 'Fashion', image: 'https://images.unsplash.com/photo-1624226260875-1a4b0dff9a98?q=80&w=1200&auto=format&fit=crop', rating: 4.7, reviews: 86, inStock: true, isBestseller: true, description: 'Festive lehenga set for celebrations' },
          { id: 'd3', name: 'Wooden Puzzle Set', price: 499, category: 'Toys', image: 'https://images.unsplash.com/photo-1604881982373-67f4e7f1b5b2?q=80&w=1200&auto=format&fit=crop', rating: 4.4, reviews: 52, inStock: true, description: 'Learning puzzles for age 3+' },
          { id: 'd4', name: 'STEM Robotics Kit', price: 2599, category: 'Learning', image: 'https://images.unsplash.com/photo-1581091870834-2f6043faed59?q=80&w=1200&auto=format&fit=crop', rating: 4.5, reviews: 73, inStock: true, description: 'DIY robotics kit for kids' },
          { id: 'd5', name: 'Nursery Bedsheet', price: 699, category: 'Nursery', image: 'https://images.unsplash.com/photo-1602001330645-7f68a3bce5d5?q=80&w=1200&auto=format&fit=crop', rating: 4.3, reviews: 34, inStock: true, description: 'Soft and breathable cotton bedsheet' },
          { id: 'd6', name: 'Sports Shoes', price: 1499, category: 'Footwear', image: 'https://images.unsplash.com/photo-1520357446244-76ad17599472?q=80&w=1200&auto=format&fit=crop', rating: 4.2, reviews: 41, inStock: true, description: 'Lightweight shoes for play time' },
        ]);
      }
    };
    load();
  }, [location.pathname, location.state, initialCategory, initialQuery]);

  // After mount or when changing to a specific initial category (like 'fashion'), scroll to products
  React.useEffect(() => {
    if (initialCategory && initialCategory !== 'all') {
      const id = setTimeout(() => {
        if (productsRef.current) {
          productsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(id);
    }
  }, [initialCategory]);

  const handleAddToCart = (product) => addToCart(product);

  // Helper to match combined Fashion categories (boy, girl, footwear)
  const isFashionCategory = (cat = '') => {
    const c = String(cat).toLowerCase();
    return (
      c.includes('boy') ||
      c.includes('girl') ||
      c.includes('footwear') ||
      c.includes('footwera') ||
      c.includes('foot wear') ||
      c.includes('shoe') ||
      c.includes('shoes') ||
      c.includes('fashion')
    );
  };

  // Filter products by search query (name/category/description)
  const filtered = useMemo(() => {
    const isOffersPage = location.pathname === '/festival-offers';
    const q = (isOffersPage ? query : '').trim().toLowerCase();
    let list = products;
    const byCategory = (p) => {
      if (!selectedCategory || selectedCategory === 'all') return true;
      if (selectedCategory === 'fashion') return isFashionCategory(p.category);
      const catLabel = selectedCategory.toLowerCase();
      return (p.category || '').toLowerCase().includes(catLabel);
    };
    const byQuery = (p) => {
      if (!q) return true;
      const tokens = q.split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
      if (tokens.length === 0) return true;
      const name = p.name?.toLowerCase() || '';
      const cat = (p.category || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return tokens.some(t => name.includes(t) || cat.includes(t) || desc.includes(t));
    };

    if (filterMode === 'union') {
      // show products matching category OR query
      return list.filter(p => byCategory(p) || byQuery(p));
    }
    if (filterMode === 'categoryOnly') {
      // ignore query; only category matters
      return list.filter(p => byCategory(p));
    }

    // default: intersection (must match both)
    return list.filter(p => byCategory(p) && byQuery(p));
  }, [products, query, selectedCategory, filterMode, location.pathname]);

  // Personalized recommendations based on user signals (wishlist, cart, views)
  const personalized = useMemo(() => {
    if (!products?.length) return [];
    const signals = collectSignalsFromContext({ wishlist, cartItems, interactions, recentlyViewed });
    // Use already-normalized `products` list; keep only top 8
    const recs = recommendForUser(signals, products, { k: 8 });
    return recs;
  }, [products, wishlist, cartItems, interactions, recentlyViewed]);

  return (
    <Box sx={{ backgroundColor: 'white', minHeight: '100vh' }}>
      {/* Ecommerce header */}
      <ShopHeader />

      {/* Category strip */}
      <CategoryBar
        selected={selectedCategory}
        onSelect={(cat) => {
          const key = cat?.key || 'all';
          setSelectedCategory(key);
          // smooth scroll to products grid
          setTimeout(() => {
            if (productsRef.current) {
              productsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 50);
        }}
      />

      {/* Hero Carousel (hidden for fashion selections to only show Featured grid) */}
      {!isFashionKey && (
      <HeroCarousel
        height={{ xs: 300, sm: 380, md: 560 }}
        slides={[
          {
            image: '/diwali-carnival.jpg', // Place your uploaded Diwali image at public/diwali-carnival.jpg
            backgroundPosition: '20% 30%', // move framing further down
            backgroundSize: 'cover',
            imageFilter: 'none', // keep image crisp
            noBaseGradient: true, // remove dark left gradient so subject isn't obscured
            title: 'Diwali Carnival',
            subtitle: 'Biggest Range, Fastest Delivery',
            // Removed Shop Offers CTA per request
            overlay: undefined
          },
          {
            image: '/festive-kids.jpg', // Clean web-safe filename
            backgroundSize: '120%', // slight zoom so framing is higher and clearer
            backgroundPosition: '60% 0%', // move to very top
            imageFilter: 'none', // ensure no blur/contrast tweaks
            noBaseGradient: true, // keep clean, no dark overlay
            title: 'Festive Fashion for Kids',
            subtitle: 'New season styles are here',
            ctaText: 'Explore Fashion',
            ctaLink: '/fashion',
            overlay: undefined
          }
        ]}
        onCtaClick={() => {
          // Navigate to dedicated fashion page
          navigate('/fashion');
        }}
        showLogin={false}
      />
      )}

      {/* Personalized Recommendations (top) - hidden for fashion selections) */}
      {!isFashionKey && personalized.length > 0 && (
        <Container maxWidth="lg" sx={{ pt: 4 }}>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Recommended for You
          </Typography>
          <Grid container spacing={4} sx={{ mb: 2 }}>
            {personalized.map((product) => (
              <Grid item xs={12} sm={6} md={3} key={`rec-${product.id}`}>
                <StyledCard>
                  <Box sx={{ position: 'relative' }}>
                    <ProductImage
                      component="img"
                      src={product.image}
                      alt={product.name}
                      sx={{
                        height: 200,
                        objectFit: product.imageFit || 'cover',
                        objectPosition: `${product.imageFocalX ?? 50}% ${product.imageFocalY ?? 50}%`,
                      }}
                      onError={(e) => { e.currentTarget.src = '/logo192.svg'; }}
                      onClick={() => navigate(`/product/${product.id}`)}
                    />
                    <IconButton
                      onClick={() => toggleWishlist(product.id)}
                      sx={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', '&:hover': { backgroundColor: 'white' } }}
                    >
                      <Favorite sx={{ color: wishlist.has(product.id) ? 'error.main' : 'grey.400' }} />
                    </IconButton>
                  </Box>
                  <CardContent sx={{ flexGrow: 1, p: 2.25 }}>
                    <Chip label={product.category} size="small" variant="outlined" color="success" sx={{ mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={700} noWrap>
                      {product.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <PriceTag>₹{product.price}</PriceTag>
                      {product.originalPrice && (
                        <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
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
                      onClick={() => handleAddToCart(product)}
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
      )}

      {/* Products Section */}
      <Container maxWidth="lg" sx={{ py: 6 }} ref={productsRef}>
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
                    component="img"
                    src={product.image}
                    alt={product.name}
                    sx={{
                      height: 200,
                      objectFit: product.imageFit || 'cover',
                      objectPosition: `${product.imageFocalX ?? 50}% ${product.imageFocalY ?? 50}%`,
                    }}
                    onError={(e) => { e.currentTarget.src = '/logo192.svg'; }}
                    onClick={() => navigate(`/product/${product.id}`)}
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
                
                <CardContent sx={{ flexGrow: 1, p: 2.25 }}>
                  <Chip
                    label={product.category}
                    size="small"
                    variant="outlined"
                    color="success"
                    sx={{ mb: 2 }}
                  />
                  
                  <Typography variant="h6" fontWeight={600} gutterBottom sx={{ cursor: 'pointer' }} onClick={() => navigate(`/product/${product.id}`)}>
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
                    onClick={() => {
                      handleAddToCart(product);
                      if (user?.role === 'parent') {
                        setCartOpen(true); // open cart for quick checkout flow
                      }
                    }}
                    disabled={!product.inStock}
                  >
                    {product.inStock ? (user?.role === 'parent' ? 'Buy' : 'Add to Cart') : 'Out of Stock'}
                  </AddToCartButton>
                </CardActions>
              </StyledCard>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Recommendations at the end for fashion categories */}
      {isFashionKey && personalized.length > 0 && (
        <Container maxWidth="lg" sx={{ pt: 2, pb: 6 }}>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Recommended for You
          </Typography>
          <Grid container spacing={4} sx={{ mb: 2 }}>
            {personalized.map((product) => (
              <Grid item xs={12} sm={6} md={3} key={`rec-bottom-${product.id}`}>
                <StyledCard>
                  <Box sx={{ position: 'relative' }}>
                    <ProductImage
                      component="img"
                      src={product.image}
                      alt={product.name}
                      sx={{
                        height: 200,
                        objectFit: product.imageFit || 'cover',
                        objectPosition: `${product.imageFocalX ?? 50}% ${product.imageFocalY ?? 50}%`,
                      }}
                      onError={(e) => { e.currentTarget.src = '/logo192.svg'; }}
                      onClick={() => navigate(`/product/${product.id}`)}
                    />
                    <IconButton
                      onClick={() => toggleWishlist(product.id)}
                      sx={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', '&:hover': { backgroundColor: 'white' } }}
                    >
                      <Favorite sx={{ color: wishlist.has(product.id) ? 'error.main' : 'grey.400' }} />
                    </IconButton>
                  </Box>
                  <CardContent sx={{ flexGrow: 1, p: 2.25 }}>
                    <Chip label={product.category} size="small" variant="outlined" color="success" sx={{ mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={700} noWrap>
                      {product.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <PriceTag>₹{product.price}</PriceTag>
                      {product.originalPrice && (
                        <Typography variant="body2" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
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
                      onClick={() => handleAddToCart(product)}
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
      )}

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