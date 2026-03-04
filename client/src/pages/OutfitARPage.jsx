import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Container, Alert, Typography } from '@mui/material';
import OutfitAR from '../components/AR/OutfitAR';
import { useShop } from '../contexts/ShopContext';
import api from '../config/api';

/**
 * OutfitARPage
 *
 * Standalone AR page for dress / outfit customization.
 * Opened from fashion product pages (e.g. "Customize in AR" button).
 */
const OutfitARPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useShop();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const productId = searchParams.get('productId');
      if (!productId) {
        setError('Missing product information for Outfit AR.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Try direct product endpoint first
        const res = await api.get(`/api/products/${productId}`);
        const p = res.data?.product || res.data;
        if (!mounted) return;
        if (p) {
          const normalized = {
            id: p._id || p.id,
            _id: p._id || p.id,
            name: p.name,
            price: p.price,
            image: p.image || (Array.isArray(p.images) && p.images[0]) || '/logo192.svg',
            category: p.category || 'Fashion',
            stockQty: p.stockQty ?? 0,
            inStock: (p.stockQty ?? 0) > 0 && (p.inStock !== false),
          };
          setProduct(normalized);
        } else {
          setError('Could not find this product for Outfit AR.');
        }
      } catch {
        // Fallback to list endpoint
        try {
          const { data } = await api.get('/products', { params: { all: true } });
          if (!mounted) return;
          const list = data.products || [];
          const found = list.find((p) => p._id === productId || p.id === productId);
          if (found) {
            const normalized = {
              id: found._id || found.id,
              _id: found._id || found.id,
              name: found.name,
              price: found.price,
              image:
                found.image ||
                (Array.isArray(found.images) && found.images[0]) ||
                '/logo192.svg',
              category: found.category || 'Fashion',
              stockQty: found.stockQty ?? 0,
              inStock:
                (found.stockQty ?? 0) > 0 && (found.inStock !== false),
            };
            setProduct(normalized);
          } else {
            setError('Could not find this product for Outfit AR.');
          }
        } catch {
          if (mounted) {
            setError('Unable to load product for Outfit AR.');
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  const handleAddToCart = (p) => {
    // Reuse central ecommerce cart
    const success = addToCart(p, null, 1);
    if (success) {
      navigate('/cart');
    }
  };

  const handleClose = () => {
    const productId = searchParams.get('productId');
    if (productId) {
      navigate(`/product/${productId}`);
    } else {
      navigate('/shop');
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
        }}
      >
        <CircularProgress size={60} sx={{ color: '#1976d2' }} />
        <Typography variant="body1" sx={{ mt: 2, color: '#fff' }}>
          Loading Outfit AR...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Please open Outfit AR from a valid fashion product page.
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!product) return null;

  return (
    <Box sx={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <OutfitAR
        product={product}
        onClose={handleClose}
        onAddToCart={handleAddToCart}
      />
    </Box>
  );
};

export default OutfitARPage;

