import React from 'react';
import { Box, Button, Container } from '@mui/material';

const DEFAULT_CATEGORIES = [
  { key: 'all', label: 'All Categories' },
  { key: 'boy', label: 'Boy Fashion' },
  { key: 'girl', label: 'Girl Fashion' },
  { key: 'footwear', label: 'Footwear' },
  { key: 'toys', label: 'Toys' },
  { key: 'diapering', label: 'Diapering' },
  { key: 'gear', label: 'Gear' },
  { key: 'feeding', label: 'Feeding' },
  { key: 'baby care', label: 'Baby Care' },
  { key: 'bath', label: 'Bath' },
];

export default function CategoryBar({ categories = DEFAULT_CATEGORIES, selected, onSelect }) {
  return (
    <Box sx={{ bgcolor: '#f8f9fa', borderBottom: '1px solid #e0e0e0' }}>
      <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', overflowX: 'auto', gap: 1, py: 1.5 }}>
        {categories.map((c) => (
          <Button
            key={c.key}
            size="small"
            color={selected === c.key ? 'success' : 'inherit'}
            variant={selected === c.key ? 'contained' : 'text'}
            onClick={() => onSelect?.(c)}
            sx={{
              fontWeight: selected === c.key ? 700 : 500,
              whiteSpace: 'nowrap',
              borderRadius: '20px',
              px: 2,
              py: 1,
              textTransform: 'none',
              minWidth: 'auto',
              '&:hover': {
                bgcolor: selected === c.key ? '#2e7d32' : '#f5f5f5',
              }
            }}
          >
            {c.label}
          </Button>
        ))}
      </Container>
    </Box>
  );
}
