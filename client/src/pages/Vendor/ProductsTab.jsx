import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Stack, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Switch, FormControlLabel } from '@mui/material';
import { toast } from 'react-toastify';
import api from '../../config/api';

const emptyForm = {
  name: '',
  price: '',
  category: '',
  description: '',
  image: '', // will be URL returned by upload
  inStock: true,
  stockQty: 0,
  isNew: false,
  isBestseller: false,
  isActive: true,
};

export default function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/api/products');
      setProducts(data.products || []);
    } catch (e) {
      toast.error('Failed to load products');
    }
  };

  useEffect(() => { load(); }, []);

  const uploadImage = async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    const { data } = await api.post('/api/products/upload', fd);
    return data.url; // '/uploads/products/...'
  };

  const create = async () => {
    if (!form.name || !form.price) {
      toast.error('Name and price are required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stockQty: Number(form.stockQty || 0)
      };
      const { data } = await api.post('/api/products', payload);
      setProducts(prev => [data.product, ...prev]);
      setForm(emptyForm);
      toast.success('Product created');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Create failed');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete product?')) return;
    try {
      await api.delete(`/api/products/${id}`);
      setProducts(prev => prev.filter(p => p._id !== id));
      toast.success('Product deleted');
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const toggleActive = async (p) => {
    try {
      const { data } = await api.put(`/api/products/${p._id}`, { isActive: !p.isActive });
      setProducts(prev => prev.map(x => x._id === p._id ? data.product : x));
    } catch (e) {
      toast.error('Update failed');
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Add Product</Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <TextField label="Price" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
          <TextField label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
          <TextField label="Image URL (optional)" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <Button variant="outlined" component="label">
            Upload Image
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setLoading(true);
                  const url = await uploadImage(file);
                  setForm((prev) => ({ ...prev, image: url }));
                  toast.success('Image uploaded');
                } catch (err) {
                  toast.error(err?.response?.data?.message || 'Upload failed');
                } finally {
                  setLoading(false);
                }
              }}
            />
          </Button>
          {form.image && (
            <Typography variant="body2" sx={{ alignSelf: 'center' }}>Uploaded: {form.image}</Typography>
          )}
        </Stack>
        <TextField sx={{ mt: 2 }} fullWidth label="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <TextField label="Stock Qty" type="number" value={form.stockQty} onChange={e => setForm({ ...form, stockQty: e.target.value })} />
          <FormControlLabel control={<Switch checked={form.inStock} onChange={e => setForm({ ...form, inStock: e.target.checked })} />} label="In Stock" />
          <FormControlLabel control={<Switch checked={form.isNew} onChange={e => setForm({ ...form, isNew: e.target.checked })} />} label="New" />
          <FormControlLabel control={<Switch checked={form.isBestseller} onChange={e => setForm({ ...form, isBestseller: e.target.checked })} />} label="Bestseller" />
        </Stack>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="contained" disabled={loading} onClick={create}>Create</Button>
          <Button variant="outlined" onClick={() => setForm(emptyForm)}>Reset</Button>
        </Stack>
      </Paper>

      <Typography variant="h6" sx={{ mb: 1 }}>Products</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map(p => (
            <TableRow key={p._id}>
              <TableCell>{p.name}</TableCell>
              <TableCell>₹ {p.price}</TableCell>
              <TableCell>{p.category}</TableCell>
              <TableCell>{p.isActive ? 'Active' : 'Inactive'}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" variant="outlined" onClick={() => toggleActive(p)}>{p.isActive ? 'Deactivate' : 'Activate'}</Button>
                  <Button size="small" color="error" onClick={() => remove(p._id)}>Delete</Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}