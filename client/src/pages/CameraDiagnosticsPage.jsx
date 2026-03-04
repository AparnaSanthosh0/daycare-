import React from 'react';
import { Container, Box, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import CameraDiagnostics from '../components/AR/CameraDiagnostics';

/**
 * CameraDiagnosticsPage
 * 
 * Standalone page for camera troubleshooting
 * Accessible at /camera-diagnostics
 */
const CameraDiagnosticsPage = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 3 }}>
          <Button 
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            variant="outlined"
          >
            Back
          </Button>
        </Box>
        
        <CameraDiagnostics />
      </Container>
    </Box>
  );
};

export default CameraDiagnosticsPage;
