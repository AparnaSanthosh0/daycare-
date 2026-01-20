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
  const [searchImage, setSearchImage] = useState(null);
  const [imageColors, setImageColors] = useState(null);
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
    const img = location.state && location.state.searchImage;
    
    if (typeof q === 'string') {
      setQuery(q);
      setSearchImage(null); // Clear image search when text search is active
    } else if (img) {
      setSearchImage(img);
      setQuery(''); // Clear text search when image search is active
    } else {
      // Always apply initialQuery on route change; clears when empty
      setQuery(initialQuery || '');
      setSearchImage(null);
    }
    // update category if prop changes (e.g., /fashion route)
    setSelectedCategory(initialCategory || 'all');
    const load = async () => {
      try {
        const { data } = await api.get('/products', { params: { all: true } });
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
        const mapped = (data.products || []).map((p) => {
          // Calculate discounted price if active discount exists
          const hasActiveDiscount = p.discountStatus === 'active' && p.activeDiscount > 0;
          const discountedPrice = hasActiveDiscount 
            ? Math.round(p.price * (1 - p.activeDiscount / 100) * 100) / 100 
            : p.price;
          
          return {
            id: p._id,
            name: p.name,
            price: discountedPrice,
            originalPrice: hasActiveDiscount ? p.price : (p.originalPrice || null),
            activeDiscount: hasActiveDiscount ? p.activeDiscount : 0,
            discountStatus: p.discountStatus || 'none',
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
          };
        });
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

  // Extract dominant colors from image for visual search (like Myntra/Flipkart)
  const extractImageColors = React.useCallback((imageDataUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Resize for faster processing (like e-commerce platforms do)
        const maxSize = 200;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // Advanced color analysis
        const colorMap = {};
        let totalPixels = 0;
        const colorStats = {
          avgR: 0, avgG: 0, avgB: 0,
          minR: 255, minG: 255, minB: 255,
          maxR: 0, maxG: 0, maxB: 0,
          saturationSum: 0,
          brightnessSum: 0
        };
        
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];
          
          // Skip transparent or extreme pixels
          if (a < 125 || (r > 245 && g > 245 && b > 245) || (r < 10 && g < 10 && b < 10)) continue;
          
          totalPixels++;
          colorStats.avgR += r;
          colorStats.avgG += g;
          colorStats.avgB += b;
          colorStats.minR = Math.min(colorStats.minR, r);
          colorStats.minG = Math.min(colorStats.minG, g);
          colorStats.minB = Math.min(colorStats.minB, b);
          colorStats.maxR = Math.max(colorStats.maxR, r);
          colorStats.maxG = Math.max(colorStats.maxG, g);
          colorStats.maxB = Math.max(colorStats.maxB, b);
          
          // Calculate saturation and brightness
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          const brightness = max / 255;
          colorStats.saturationSum += saturation;
          colorStats.brightnessSum += brightness;
          
          // Group similar colors with fine buckets (better matching)
          const rBucket = Math.floor(r / 25) * 25;
          const gBucket = Math.floor(g / 25) * 25;
          const bBucket = Math.floor(b / 25) * 25;
          const colorKey = `${rBucket},${gBucket},${bBucket}`;
          
          colorMap[colorKey] = (colorMap[colorKey] || 0) + 1;
        }
        
        if (totalPixels === 0) {
          resolve([]);
          return;
        }
        
        // Calculate averages
        colorStats.avgR = Math.round(colorStats.avgR / totalPixels);
        colorStats.avgG = Math.round(colorStats.avgG / totalPixels);
        colorStats.avgB = Math.round(colorStats.avgB / totalPixels);
        colorStats.avgSaturation = colorStats.saturationSum / totalPixels;
        colorStats.avgBrightness = colorStats.brightnessSum / totalPixels;
        
        // Get top 5 dominant colors (more colors = better matching like Myntra)
        const sortedColors = Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([color, count]) => {
            const [r, g, b] = color.split(',').map(Number);
            return { r, g, b, weight: count / totalPixels };
          });
        
        resolve({ colors: sortedColors, stats: colorStats });
      };
      img.onerror = () => resolve({ colors: [], stats: null });
      img.src = imageDataUrl;
    });
  }, []);

  // Analyze image and extract features
  React.useEffect(() => {
    if (searchImage) {
      extractImageColors(searchImage).then(result => {
        setImageColors(result);
      });
    } else {
      setImageColors(null);
    }
  }, [searchImage, extractImageColors]);

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

  // Analyze uploaded image features (like Myntra's visual search)
  const analyzeImageFeatures = React.useCallback((imageData) => {
    if (!imageData || !imageData.colors || imageData.colors.length === 0) return null;
    
    const { colors, stats } = imageData;
    
    // Check for monochrome/grayscale (charts, documents)
    const isMonochrome = colors.every(color => {
      const avg = (color.r + color.g + color.b) / 3;
      return Math.abs(color.r - avg) < 25 && 
             Math.abs(color.g - avg) < 25 && 
             Math.abs(color.b - avg) < 25;
    });
    
    if (isMonochrome || colors.length < 2) return null;
    
    // Analyze image characteristics
    const features = {
      dominantColors: colors,
      avgSaturation: stats.avgSaturation,
      avgBrightness: stats.avgBrightness,
      colorVariety: colors.length,
      isVibrant: stats.avgSaturation > 0.3,
      isBright: stats.avgBrightness > 0.5,
      isPastel: stats.avgSaturation < 0.4 && stats.avgBrightness > 0.6
    };
    
    return features;
  }, []);

  // Filter products by search query (name/category/description) or image
  const filtered = useMemo(() => {
    const isOffersPage = location.pathname === '/festival-offers';
    const q = (isOffersPage ? query : '').trim().toLowerCase();
    let list = products;
    
    // VISUAL SEARCH - Like Myntra/Flipkart
    if (searchImage && imageColors) {
      const imageFeatures = analyzeImageFeatures(imageColors);
      
      // Reject non-product images (charts, documents, etc.)
      if (!imageFeatures) {
        return [];
      }
      
      // Score each product based on visual similarity and category match
      const scoredProducts = list.map(product => {
        const category = (product.category || '').toLowerCase();
        const name = (product.name || '').toLowerCase();
        
        // CATEGORY DETECTION (What type of product is this?)
        const isClothing = 
          category.match(/\b(dress|clothing|apparel|shirt|top|frock|gown|skirt|pant|shorts|outfit|wear)\b/) ||
          name.match(/\b(dress|frock|gown|shirt|top|tee|blouse|skirt|pant|short|wear|cloth)\b/) ||
          (category.includes('boy') && (category.includes('wear') || name.includes('dress') || name.includes('shirt'))) ||
          (category.includes('girl') && (category.includes('wear') || name.includes('dress') || name.includes('frock')));
        
        const isFootwear = 
          category.match(/\b(footwear|footwera|shoe|sandal|boot|slipper|sneaker)\b/) ||
          name.match(/\b(shoe|sandal|boot|slipper|sneaker|footwear)\b/);
        
        const isBabyProduct = 
          category.match(/\b(baby|feeding|bottle|sippy|bib|infant|toddler|nursery)\b/) ||
          name.match(/\b(bottle|sippy|bib|feeder|bowl|spoon|baby|infant|diaper|wipe)\b/) ||
          category.includes('baby') || name.includes('baby');
        
        const isToy = 
          category.match(/\b(toy|game|puzzle|play)\b/) ||
          name.match(/\b(toy|game|puzzle|doll|car|block|play)\b/);
        
        const isAccessory = 
          category.match(/\b(bag|hat|cap|jewelry|accessory|belt|scarf)\b/) ||
          name.match(/\b(bag|backpack|hat|cap|necklace|bracelet|belt|bow)\b/);
        
        // Products must belong to a valid category
        if (!isClothing && !isFootwear && !isBabyProduct && !isToy && !isAccessory) {
          return null;
        }
        
        // BASE CATEGORY SCORE
        let categoryScore = 0;
        let productType = 'other';
        
        if (isClothing) {
          productType = 'clothing';
          categoryScore = 100;
        } else if (isFootwear) {
          productType = 'footwear';
          categoryScore = 90;
        } else if (isBabyProduct) {
          productType = 'baby';
          categoryScore = 95;
        } else if (isToy) {
          productType = 'toys';
          categoryScore = 85;
        } else if (isAccessory) {
          productType = 'accessories';
          categoryScore = 80;
        }
        
        // VISUAL SIMILARITY SCORE (Color matching - key feature of Myntra/Flipkart)
        let colorMatchScore = 0;
        if (product.imageUrl || product.image) {
          // For each dominant color in uploaded image, check if product likely has similar colors
          // In real implementation, we'd extract product image colors, but for now use heuristics
          
          // Boost score based on color characteristics matching
          imageFeatures.dominantColors.forEach(imageColor => {
            // Pastel products match pastel uploaded images
            if (imageFeatures.isPastel && productType === 'baby') {
              colorMatchScore += 20;
            }
            // Vibrant colors match clothing/toys better
            if (imageFeatures.isVibrant && (productType === 'clothing' || productType === 'toys')) {
              colorMatchScore += 15;
            }
            // Darker colors match footwear
            if (!imageFeatures.isBright && productType === 'footwear') {
              colorMatchScore += 10;
            }
          });
        }
        
        // FINAL SCORE CALCULATION (like e-commerce ranking algorithms)
        let finalScore = categoryScore + colorMatchScore;
        
        // Must have valid product category
        if (categoryScore === 0) return null;
        
        // RANKING BOOSTS (like e-commerce algorithms)
        // In-stock items ranked higher
        if (product.inStock) finalScore += 20;
        
        // Popular/trending items
        if (product.isNew) finalScore += 15;
        if (product.featured) finalScore += 10;
        
        // Price relevance (mid-range products often more relevant)
        if (product.price && product.price > 200 && product.price < 2000) {
          finalScore += 5;
        }
        
        return {
          ...product,
          visualScore: finalScore,
          productType,
          colorMatchScore
        };
      }).filter(p => p !== null);
      
      // SORT BY RELEVANCE (highest score first - like Myntra/Flipkart)
      const rankedProducts = scoredProducts
        .filter(p => p.inStock && p.visualScore >= 85) // Higher threshold for better results
        .sort((a, b) => {
          // Primary: Visual score
          if (b.visualScore !== a.visualScore) {
            return b.visualScore - a.visualScore;
          }
          // Secondary: Color match
          if (b.colorMatchScore !== a.colorMatchScore) {
            return b.colorMatchScore - a.colorMatchScore;
          }
          // Tertiary: Featured/new items
          if (b.featured !== a.featured) return b.featured ? 1 : -1;
          if (b.isNew !== a.isNew) return b.isNew ? 1 : -1;
          // Final: Price (ascending)
          return (a.price || 0) - (b.price || 0);
        });
      
      return rankedProducts;
    }
    
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
  }, [products, query, selectedCategory, filterMode, location.pathname, searchImage, imageColors, analyzeImageFeatures]);

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

      {/* Hero Carousel (hidden for fashion selections and image search) */}
      {!isFashionKey && !searchImage && (
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

      {/* Personalized Recommendations (top) - hidden for fashion selections and image search) */}
      {!isFashionKey && !searchImage && personalized.length > 0 && (
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
        {/* Image Search Display - Myntra Style */}
        {searchImage && (
          <Box sx={{ mb: 4 }}>
            {/* Uploaded Image Display */}
            <Box sx={{ 
              bgcolor: 'white', 
              borderRadius: 3, 
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              mb: 3
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                p: 2,
                bgcolor: '#f5f5f5',
                borderBottom: '1px solid #e0e0e0'
              }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Photo Search
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    setSearchImage(null);
                    setImageColors(null);
                    navigate('/shop');
                  }}
                  sx={{ 
                    textTransform: 'none', 
                    color: '#2e7d32',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#e8f5e9' }
                  }}
                >
                  Clear Search
                </Button>
              </Box>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                p: 3,
                gap: 3
              }}>
                <Box
                  component="img"
                  src={searchImage}
                  alt="Uploaded search image"
                  sx={{
                    width: { xs: 120, sm: 150, md: 180 },
                    height: { xs: 120, sm: 150, md: 180 },
                    objectFit: 'cover',
                    borderRadius: 2,
                    boxShadow: 3,
                    border: '3px solid #2e7d32'
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#2e7d32' }}>
                    Visual Search Results
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    {filtered.length > 0 
                      ? `Found ${filtered.length} matching product${filtered.length !== 1 ? 's' : ''}`
                      : 'No matching products found'
                    }
                  </Typography>
                  {filtered.length === 0 && (
                    <Typography variant="body2" color="error" sx={{ fontWeight: 500 }}>
                      ⚠️ No exact matches. Try uploading a clearer image or browse our catalog.
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>

            {/* Products in this photo heading */}
            {filtered.length > 0 && (
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 3,
                  pb: 2,
                  borderBottom: '2px solid #2e7d32'
                }}
              >
                Products in this photo
              </Typography>
            )}
          </Box>
        )}

        {filtered.length === 0 && !searchImage && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            No products match "{query}".
          </Typography>
        )}
        
        {!searchImage && (
          <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
            Featured Products
          </Typography>
        )}
        
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
                    {product.activeDiscount > 0 && (
                      <Chip 
                        label={`${product.activeDiscount}% OFF`} 
                        color="error" 
                        size="small" 
                        sx={{ fontWeight: 700, fontSize: '0.85rem' }} 
                      />
                    )}
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