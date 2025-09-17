import React from 'react';
import { Box, Container, Grid, Typography, Paper, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

export default function Curriculum() {
  const navigate = useNavigate();

  const cards = [
    { img: '/curriculum/cir.png', text: 'Hands-on, play-based exploration builds curiosity and confidence.' },
    { img: '/landing/tt.jpg', text: 'Problem‑solving and projects turn everyday moments into learning.' },
    { img: '/landing/lll.jpg', text: 'Creativity and collaboration nurture communication and joyful growth.' },
  ];

  return (
    <Box sx={{ py: 6, background: '#f4fbfd', minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ textTransform: 'none', color: 'text.primary' }}
          >
            Back
          </Button>
        </Box>
        <Typography variant="h3" fontWeight={800} textAlign="center" gutterBottom>
          Our Curriculum
        </Typography>
        <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
          A discovery-driven approach that brings learning to life.
        </Typography>

        <Grid container spacing={3}>
          {cards.map((c, idx) => (
            <Grid item xs={12} md={4} key={idx}>
              <Paper sx={{ position: 'relative', height: 260, borderRadius: 2, overflow: 'hidden', boxShadow: 3 }}>
                <Box component="img" src={c.img} alt="Curriculum" sx={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7)' }} />
                <Box sx={{ position: 'absolute', top: 12, left: 12, right: 12, color: 'white', fontWeight: 700 }}>
                  <Typography variant="subtitle1" sx={{ lineHeight: 1.3 }}>{c.text}</Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}