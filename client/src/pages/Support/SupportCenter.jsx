import React from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import {
  ExpandMore,
  LocalShipping,
  Replay,
  AssignmentReturn,
  Inventory,
  HelpOutline,
  PersonOutline,
  QuestionAnswer,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const categories = [
  { key: 'orders', label: 'Order Information', icon: <Inventory /> },
  { key: 'returns', label: 'Return, Replacement & Exchange', icon: <AssignmentReturn /> },
  { key: 'delivery', label: 'Delivery / Pickup', icon: <LocalShipping /> },
  { key: 'cancellation', label: 'Cancellation / Modify', icon: <Replay /> },
  { key: 'refunds', label: 'Refunds', icon: <Replay /> },
  { key: 'coupons', label: 'Coupons / Club Cash', icon: <QuestionAnswer /> },
  { key: 'account', label: 'Manage Your Account', icon: <PersonOutline /> },
  { key: 'other', label: 'Other Queries', icon: <HelpOutline /> },
  { key: 'contact', label: 'Contact Details', icon: <HelpOutline /> },
];

const faqs = {
  orders: [
    { q: 'What is the status of my order? How can I check the status of my order?', a: 'Go to Track Order from the header or customer dashboard. You can view live status, estimated delivery and invoice.' },
    { q: 'How do I know if my order is confirmed?', a: 'You will receive an email/SMS confirmation after payment is successful. The status will show as Confirmed.' },
    { q: 'How do I track my order?', a: 'Use Track Order with your order number or login to see all your orders.' },
  ],
  returns: [
    { q: 'What is the return policy?', a: '7-day return or exchange for unused, unwashed items with tags. Some items may be non-returnable.' },
    { q: 'How do I raise a return/exchange?', a: 'Go to Orders in your account, select the item and choose Return/Exchange. Follow the on-screen steps.' },
  ],
  delivery: [
    { q: 'Can I modify delivery address?', a: 'Address can be modified before the order is shipped. Contact support or cancel and reorder if shipped.' },
    { q: 'Do you deliver outside India?', a: 'Currently we deliver within India. International shipping is not supported yet.' },
  ],
  cancellation: [
    { q: 'How do I cancel my order?', a: 'You can cancel before the order is shipped from Orders page. Once shipped, cancellation is unavailable.' },
  ],
  refunds: [
    { q: 'How long do refunds take?', a: 'Refunds are initiated within 48 hours after pickup/approval and may take 5-7 business days to reflect.' },
  ],
  coupons: [
    { q: 'How do I apply coupons?', a: 'You can apply coupons on the cart/checkout page before making payment. Terms apply.' },
  ],
  account: [
    { q: 'How do I update my profile?', a: 'Go to Profile from the user menu and update your details.' },
  ],
  other: [
    { q: 'What is the shipping cost?', a: 'Shipping cost is shown at checkout and may vary by pincode and weight. Free shipping offers may apply.' },
  ],
  contact: [
    { q: 'How do I contact support?', a: 'Email help@tinytots.com or call +91-99999-99999 (10AM-6PM IST). For order queries, use Track Order.' },
  ],
};

export default function SupportCenter() {
  const [active, setActive] = React.useState('orders');
  const navigate = useNavigate();
  const { user } = useAuth();

  const onManageOrders = () => {
    if (user) navigate('/customer');
    else navigate('/customer-login', { state: { redirectTo: '/customer' } });
  };

  const list = faqs[active] || [];

  return (
    <Box sx={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Contact us</Typography>
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>Manage Your Order</Typography>
              <Typography variant="body2" color="text.secondary">Track, Return, Cancel, View order details</Typography>
            </Box>
            <Button variant="contained" onClick={onManageOrders}>{user ? 'Go to My Orders' : 'Login'}</Button>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card variant="outlined">
              <List sx={{ p: 0 }}>
                {categories.map((c) => (
                  <ListItemButton key={c.key} selected={active === c.key} onClick={() => setActive(c.key)}>
                    <ListItemIcon sx={{ minWidth: 36 }}>{c.icon}</ListItemIcon>
                    <ListItemText primaryTypographyProps={{ fontWeight: active === c.key ? 700 : 500 }} primary={c.label} />
                  </ListItemButton>
                ))}
              </List>
            </Card>
          </Grid>
          <Grid item xs={12} md={9}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6" fontWeight={800}>{categories.find(c => c.key === active)?.label || 'Help'}</Typography>
                  <Chip size="small" label={`${list.length} topics`} />
                </Box>
                <Divider sx={{ my: 1.5 }} />
                {list.map((item, idx) => (
                  <Accordion key={idx} disableGutters>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography fontWeight={600}>{item.q}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary">{item.a}</Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
                {list.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No help topics available.</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Footer banner */}
      <Box
        sx={{
          py: 4,
          background: 'linear-gradient(180deg, #f0fbff 0%, #dff6ff 100%)',
          borderTop: '1px solid #e5f3ff',
        }}
      >
        <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box
            sx={{
              px: 3,
              py: 1,
              bgcolor: 'white',
              borderRadius: 999,
              boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
              border: '1px solid #ffe6c7',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                color: '#ff7a00',
                letterSpacing: 0.5,
                textTransform: 'lowercase',
              }}
            >
              big store for little ones
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
