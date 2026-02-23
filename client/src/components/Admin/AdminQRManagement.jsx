import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  Stack,
  CircularProgress,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  QrCode2,
  Refresh,
  Search,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import QRCodeGenerator from '../AR/QRCodeGenerator';
import api from '../../config/api';

/**
 * AdminQRManagement Component
 * 
 * Admin panel to manage AR QR codes for products
 * - View products with 3D models
 * - Generate QR codes individually or in bulk
 * - Download/print QR codes
 * - Track QR code generation status
 */
const AdminQRManagement = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  // Load products with 3D models
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/products');
      const allProducts = response.data?.products || response.data || [];
      
      // Filter products that have 3D models
      const productsWithModels = allProducts.filter(p => p.model3DUrl);
      
      setProducts(productsWithModels);
      setFilteredProducts(productsWithModels);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError('Failed to load products. Please try again.');
      setLoading(false);
    }
  };

  // Search products
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.id.toString().includes(query)
    );
    
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  // Generate QR for single product
  const handleGenerateQR = (product) => {
    setSelectedProduct(product);
    setQrDialogOpen(true);
  };

  // Bulk generate QR codes
  const handleBulkGenerate = async () => {
    if (filteredProducts.length === 0) {
      alert('No products to generate QR codes for');
      return;
    }

    setBulkGenerating(true);

    try {
      // Generate a PDF with all QR codes
      const { default: jsPDF } = await import('jspdf');
      const QRCode = (await import('qrcode')).default;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const qrSize = 60;
      const cols = 2;
      const rows = 4;
      const spacingX = (pageWidth - 2 * margin) / cols;
      const spacingY = (pageHeight - 2 * margin) / rows;

      let currentPage = 0;
      let currentRow = 0;
      let currentCol = 0;

      for (const product of filteredProducts) {
        // Generate AR URL
        const arData = {
          productId: product.id,
          productName: product.name,
          model3DUrl: product.model3DUrl,
          price: product.price,
          type: 'ar-experience',
          timestamp: Date.now(),
        };
        
        const params = new URLSearchParams({
          mode: 'ar',
          data: btoa(JSON.stringify(arData)),
        });
        
        const arUrl = `${window.location.origin}/ar-viewer?${params.toString()}`;

        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(arUrl, {
          width: 300,
          margin: 2,
          errorCorrectionLevel: 'H',
        });

        // Add new page if needed
        if (currentPage > 0 && currentRow === 0 && currentCol === 0) {
          pdf.addPage();
        }

        // Calculate position
        const x = margin + currentCol * spacingX;
        const y = margin + currentRow * spacingY;

        // Add QR code
        pdf.addImage(qrDataUrl, 'PNG', x + 5, y + 5, qrSize, qrSize);

        // Add product name
        pdf.setFontSize(10);
        pdf.text(product.name.substring(0, 30), x + 5, y + qrSize + 12, { maxWidth: qrSize });

        // Add product ID
        pdf.setFontSize(8);
        pdf.text(`ID: ${product.id}`, x + 5, y + qrSize + 18);

        // Move to next position
        currentCol++;
        if (currentCol >= cols) {
          currentCol = 0;
          currentRow++;
          if (currentRow >= rows) {
            currentRow = 0;
            currentPage++;
          }
        }
      }

      // Save PDF
      pdf.save(`ar-qr-codes-${Date.now()}.pdf`);
      
      alert(`Successfully generated ${filteredProducts.length} QR codes!`);
    } catch (err) {
      console.error('Bulk generation error:', err);
      alert('Failed to generate bulk QR codes. Please try again.');
    } finally {
      setBulkGenerating(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <QrCode2 sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight={700}>
            AR QR Code Management
          </Typography>
        </Stack>
        <Typography variant="body1" color="text.secondary">
          Generate and manage QR codes for products with 3D models
        </Typography>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={4} justifyContent="space-around" flexWrap="wrap">
          <Box textAlign="center">
            <Typography variant="h3" fontWeight={700} color="primary.main">
              {products.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Products with 3D Models
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h3" fontWeight={700} color="success.main">
              {filteredProducts.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              QR Codes Available
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Actions */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          
          <Button
            variant="contained"
            startIcon={<QrCode2 />}
            onClick={handleBulkGenerate}
            disabled={bulkGenerating || filteredProducts.length === 0}
          >
            {bulkGenerating ? 'Generating...' : `Generate ${filteredProducts.length} QR Codes`}
          </Button>
          
          <Tooltip title="Refresh">
            <IconButton onClick={loadProducts}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Products Table */}
      {filteredProducts.length === 0 ? (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {searchQuery ? 'No products found matching your search' : 'No products with 3D models'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell><strong>Product ID</strong></TableCell>
                <TableCell><strong>Product Name</strong></TableCell>
                <TableCell><strong>Category</strong></TableCell>
                <TableCell><strong>Price</strong></TableCell>
                <TableCell align="center"><strong>3D Model</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>{product.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {product.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={product.category} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="success.main">
                      ₹{product.price}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {product.model3DUrl ? (
                      <CheckCircle color="success" />
                    ) : (
                      <Cancel color="error" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Generate QR Code">
                      <IconButton
                        color="primary"
                        onClick={() => handleGenerateQR(product)}
                        disabled={!product.model3DUrl}
                      >
                        <QrCode2 />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* QR Generator Dialog */}
      {selectedProduct && (
        <QRCodeGenerator
          open={qrDialogOpen}
          onClose={() => {
            setQrDialogOpen(false);
            setSelectedProduct(null);
          }}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          model3DUrl={selectedProduct.model3DUrl}
        />
      )}
    </Container>
  );
};

export default AdminQRManagement;
