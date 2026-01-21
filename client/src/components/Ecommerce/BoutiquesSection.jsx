import React from 'react';
import { Box, Container, Grid, Card, CardContent, Typography, Chip } from '@mui/material';

/*
  BoutiquesSection
  - Displays a grid of curated boutique tiles with images and labels.
  - Accepts boutiques: [{ title, image, tag }]
*/

const DEFAULT_BOUTIQUES = [
  {
    title: 'Navyriti',
    tag: 'Special Collection',
    image: 'https://images.unsplash.com/photo-1600703130635-3fe3fa5365d0?q=80&w=1400&auto=format&fit=crop'
  },
  {
    title: 'Babyhug',
    tag: 'Powered by babyhug',
    image: 'https://images.unsplash.com/photo-1541534401786-2077eed87a98?q=80&w=1400&auto=format&fit=crop'
  },
  {
    title: 'Festive Footwear',
    tag: 'Premium',
    image: 'https://images.unsplash.com/photo-1582582429416-5b59ba63b30e?q=80&w=1400&auto=format&fit=crop'
  },
  {
    title: 'Nursery Decor',
    tag: 'New',
    image: 'https://images.unsplash.com/photo-1616486784571-6de7c6b31d1d?q=80&w=1400&auto=format&fit=crop'
  }
];

export default function BoutiquesSection({ title = 'Premium Boutiques', boutiques = DEFAULT_BOUTIQUES }) {
  return (
    <Box sx={{ backgroundColor: '#f5f7fa', py: 4, borderTop: '1px solid #eef2f7', borderBottom: '1px solid #eef2f7' }}>
      <Container maxWidth="lg">
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>{title}</Typography>
        <Grid container spacing={2}>
          {boutiques.map((b, i) => (
            <Grid item xs={12} sm={6} md={3} key={`${b.title}-${i}`}>
              <Card sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', transition: 'transform .25s ease, box-shadow .25s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 32px rgba(0,0,0,0.12)' } }}>
                <Box sx={{ position: 'relative', height: 160, bgcolor: '#eee' }}>
                  <Box
                    component="img"
                    src={b.image}
                    alt={b.title}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop'; }}
                    sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.45) 100%)' }} />
                  <Typography variant="subtitle1" sx={{ position: 'absolute', left: 12, bottom: 12, color: 'white', fontWeight: 800, textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>{b.title}</Typography>
                </Box>
                <CardContent sx={{ py: 1.25 }}>
                  {b.tag && <Chip size="small" label={b.tag} sx={{ fontWeight: 600 }} />}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
