import React from 'react';
import { Box, Container, Typography, Button, IconButton } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ArrowBackIosNew, ArrowForwardIos } from '@mui/icons-material';

const DEFAULT_SLIDES = [
  {
    image: 'https://i.ibb.co.com/2qVQx9D/Diwali-Background.jpg',
    title: 'Diwali Dhamaka',
    subtitle: 'Special Festival Offers for Kids',
    ctaText: 'Shop Now',
  },
  {
    image: 'https://images.unsplash.com/photo-1596461404969-9ae70e43a15b?q=80&w=1600&auto=format&fit=crop',
    title: 'New Season Arrivals',
    subtitle: 'Trendy outfits for kids',
    ctaText: 'Explore Fashion',
  },
  {
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1600&auto=format&fit=crop',
    title: 'Learning & Toys',
    subtitle: 'STEM kits, puzzles, games',
    ctaText: 'Discover Toys',
  },
  {
    image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=1600&auto=format&fit=crop',
    title: 'Nursery Essentials',
    subtitle: 'Decor, bedding and more',
    ctaText: 'Browse Nursery',
  },
];

export default function HeroCarousel({ slides = DEFAULT_SLIDES, height = { xs: 220, sm: 280, md: 360 }, onCtaClick, showLogin = false }) {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  const slide = slides[index] || {};

  return (
    <Box sx={{ position: 'relative', height, overflow: 'hidden', bgcolor: '#fdebd0' }}>
      <Box
        sx={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("${slide.image}")`,
          backgroundSize: slide.backgroundSize || 'cover',
          backgroundRepeat: slide.backgroundRepeat || 'no-repeat',
          backgroundPosition: slide.backgroundPosition || 'center',
          filter: slide.imageFilter !== undefined ? slide.imageFilter : 'contrast(1.05) saturate(1.05)'
        }}
      />
      {!slide.noBaseGradient && (
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.1) 100%)' }} />
      )}
      {/* Optional slide-specific overlay customization */}
      {slide.overlay === 'topBlur' && (
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.0) 40%)', backdropFilter: 'blur(6px)' }} />
      )}
      {slide.overlay === 'tint' && (
        <Box sx={{ position: 'absolute', inset: 0, background: slide.tintColor || 'rgba(255, 111, 0, 0.15)' }} />
      )}

      {/* Login Section for non-logged-in users */}
      {showLogin && (
        <Box sx={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              component={RouterLink}
              to="/customer-login"
              variant="outlined"
              sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'success.main', '&:hover': { bgcolor: 'white' } }}
            >
              Login
            </Button>
            <Button
              component={RouterLink}
              to="/customer-register"
              variant="contained"
              color="success"
              sx={{ bgcolor: 'success.main', color: 'white' }}
            >
              Sign Up
            </Button>
          </Box>
        </Box>
      )}

      <Container maxWidth="lg" sx={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
        <Box sx={{ color: 'white', maxWidth: 640 }}>
          <Typography variant="h3" fontWeight={900} sx={{ textShadow: '0 4px 20px rgba(0,0,0,.45)' }}>{slide.title}</Typography>
          <Typography variant="h6" sx={{ opacity: 0.98, mt: 1, mb: 2, textShadow: '0 3px 12px rgba(0,0,0,.4)' }}>{slide.subtitle}</Typography>
          {slide.ctaText && (
            slide.ctaLink ? (
              <Button
                component={RouterLink}
                to={slide.ctaLink}
                variant="contained"
                color="success"
                size="large"
              >
                {slide.ctaText}
              </Button>
            ) : (
              <Button variant="contained" color="success" size="large" onClick={() => onCtaClick?.(index)}>
                {slide.ctaText}
              </Button>
            )
          )}
        </Box>
      </Container>
      {/* Arrows */}
      <IconButton aria-label="prev" onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)} sx={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)', bgcolor: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'white' } }}>
        <ArrowBackIosNew fontSize="small" />
      </IconButton>
      <IconButton aria-label="next" onClick={() => setIndex((i) => (i + 1) % slides.length)} sx={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', bgcolor: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'white' } }}>
        <ArrowForwardIos fontSize="small" />
      </IconButton>
      {/* Dots */}
      <Box sx={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 1 }}>
        {slides.map((_, i) => (
          <Box
            key={i}
            onClick={() => setIndex(i)}
            sx={{ width: 10, height: 10, borderRadius: '50%', cursor: 'pointer', bgcolor: i === index ? 'white' : 'rgba(255,255,255,0.6)' }}
          />
        ))}
      </Box>
    </Box>
  );
}
