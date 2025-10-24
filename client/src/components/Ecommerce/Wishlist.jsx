import React from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, CardMedia, Button, IconButton } from '@mui/material';
import { Favorite, ShoppingCart, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../../contexts/ShopContext';
import api, { API_BASE_URL } from '../../config/api';

const toAbsoluteImageUrl = (maybePath) => {
  if (!maybePath) return '/logo192.svg';
  if (typeof maybePath === 'string' && /^https?:\/\//i.test(maybePath)) return maybePath.trim();
  try {
    let origin = API_BASE_URL.replace(/\/?api\/?$/i, '').replace(/\/$/, '');
    if (!/^https?:\/\//i.test(origin) && typeof window !== 'undefined' && window.location?.origin) {
      origin = window.location.origin;
    }
    let resource = String(maybePath).trim().replace(/\\/g, '/');
    resource = resource.startsWith('/') ? resource : `/${resource}`;
    const encoded = resource.split('/').map((seg, i) => (i === 0 ? seg : encodeURIComponent(seg))).join('/');
    const u = new URL(encoded, origin);
    return u.href;
  } catch (e) {
    return String(maybePath);
  }
};

export default function Wishlist() {
  const navigate = useNavigate();
  const { wishlist, addToCart, toggleWishlist } = useShop();
  const [products, setProducts] = React.useState([]);

  React.useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/api/products', { params: { all: true } });
        const mapped = (data.products || []).map((p) => ({
          id: p._id,
          name: p.name,
          price: p.price,
          image: toAbsoluteImageUrl(p.image || (Array.isArray(p.images) && p.images[0])) || '/logo192.svg',
          imageFit: p.imageFit || 'cover',
          imageFocalX: typeof p.imageFocalX === 'number' ? p.imageFocalX : 50,
          imageFocalY: typeof p.imageFocalY === 'number' ? p.imageFocalY : 50,
          category: p.category || 'General',
          description: p.description || '',
          inStock: p.inStock !== false,
        }));
        setProducts(mapped);
      } catch (e) {
        setProducts([]);
      }
    };
    load();
  }, []);

  const liked = products.filter((p) => wishlist.has(p.id));

  return (
    <Box sx={{ backgroundColor: '#fff', minHeight: '80vh', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <IconButton onClick={() => navigate(-1)}><ArrowBack /></IconButton>
          <Typography variant="h5" fontWeight={700}>My Shortlist</Typography>
        </Box>

        {liked.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
            <img src="/empty-cart.png" alt="empty" onError={(e)=>{e.currentTarget.style.display='none';}} style={{ width: 120, opacity: 0.9 }} />
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Hey! No items in your shortlist</Typography>
            <Button variant="outlined" color="success" onClick={() => navigate(-1)}>Go to previous page</Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {liked.map((p) => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <Card>
                  <CardMedia
                    component="img"
                    src={p.image}
                    alt={p.name}
                    sx={{ height: 220, objectFit: p.imageFit, objectPosition: `${p.imageFocalX}% ${p.imageFocalY}%` }}
                    onError={(e) => { e.currentTarget.src = '/logo192.svg'; }}
                  />
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">{p.category}</Typography>
                    <Typography variant="h6" fontWeight={600}>{p.name}</Typography>
                    <Typography fontWeight={700} color="success.main" sx={{ mb: 1 }}>₹{p.price}</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<ShoppingCart />}
                        onClick={() => addToCart(p)}
                        disabled={!p.inStock}
                      >
                        {p.inStock ? 'Add to Cart' : 'Out of Stock'}
                      </Button>
                      <IconButton color="error" onClick={() => toggleWishlist(p.id)}>
                        <Favorite />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
