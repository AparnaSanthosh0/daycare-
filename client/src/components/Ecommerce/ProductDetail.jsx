import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Typography,
  Chip,
  Rating,
  IconButton,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Skeleton,
  Card,
  CardContent,
  CardMedia,
  Snackbar,
} from '@mui/material';
import { Favorite, FavoriteBorder, ShoppingCart, ArrowBack } from '@mui/icons-material';
import { Fab, Badge } from '@mui/material';
import ShopHeader from './ShopHeader';
import api, { API_BASE_URL } from '../../config/api';
import { useShop } from '../../contexts/ShopContext';
import { recommendForProduct, recommendForUser, collectSignalsFromContext } from '../../utils/recommendations';
import { deriveSizeOptions } from '../../utils/sizes';

function toAbsoluteImageUrl(maybePath) {
  if (!maybePath) return null;
  if (typeof maybePath === 'string' && /^https?:\/\//i.test(maybePath)) return maybePath.trim();
  try {
    let origin = API_BASE_URL.replace(/\/?api\/?$/i, '').replace(/\/$/, '');
    if (!/^https?:\/\//i.test(origin)) {
      if (typeof window !== 'undefined' && window.location?.origin) {
        origin = window.location.origin;
      }
    }
    let resource = String(maybePath).trim().replace(/\\/g, '/');
    resource = resource.startsWith('/') ? resource : `/${resource}`;
    const encoded = resource.split('/').map((seg, i) => (i === 0 ? seg : encodeURIComponent(seg))).join('/');
    const u = new URL(encoded, origin);
    return u.href;
  } catch (e) {
    return String(maybePath);
  }
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, wishlist, toggleWishlist, cartCount, interactions, recentlyViewed, recordView, pushRecentlyViewed, cartItems } = useShop();
  const [loading, setLoading] = React.useState(true);
  const [product, setProduct] = React.useState(null);
  const [selectedSize, setSelectedSize] = React.useState(null);
  const [images, setImages] = React.useState([]);
  const [allProducts, setAllProducts] = React.useState([]);
  const [snack, setSnack] = React.useState('');
  const sizeOptions = deriveSizeOptions(product?.category, product?.sizeBasis || null);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        // Try product by id
        const res = await api.get(`/api/products/${id}`);
        const p = res.data?.product || res.data;
        if (mounted && p) {
          const image = toAbsoluteImageUrl(p.image || (Array.isArray(p.images) && p.images[0]));
          const gallery = (Array.isArray(p.images) && p.images.length ? p.images : [p.image]).filter(Boolean).map(toAbsoluteImageUrl);
          
          // Calculate discounted price if active discount exists
          const hasActiveDiscount = p.discountStatus === 'active' && p.activeDiscount > 0;
          const discountedPrice = hasActiveDiscount 
            ? Math.round(p.price * (1 - p.activeDiscount / 100) * 100) / 100 
            : p.price;
          
          const normalized = {
            id: p._id || p.id,
            name: p.name,
            price: discountedPrice,
            originalPrice: hasActiveDiscount ? p.price : (p.originalPrice || null),
            activeDiscount: hasActiveDiscount ? p.activeDiscount : 0,
            discountStatus: p.discountStatus || 'none',
            image,
            images: gallery.length ? gallery : [image || '/logo192.svg'],
            category: p.category || 'General',
            rating: p.rating || 4.5,
            reviews: p.reviews || 0,
            inStock: p.inStock !== false,
            description: p.description || '',
          };
          setProduct(normalized);
          setImages(gallery.length ? gallery : [image || '/logo192.svg']);
          // record view signals
          recordView(normalized.id);
          pushRecentlyViewed(normalized.id);
        }
        // Load all products for recommendations
        try {
          const { data } = await api.get('/api/products', { params: { all: true } });
          if (mounted) setAllProducts(data.products || []);
        } catch {}
      } catch (e) {
        // Fallback: fetch list and pick by id
        try {
          const { data } = await api.get('/api/products', { params: { all: true } });
          const found = (data.products || []).find((p) => (p._id === id || p.id === id));
          if (mounted && found) {
            const image = toAbsoluteImageUrl(found.image || (Array.isArray(found.images) && found.images[0]));
            const gallery = (Array.isArray(found.images) && found.images.length ? found.images : [found.image]).filter(Boolean).map(toAbsoluteImageUrl);
            
            // Calculate discounted price if active discount exists
            const hasActiveDiscount = found.discountStatus === 'active' && found.activeDiscount > 0;
            const discountedPrice = hasActiveDiscount 
              ? Math.round(found.price * (1 - found.activeDiscount / 100) * 100) / 100 
              : found.price;
            
            const normalized = {
              id: found._id || found.id,
              name: found.name,
              price: discountedPrice,
              originalPrice: hasActiveDiscount ? found.price : (found.originalPrice || null),
              activeDiscount: hasActiveDiscount ? found.activeDiscount : 0,
              discountStatus: found.discountStatus || 'none',
              image,
              images: gallery.length ? gallery : [image || '/logo192.svg'],
              category: found.category || 'General',
              rating: found.rating || 4.5,
              reviews: found.reviews || 0,
              inStock: found.inStock !== false,
              description: found.description || '',
            };
            setProduct(normalized);
            setImages(gallery.length ? gallery : [image || '/logo192.svg']);
            recordView(normalized.id);
            pushRecentlyViewed(normalized.id);
          }
          // Also set product list for recommendations
          if (mounted) setAllProducts(data.products || []);
        } catch {}
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id, recordView, pushRecentlyViewed]);

  const [activeImage, setActiveImage] = React.useState(0);

  const canAdd = product?.inStock && ((sizeOptions.length === 0) || !!selectedSize);
  const similarProducts = React.useMemo(() => {
    if (!product || !allProducts?.length) return [];
    const recs = recommendForProduct(product, allProducts, { k: 10 });
    return recs.map((p) => ({
      ...p,
      image: toAbsoluteImageUrl(p.image),
    }));
  }, [allProducts, product]);

  const personalized = React.useMemo(() => {
    if (!allProducts?.length) return [];
    const signals = collectSignalsFromContext({ wishlist, cartItems, interactions, recentlyViewed });
    const recs = recommendForUser(signals, allProducts, { k: 10 });
    return recs.map((p) => ({ ...p, image: toAbsoluteImageUrl(p.image) }));
  }, [wishlist, cartItems, interactions, recentlyViewed, allProducts]);

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <ShopHeader />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>Back</Button>
        {loading || !product ? (
          <Box>
            <Skeleton variant="rectangular" height={380} sx={{ mb: 2 }} />
            <Skeleton height={40} width="60%" />
            <Skeleton height={24} width="40%" />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Grid container spacing={1}>
                <Grid item xs={2}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {images.map((img, idx) => (
                      <Box key={idx} onClick={() => setActiveImage(idx)} sx={{ p: 0.5, border: idx === activeImage ? '2px solid #ff6f00' : '1px solid #eee', borderRadius: 1, cursor: 'pointer' }}>
                        <img src={img} alt={`thumb-${idx}`} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} onError={(e)=>{e.currentTarget.src='/logo192.svg';}} />
                      </Box>
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={10}>
                  <Box sx={{ bgcolor: '#f3f4f6', borderRadius: 2, p: 1 }}>
                    <img src={images[activeImage] || product.image} alt={product.name} style={{ width: '100%', maxHeight: 520, objectFit: 'contain' }} onError={(e)=>{e.currentTarget.src='/logo192.svg';}} />
                  </Box>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip label={product.category} size="small" color="success" variant="outlined" />
                {product.activeDiscount > 0 && (
                  <Chip label={`${product.activeDiscount}% OFF`} size="small" color="error" sx={{ fontWeight: 700 }} />
                )}
              </Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>{product.name}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Rating value={product.rating} precision={0.1} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">({product.reviews})</Typography>
              </Box>
              {!product.inStock && (
                <Chip label="Out of Stock" color="error" size="small" sx={{ mb: 2 }} />
              )}
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 2 }}>
                <Typography variant="h4" color="success.main" fontWeight={800}>₹{product.price}</Typography>
                {product.originalPrice && (
                  <Typography variant="body1" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>₹{product.originalPrice}</Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{product.description}</Typography>
              {sizeOptions.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography fontWeight={700}>Size</Typography>
                    <Typography variant="caption" color="text.secondary">SIZE CHART</Typography>
                  </Box>
                  <ToggleButtonGroup exclusive value={selectedSize} onChange={(e, v) => setSelectedSize(v)} sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {sizeOptions.map((s) => (
                      <ToggleButton key={s} value={s} size="small" sx={{ borderRadius: 5, px: 1.5, py: 0.75 }}>{s}</ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <IconButton onClick={() => { toggleWishlist(product.id); setSnack(wishlist.has(product.id) ? 'Removed from wishlist' : 'Added to wishlist'); }}>
                  {wishlist.has(product.id) ? <Favorite color="error" /> : <FavoriteBorder />}
                </IconButton>
                <Typography variant="body2" color="text.secondary">Shortlist</Typography>
              </Box>
              <Button
                fullWidth
                variant="contained"
                color="success"
                size="large"
                startIcon={<ShoppingCart />}
                disabled={!canAdd}
                onClick={() => { addToCart(product, selectedSize || null, 1); setSnack('Added to cart'); }}
                sx={{ borderRadius: '25px', py: 1.5, fontWeight: 700 }}
              >
                {product.inStock ? 'ADD TO CART' : 'OUT OF STOCK'}
              </Button>
              <Divider sx={{ my: 3 }} />
              <Typography variant="caption" color="text.secondary">7 days Return/Exchange · Fast Delivery</Typography>
            </Grid>
          </Grid>
        )}

        {/* Recommendations */}
        {!loading && product && (
          <>
            {similarProducts.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>You May Also Like</Typography>
                <Box sx={{ display: 'flex', overflowX: 'auto', gap: 2, pb: 1 }}>
                  {similarProducts.map((p) => (
                    <Card key={p.id} sx={{ minWidth: 220, borderRadius: 2 }}>
                      <CardMedia component="img" image={p.image || '/logo192.svg'} alt={p.name} sx={{ height: 180, objectFit: 'cover' }} onClick={() => navigate(`/product/${p.id}`)} />
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography variant="body2" fontWeight={600} noWrap title={p.name}>{p.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography fontWeight={700}>₹{p.price}</Typography>
                          {p.originalPrice && (
                            <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>₹{p.originalPrice}</Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                          <Button size="small" variant="contained" color="success" disabled={!p.inStock} onClick={() => { addToCart(p, null, 1); setSnack('Added to cart'); }}>Add</Button>
                          <IconButton size="small" onClick={() => toggleWishlist(p.id)}>
                            {wishlist.has(p.id) ? <Favorite color="error" fontSize="small" /> : <FavoriteBorder fontSize="small" />}
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}

            {personalized.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Recommended for You</Typography>
                <Box sx={{ display: 'flex', overflowX: 'auto', gap: 2, pb: 1 }}>
                  {personalized.map((p) => (
                    <Card key={p.id} sx={{ minWidth: 220, borderRadius: 2 }}>
                      <CardMedia component="img" image={p.image || '/logo192.svg'} alt={p.name} sx={{ height: 180, objectFit: 'cover' }} onClick={() => navigate(`/product/${p.id}`)} />
                      <CardContent sx={{ p: 1.5 }}>
                        <Typography variant="body2" fontWeight={600} noWrap title={p.name}>{p.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography fontWeight={700}>₹{p.price}</Typography>
                          {p.originalPrice && (
                            <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>₹{p.originalPrice}</Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                          <Button size="small" variant="contained" color="success" disabled={!p.inStock} onClick={() => { addToCart(p, null, 1); setSnack('Added to cart'); }}>Add</Button>
                          <IconButton size="small" onClick={() => toggleWishlist(p.id)}>
                            {wishlist.has(p.id) ? <Favorite color="error" fontSize="small" /> : <FavoriteBorder fontSize="small" />}
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}

        <Snackbar
          open={!!snack}
          autoHideDuration={2000}
          onClose={() => setSnack('')}
          message={snack}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />
        {/* Floating Cart Button */}
        <Fab color="success" sx={{ position: 'fixed', bottom: 24, right: 24 }} onClick={() => navigate('/cart')}>
          <Badge badgeContent={cartCount} color="error">
            <ShoppingCart />
          </Badge>
        </Fab>
      </Container>
    </Box>
  );
}
