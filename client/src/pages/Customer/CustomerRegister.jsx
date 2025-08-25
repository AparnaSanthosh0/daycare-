import React, { useState } from 'react';
import { Box, Container, Typography, TextField, Button, Card, CardContent, Grid } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const CustomerRegister = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    address: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.address) return;

    setSubmitting(true);

    // Split name into first/last (fallback if single word)
    const [firstName, ...rest] = form.name.trim().split(' ');
    const lastName = rest.join(' ') || '-';

    const payload = {
      firstName,
      lastName,
      email: form.email,
      password: form.password,
      role: 'customer',
      address: { street: form.address }
    };

    const result = await register(payload);
    setSubmitting(false);

    if (result.success) {
      // After registration, send user back to cart or shop
      const from = location.state?.from;
      if (from === 'cart') {
        navigate('/shop');
      } else {
        navigate('/shop');
      }
    }
  };

  return (
    <Box sx={{ backgroundColor: '#f5f7fb', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: '16px', boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Customer Registration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your account to complete the purchase.
            </Typography>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Customer Name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    name="address"
                    multiline
                    minRows={3}
                    value={form.address}
                    onChange={handleChange}
                    required
                  />
                </Grid>
              </Grid>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={submitting}
                sx={{ mt: 3, borderRadius: '25px' }}
              >
                {submitting ? 'Registering...' : 'Register & Continue'}
              </Button>

              <Button
                fullWidth
                variant="text"
                sx={{ mt: 1 }}
                onClick={() => navigate('/shop')}
              >
                Cancel and go back to Shop
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default CustomerRegister;