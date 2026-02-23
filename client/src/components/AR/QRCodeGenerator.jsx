import React, { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Download,
  Share,
  Close,
  QrCode2,
  Print,
} from '@mui/icons-material';

/**
 * QRCodeGenerator Component
 * 
 * Generates QR codes that link to AR experiences for products
 * When scanned, opens AR viewer with 3D model overlay
 * 
 * @param {string} productId - Product ID to generate QR for
 * @param {string} productName - Product name for display
 * @param {string} model3DUrl - URL to 3D model
 * @param {boolean} open - Dialog open state
 * @param {function} onClose - Close dialog callback
 * @param {number} size - QR code size in pixels (default: 300)
 */
const QRCodeGenerator = ({
  productId,
  productName,
  model3DUrl,
  open = false,
  onClose,
  size = 300,
}) => {
  const canvasRef = useRef(null);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Generate AR experience URL
  const generateARUrl = useCallback(() => {
    const baseUrl = window.location.origin;
    // Create URL that includes product info for AR viewer
    const arData = {
      productId,
      productName,
      model3DUrl: model3DUrl || '/models/toys/teddy-bear.glb',
      type: 'ar-experience',
      timestamp: Date.now(),
    };
    
    // Encode data as URL parameters
    const params = new URLSearchParams({
      mode: 'ar',
      data: btoa(JSON.stringify(arData)), // Base64 encode the data
    });
    
    return `${baseUrl}/ar-viewer?${params.toString()}`;
  }, [productId, productName, model3DUrl]);

  // Generate QR code
  useEffect(() => {
    if (!open) {
      setQrGenerated(false);
      setError(null);
      return;
    }

    if (!productId) {
      setError('Product ID is missing');
      return;
    }

    const generateQR = async () => {
      try {
        setLoading(true);
        setError(null);
        setQrGenerated(false);
        
        // Wait a bit for canvas to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!canvasRef.current) {
          throw new Error('Canvas element not found');
        }
        
        const arUrl = generateARUrl();
        
        console.log('🎯 Generating QR code...');
        console.log('Product ID:', productId);
        console.log('Product Name:', productName);
        console.log('Model URL:', model3DUrl || 'Using placeholder');
        console.log('AR URL:', arUrl);
        console.log('Canvas:', canvasRef.current);
        
        await QRCode.toCanvas(canvasRef.current, arUrl, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'H',
        });
        
        console.log('✅ QR code generated successfully!');
        setQrGenerated(true);
        setLoading(false);
      } catch (err) {
        console.error('❌ QR generation error:', err);
        setError('Failed to generate QR code: ' + err.message);
        setQrGenerated(false);
        setLoading(false);
      }
    };

    generateQR();
  }, [open, productId, model3DUrl, size, productName, generateARUrl]);

  // Download QR code as PNG
  const handleDownload = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${productId}-ar.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  // Print QR code
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const canvas = canvasRef.current;
    
    if (!canvas || !printWindow) return;

    const imgData = canvas.toDataURL('image/png');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${productName}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .qr-container {
              text-align: center;
              page-break-inside: avoid;
            }
            h2 {
              margin-bottom: 10px;
              color: #1976d2;
            }
            p {
              margin: 10px 0;
              color: #666;
            }
            img {
              max-width: 100%;
              height: auto;
              border: 2px solid #ddd;
              padding: 10px;
              border-radius: 8px;
            }
            .instructions {
              margin-top: 20px;
              padding: 15px;
              background: #f5f5f5;
              border-radius: 8px;
              max-width: 400px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>Scan for AR Experience</h2>
            <p><strong>${productName}</strong></p>
            <img src="${imgData}" alt="QR Code" />
            <div class="instructions">
              <p><strong>Instructions:</strong></p>
              <ol style="text-align: left;">
                <li>Open your camera app</li>
                <li>Point at this QR code</li>
                <li>Tap the notification</li>
                <li>View product in AR!</li>
              </ol>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for image to load before printing
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Share QR code (Web Share API)
  const handleShare = async () => {
    if (!canvasRef.current) return;

    try {
      canvasRef.current.toBlob(async (blob) => {
        const file = new File([blob], `qr-ar-${productId}.png`, { type: 'image/png' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `AR Experience - ${productName}`,
            text: `Scan this QR code to view ${productName} in Augmented Reality!`,
            files: [file],
          });
        } else {
          // Fallback: Copy AR URL to clipboard
          const arUrl = generateARUrl();
          await navigator.clipboard.writeText(arUrl);
          alert('AR link copied to clipboard!');
        }
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxWidth: 500,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 1 }}>
        <QrCode2 sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="span" sx={{ flex: 1 }}>
          AR QR Code
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          {/* Product Name */}
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {productName}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Scan to view in Augmented Reality
          </Typography>

          {/* Warning if no 3D model */}
          {!model3DUrl && (
            <Alert severity="warning" sx={{ mb: 2, textAlign: 'left' }}>
              <Typography variant="caption">
                <strong>Demo Mode:</strong> This product doesn't have a 3D model yet. 
                The QR code will use a placeholder model for demonstration.
              </Typography>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* QR Code Canvas */}
          <Paper
            elevation={3}
            sx={{
              display: 'inline-block',
              p: 2,
              borderRadius: 2,
              mb: 2,
              backgroundColor: '#fff',
              minWidth: size + 40,
              minHeight: size + 40,
              position: 'relative',
            }}
          >
            {loading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <CircularProgress size={40} />
              </Box>
            )}
            <canvas 
              ref={canvasRef}
              width={size}
              height={size}
              style={{ 
                display: 'block',
                width: size,
                height: size,
                visibility: loading ? 'hidden' : 'visible',
              }} 
            />
          </Paper>

          {/* Instructions */}
          <Alert severity="info" sx={{ textAlign: 'left', mb: 2 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              📱 How to use:
            </Typography>
            <Typography variant="caption" component="div">
              1. Open your phone's camera<br />
              2. Point at the QR code<br />
              3. Tap the notification<br />
              4. View the product in AR!
            </Typography>
          </Alert>

          {/* Action Buttons */}
          {qrGenerated && (
            <Stack direction="row" spacing={1} justifyContent="center">
              <Tooltip title="Download QR Code">
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={handleDownload}
                  size="small"
                >
                  Download
                </Button>
              </Tooltip>

              <Tooltip title="Print QR Code">
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={handlePrint}
                  size="small"
                >
                  Print
                </Button>
              </Tooltip>

              <Tooltip title="Share">
                <Button
                  variant="outlined"
                  startIcon={<Share />}
                  onClick={handleShare}
                  size="small"
                >
                  Share
                </Button>
              </Tooltip>
            </Stack>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="text">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QRCodeGenerator;
