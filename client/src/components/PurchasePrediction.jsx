import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Divider,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
  Psychology as BrainIcon
} from '@mui/icons-material';
import api from '../config/api';

const PurchasePrediction = () => {
  const [formData, setFormData] = useState({
    category: 'Toy',
    price: '500',
    discount: '10',
    customerType: 'Parent'
  });
  
  const [predictionResult, setPredictionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setPredictionResult(null);

    try {
      const response = await api.post('/purchase-prediction/predict', {
        category: formData.category,
        price: parseFloat(formData.price),
        discount: parseFloat(formData.discount),
        customerType: formData.customerType
      });

      if (response.data.success) {
        setPredictionResult(response.data);
      } else {
        setError('Prediction failed. Please try again.');
      }
    } catch (err) {
      console.error('Prediction error:', err);
      setError('Error making prediction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BrainIcon color="primary" />
            <Typography variant="h6">AI Purchase Prediction</Typography>
          </Box>
        }
        subheader="Predict whether a customer will purchase a product using SVM algorithm"
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* Input Form */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Product Details
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Product Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="Product Category"
              >
                <MenuItem value="Toy">Toys</MenuItem>
                <MenuItem value="Diaper">Diapering</MenuItem>
                <MenuItem value="Footwear">Footwear</MenuItem>
                <MenuItem value="Bath">Bath & Hygiene</MenuItem>
                <MenuItem value="BabyCare">Baby Care</MenuItem>
                <MenuItem value="Feeding">Feeding</MenuItem>
                <MenuItem value="Gear">Gear & Accessories</MenuItem>
                <MenuItem value="BoyFashion">Boy Fashion</MenuItem>
                <MenuItem value="GirlFashion">Girl Fashion</MenuItem>
                <MenuItem value="Skincare">Skincare</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Price (₹)"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Discount (%)"
              type="number"
              value={formData.discount}
              onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Customer Type</InputLabel>
              <Select
                value={formData.customerType}
                onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                label="Customer Type"
              >
                <MenuItem value="Parent">Parent</MenuItem>
                <MenuItem value="Customer">Customer</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handlePredict}
              disabled={loading}
              startIcon={<BrainIcon />}
            >
              {loading ? 'Predicting...' : 'Predict Purchase'}
            </Button>

            {loading && <LinearProgress sx={{ mt: 2 }} />}
            {error && (
              <Typography color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Grid>

          {/* Results Display */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Prediction Results
            </Typography>

            {predictionResult ? (
              <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Prediction:
                  </Typography>
                  <Chip
                    label={predictionResult.prediction === 'Yes' ? '✅ Will Purchase' : '❌ Won\'t Purchase'}
                    color={predictionResult.prediction === 'Yes' ? 'success' : 'error'}
                    size="large"
                    sx={{ fontSize: '1.1rem', py: 2 }}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Confidence:</strong> {(predictionResult.confidence * 100).toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={predictionResult.confidence * 100}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Analysis Factors:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={`Category: ${predictionResult.factors?.category || 'N/A'}`} size="small" />
                    <Chip label={`Price: ₹${predictionResult.factors?.price || 'N/A'}`} size="small" />
                    <Chip label={`Discount: ${predictionResult.factors?.discount || 'N/A'}%`} size="small" />
                    <Chip label={`Customer: ${predictionResult.factors?.customer_type || 'N/A'}`} size="small" />
                  </Box>
                </Box>

                {predictionResult.explanation && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      AI Explanation:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {predictionResult.explanation}
                    </Typography>
                  </Box>
                )}
              </Paper>
            ) : (
              <Box
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: 'grey.100',
                  borderRadius: 2
                }}
              >
                <CartIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Enter product details and click "Predict Purchase" to see AI-powered predictions
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default PurchasePrediction;

