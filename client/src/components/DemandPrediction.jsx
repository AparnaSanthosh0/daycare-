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
  LinearProgress
} from '@mui/material';
import {
  TrendingUp as DemandIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import api from '../config/api';

const DemandPrediction = () => {
  const [formData, setFormData] = useState({
    product_type: 'Diaper',
    previous_sales: '50',
    delivery_time: '2',
    price: '300'
  });
  
  const [predictionResult, setPredictionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setPredictionResult(null);

    try {
      const response = await api.post('/demand-prediction/predict', {
        product_type: formData.product_type,
        previous_sales: parseInt(formData.previous_sales),
        delivery_time: parseFloat(formData.delivery_time),
        price: parseFloat(formData.price)
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

  const getDemandColor = (demand) => {
    switch(demand?.toLowerCase()) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'error';
      default: return 'default';
    }
  };

  const getDemandLabel = (demand) => {
    switch(demand?.toLowerCase()) {
      case 'high': return '🔴 High Demand';
      case 'medium': return '🟡 Medium Demand';
      case 'low': return '🟢 Low Demand';
      default: return demand;
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InventoryIcon color="primary" />
            <Typography variant="h6">Product Demand Prediction</Typography>
          </Box>
        }
        subheader="Predict demand category (Low/Medium/High) using Backpropagation Neural Network"
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* Input Form */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
              Product Details
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Product Type</InputLabel>
              <Select
                value={formData.product_type}
                onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                label="Product Type"
              >
                <MenuItem value="Diaper">Diaper</MenuItem>
                <MenuItem value="BabyCare">Baby Care</MenuItem>
                <MenuItem value="Feeding">Feeding</MenuItem>
                <MenuItem value="Toy">Toy</MenuItem>
                <MenuItem value="Bath">Bath & Hygiene</MenuItem>
                <MenuItem value="Footwear">Footwear</MenuItem>
                <MenuItem value="Gear">Gear & Accessories</MenuItem>
                <MenuItem value="BoyFashion">Boy Fashion</MenuItem>
                <MenuItem value="GirlFashion">Girl Fashion</MenuItem>
                <MenuItem value="Skincare">Skincare</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Previous Month Sales (units)"
              type="number"
              value={formData.previous_sales}
              onChange={(e) => setFormData({ ...formData, previous_sales: e.target.value })}
              sx={{ mb: 2 }}
              helperText="Number of units sold last month"
            />

            <TextField
              fullWidth
              label="Vendor Delivery Time (days)"
              type="number"
              value={formData.delivery_time}
              onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
              sx={{ mb: 2 }}
              helperText="Average days to receive from vendor"
            />

            <TextField
              fullWidth
              label="Price (₹)"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              sx={{ mb: 2 }}
            />

            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handlePredict}
              disabled={loading}
              startIcon={<DemandIcon />}
            >
              {loading ? 'Analyzing...' : 'Predict Demand'}
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
              Demand Prediction
            </Typography>

            {predictionResult ? (
              <Box sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Predicted Demand:
                  </Typography>
                  <Chip
                    label={getDemandLabel(predictionResult.prediction)}
                    color={getDemandColor(predictionResult.prediction)}
                    size="large"
                    sx={{ fontSize: '1.1rem', py: 2, fontWeight: 700 }}
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

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Analysis Factors:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={`Type: ${predictionResult.factors?.product_type || 'N/A'}`} size="small" />
                    <Chip label={`Sales: ${predictionResult.factors?.previous_sales || 'N/A'} units`} size="small" />
                    <Chip label={`Delivery: ${predictionResult.factors?.delivery_time || 'N/A'} days`} size="small" />
                    <Chip label={`Price: ₹${predictionResult.factors?.price || 'N/A'}`} size="small" />
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
              </Box>
            ) : (
              <Box
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: 'grey.100',
                  borderRadius: 2
                }}
              >
                <DemandIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Enter product details and click "Predict Demand" to see AI-powered demand predictions
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default DemandPrediction;

