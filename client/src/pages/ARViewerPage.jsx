import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Container, Alert, CircularProgress, Typography } from '@mui/material';
import ARViewer from '../components/AR/ARViewer';
import { useShop } from '../contexts/ShopContext';

/**
 * ARViewerPage
 * 
 * Standalone page for AR experiences
 * Accessed via QR code scanning
 * Displays product in AR mode
 */
const ARViewerPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useShop();
  
  const [arData, setArData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Parse AR data from URL
  useEffect(() => {
    console.log('🔍 ARViewerPage: Parsing URL parameters...');
    console.log('Full URL:', window.location.href);
    
    try {
      const mode = searchParams.get('mode');
      const dataParam = searchParams.get('data');
      
      console.log('Mode:', mode);
      console.log('Data param:', dataParam);

      if (mode !== 'ar' || !dataParam) {
        console.error('❌ Invalid mode or missing data parameter');
        setError('Invalid AR link. Please scan a valid QR code.');
        setLoading(false);
        return;
      }

      // Decode AR data
      const decodedData = atob(dataParam);
      console.log('Decoded data:', decodedData);
      
      const data = JSON.parse(decodedData);
      console.log('Parsed AR data:', data);

      // Validate data - make model3DUrl optional
      if (!data.productId) {
        console.error('❌ Missing product ID');
        setError('Invalid product data in QR code.');
        setLoading(false);
        return;
      }
      
      // Use placeholder if no model URL provided
      if (!data.model3DUrl) {
        console.warn('⚠️ No model URL, using placeholder teddy bear');
        data.model3DUrl = '/models/toys/teddy-bear.glb';
      }

      console.log('✅ AR data validated successfully');
      setArData(data);
      setLoading(false);
    } catch (err) {
      console.error('❌ AR data parsing error:', err);
      setError('Failed to load AR experience. Invalid QR code data.');
      setLoading(false);
    }
  }, [searchParams]);

  // Handle add to cart
  const handleAddToCart = (product) => {
    addToCart({
      id: product.id,
      name: arData.productName,
      price: arData.price || 0,
      quantity: 1,
    });
    
    // Show confirmation and redirect
    setTimeout(() => {
      navigate('/shop/cart');
    }, 1000);
  };

  // Handle close
  const handleClose = () => {
    navigate('/shop');
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
          Loading AR Experience...
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
            Please scan a valid QR code or return to the shop.
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!arData) {
    return null;
  }

  return (
    <Box sx={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <ARViewer
        modelUrl={arData.model3DUrl}
        productName={arData.productName}
        productId={arData.productId}
        price={arData.price}
        onClose={handleClose}
        onAddToCart={handleAddToCart}
      />
    </Box>
  );
};

export default ARViewerPage;
