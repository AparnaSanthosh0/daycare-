import React from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, CardMedia, Button, Chip } from '@mui/material';
import { LocationOn, Phone, AccessTime, Star } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const storesData = [
  {
    id: 1,
    name: "TinyTots Mumbai Central",
    address: "123 MG Road, Mumbai Central, Mumbai - 400001",
    phone: "+91 22 1234 5678",
    hours: "Mon-Sat: 10:00 AM - 8:00 PM, Sun: 11:00 AM - 6:00 PM",
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1556909114-8b764dd9b3ad?w=400&h=250&fit=crop",
    description: "Our flagship store in Mumbai Central offering the complete range of baby products and expert consultation."
  },
  {
    id: 2,
    name: "TinyTots Andheri West",
    address: "456 Lokhandwala Complex, Andheri West, Mumbai - 400053",
    phone: "+91 22 2345 6789",
    hours: "Mon-Sat: 10:00 AM - 8:00 PM, Sun: 11:00 AM - 6:00 PM",
    rating: 4.3,
    image: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400&h=250&fit=crop",
    description: "Modern store with dedicated sections for fashion, toys, and nursery essentials."
  },
  {
    id: 3,
    name: "TinyTots Preschool & Store",
    address: "789 Bandra Linking Road, Bandra West, Mumbai - 400050",
    phone: "+91 22 3456 7890",
    hours: "Mon-Fri: 9:00 AM - 7:00 PM, Sat: 10:00 AM - 6:00 PM",
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=250&fit=crop",
    description: "Combined preschool and retail store offering educational toys and learning materials."
  },
  {
    id: 4,
    name: "TinyTots Powai",
    address: "321 Hiranandani Gardens, Powai, Mumbai - 400076",
    phone: "+91 22 4567 8901",
    hours: "Mon-Sat: 10:00 AM - 8:00 PM, Sun: 11:00 AM - 6:00 PM",
    rating: 4.4,
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=250&fit=crop",
    description: "Tech-savvy store with modern amenities and wide selection of international brands."
  }
];

export default function Stores() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Stores & Preschools</Typography>
        <Typography variant="body1" color="text.secondary">
          Visit our stores across Mumbai for personalized shopping experience and expert advice
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {storesData.map((store) => (
          <Grid item xs={12} md={6} key={store.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardMedia
                component="img"
                height="200"
                image={store.image}
                alt={store.name}
                onError={(e) => { e.currentTarget.src = '/logo192.svg'; }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h6" gutterBottom>{store.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Star sx={{ color: '#ffc107', fontSize: 16 }} />
                    <Typography variant="body2" sx={{ ml: 0.5 }}>
                      {store.rating}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {store.description}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                  <LocationOn sx={{ color: 'error.main', fontSize: 16, mt: 0.3 }} />
                  <Typography variant="body2">{store.address}</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Phone sx={{ color: 'success.main', fontSize: 16 }} />
                  <Typography variant="body2">{store.phone}</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                  <AccessTime sx={{ color: 'info.main', fontSize: 16, mt: 0.3 }} />
                  <Typography variant="body2">{store.hours}</Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label="In-Store Shopping" size="small" color="primary" />
                  <Chip label="Expert Consultation" size="small" color="success" />
                  <Chip label="Gift Wrapping" size="small" color="warning" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>Store Services</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>🛍️ In-Store Shopping</Typography>
            <Typography variant="body2" color="text.secondary">
              Browse our complete collection with personalized assistance from our expert staff.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>👶 Expert Consultation</Typography>
            <Typography variant="body2" color="text.secondary">
              Get professional advice on baby products, sizes, and developmental needs.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>🎁 Gift Services</Typography>
            <Typography variant="body2" color="text.secondary">
              Professional gift wrapping and personalized gift recommendations for special occasions.
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="success"
          size="large"
          onClick={() => navigate('/shop')}
        >
          Continue Shopping Online
        </Button>
      </Box>
    </Container>
  );
}
