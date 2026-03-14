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
import Image3DViewer from '../Image3DViewer';

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
  const [imageViewMode, setImageViewMode] = React.useState('normal');
  const [allProducts, setAllProducts] = React.useState([]);
  const [snack, setSnack] = React.useState('');
  const sizeOptions = deriveSizeOptions(product?.category, product?.sizeBasis || null);

  // Determine if this product supports AR/customization
  const productCat = (product?.category || '').toLowerCase();
  const productName = (product?.name || '').toLowerCase();
  const isClothing = productCat.includes('cloth') || productCat.includes('dress') || productCat.includes('apparel') || productCat.includes('outfit') || productCat.includes('shirt') || productCat.includes('wear') || productCat.includes('skirt') || productCat.includes('romper');
  const isFaceAR   = productCat.includes('access') || productCat.includes('hat') || productCat.includes('glass') || productName.includes('makeup') || productName.includes('face paint');

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
            stockQty: p.stockQty ?? 0,
            inStock: (p.stockQty ?? 0) > 0 && (p.inStock !== false),
            description: p.description || '',
            model3DUrl: p.model3DUrl || null, // 3D model URL if available
          };
          setProduct(normalized);
          setImages(gallery.length ? gallery : [image || '/logo192.svg']);
          // record view signals
          recordView(normalized.id);
          pushRecentlyViewed(normalized.id);
        }
        // Load all products for recommendations
        try {
          const { data } = await api.get('/products', { params: { all: true } });
          if (mounted) setAllProducts(data.products || []);
        } catch {}
      } catch (e) {
        // Fallback: fetch list and pick by id
        try {
          const { data } = await api.get('/products', { params: { all: true } });
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
              model3DUrl: found.model3DUrl || null, // 3D model URL if available
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

  const canAdd = product && product.stockQty > 0 && ((sizeOptions.length === 0) || !!selectedSize);
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
              <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: 'white', p: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" fontWeight={700}>Product View</Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={imageViewMode}
                    onChange={(_, value) => {
                      if (value) setImageViewMode(value);
                    }}
                  >
                    <ToggleButton value="normal">Normal View</ToggleButton>
                    <ToggleButton value="interactive">Rotate / Zoom</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {imageViewMode === 'interactive' ? (
                  <Image3DViewer
                    imageUrl={images[0] || toAbsoluteImageUrl(product.image) || '/logo192.svg'}
                    autoRotate={false}
                    height={500}
                    backgroundColor="#f8fafc"
                  />
                ) : (
                  <Box
                    component="img"
                    src={images[0] || toAbsoluteImageUrl(product.image) || '/logo192.svg'}
                    alt={product.name}
                    sx={{ width: '100%', height: 500, objectFit: 'contain', borderRadius: 1.5, bgcolor: '#f8fafc' }}
                    onError={(e) => { e.currentTarget.src = '/logo192.svg'; }}
                  />
                )}

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Switch to interactive mode to rotate, zoom, and inspect the product in detail.
                </Typography>

                {(images || []).length > 1 && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, overflowX: 'auto' }}>
                    {images.map((img, index) => (
                      <Box
                        key={`${img}-${index}`}
                        component="img"
                        src={img}
                        alt={`${product.name}-${index + 1}`}
                        sx={{
                          width: 72,
                          height: 72,
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        onClick={() => setImages((prev) => {
                          const next = [...prev];
                          const selected = next[index];
                          next.splice(index, 1);
                          next.unshift(selected);
                          return next;
                        })}
                        onError={(e) => { e.currentTarget.src = '/logo192.svg'; }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
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
              {product.stockQty <= 0 && (
                <Chip label="Out of Stock" color="error" size="small" sx={{ mb: 2 }} />
              )}
              {product.stockQty > 0 && product.stockQty <= 5 && (
                <Chip label={`Only ${product.stockQty} left`} color="warning" size="small" sx={{ mb: 2 }} />
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

              {/* AR Try-On Banner for face accessories / makeup */}
              {(product.category?.toLowerCase().includes('accessory') ||
                product.category?.toLowerCase().includes('hat') ||
                product.category?.toLowerCase().includes('glasses') ||
                product.name?.toLowerCase().includes('face paint') ||
                product.name?.toLowerCase().includes('makeup')) && (
                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 2,
                    color: 'white',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    ✨ Try It On in AR!
                  </Typography>
                  <Typography variant="caption" display="block" mb={1}>
                    See how this product looks on you using your camera
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    fullWidth
                    onClick={() => navigate(`/face-ar?productId=${product.id}`)}
                    sx={{
                      bgcolor: 'white',
                      color: '#667eea',
                      fontWeight: 'bold',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                      },
                    }}
                  >
                    Try Face AR Now
                  </Button>
                </Box>
              )}

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
                          <Button size="small" variant="contained" color="success" disabled={!p.stockQty || p.stockQty <= 0} onClick={() => { addToCart(p, null, 1); setSnack('Added to cart'); }}>Add</Button>
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
                          <Button size="small" variant="contained" color="success" disabled={!p.stockQty || p.stockQty <= 0} onClick={() => { addToCart(p, null, 1); setSnack('Added to cart'); }}>Add</Button>
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
