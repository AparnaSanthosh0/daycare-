import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Button, IconButton, Divider, Badge, Fade } from '@mui/material';
import { ShoppingCart as ShoppingCartIcon, Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const ShoppingCart = ({ isOpen = true, onClose = () => {} }) => {
  const navigate = useNavigate();
  const [cartItems] = useState([
    { id: 1, name: 'Sample Item', price: 19.99, quantity: 1 },
  ]);

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <Fade in={isOpen}>
      <Box sx={{ position: 'fixed', top: 0, right: 0, width: 360, height: '100vh', bgcolor: 'background.paper', boxShadow: 6, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge badgeContent={cartItems.reduce((s,i)=>s+i.quantity,0)} color="error">
              <ShoppingCartIcon />
            </Badge>
            <Typography variant="h6">Cart</Typography>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {cartItems.map(item => (
          <Card key={item.id} variant="outlined" sx={{ mb: 1 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography fontWeight={600}>{item.name}</Typography>
                <Typography variant="body2" color="text.secondary">Qty: {item.quantity}</Typography>
              </Box>
              <Typography>₹{(item.price * item.quantity).toFixed(2)}</Typography>
            </CardContent>
          </Card>
        ))}

        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography fontWeight={600}>Subtotal</Typography>
          <Typography fontWeight={700}>₹{subtotal.toFixed(2)}</Typography>
        </Box>
        <Button fullWidth variant="contained" color="success" onClick={() => navigate('/payment-demo', { state: { total: subtotal } })}>
          Proceed to Checkout
        </Button>
      </Box>
    </Fade>
  );
};

export default ShoppingCart;