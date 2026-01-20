import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Stack, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, Alert } from '@mui/material';
import { LocalOffer } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api, { API_BASE_URL } from '../../config/api';

const emptyForm = {
  name: '',
  price: '',
  category: '',
  description: '',
  image: '', // will be URL returned by upload
  imagePreview: '', // absolute URL for preview
  sizes: '', // comma-separated sizes
  inStock: true,
  stockQty: 0,
  isNew: false,
  isBestseller: false,
  isActive: true,
  imageFit: 'cover',
  imageFocalX: 50,
  imageFocalY: 50,
};

export default function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState(null); // selected product for edit
  
  // Discount suggestion states
  const [discountDialog, setDiscountDialog] = useState({ open: false, product: null });
  const [discountForm, setDiscountForm] = useState({
    discount: '',
    reason: '',
    startDate: '',
    endDate: ''
  });

  const load = async () => {
    try {
      const { data } = await api.get('/products', { params: { all: true } });
      setProducts(data.products || []);
    } catch (e) {
      toast.error('Failed to load products');
    }
  };

  // Helper: build absolute URL for an image path like /uploads/... using API_BASE_URL or window origin
  const toAbsoluteImageUrl = (maybePath) => {
    if (!maybePath) return '';
    if (typeof maybePath === 'string' && /^https?:\/\//i.test(maybePath)) return maybePath;
    let origin = API_BASE_URL.replace(/\/?api\/?$/i, '').replace(/\/$/, '');
    if (!/^https?:\/\//i.test(origin)) {
      if (typeof window !== 'undefined' && window.location?.origin) {
        origin = window.location.origin;
      }
    }
    const resource = String(maybePath).startsWith('/') ? String(maybePath) : `/${String(maybePath)}`;
    try {
      return new URL(resource, origin).href;
    } catch {
      return `${origin}${resource}`;
    }
  };

  useEffect(() => { load(); }, []);

  const uploadImage = async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    const { data } = await api.post('/products/upload', fd);
    // Return both relative and absolute forms
    return { url: data.url, absoluteUrl: data.absoluteUrl };
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
        stockQty: Number(form.stockQty || 0),
        sizes: (form.sizes || '').split(',').map(s => s.trim()).filter(Boolean)
      };
      const { data } = await api.post('/products', payload);
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

  const handleSuggestDiscount = async () => {
    if (!discountForm.discount || !discountForm.reason) {
      toast.error('Discount percentage and reason are required');
      return;
    }
    
    try {
      await api.post(`/api/products/${discountDialog.product._id}/suggest-discount`, {
        discount: parseFloat(discountForm.discount),
        reason: discountForm.reason,
        startDate: discountForm.startDate || undefined,
        endDate: discountForm.endDate || undefined
      });
      toast.success('Discount suggestion submitted for admin approval');
      setDiscountDialog({ open: false, product: null });
      setDiscountForm({ discount: '', reason: '', startDate: '', endDate: '' });
      load(); // Reload products to see updated status
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to suggest discount');
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
          <TextField fullWidth label="Sizes (comma separated)" placeholder="S,M,L or 200ml,500ml" value={form.sizes} onChange={e => setForm({ ...form, sizes: e.target.value })} />
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
                  const { url, absoluteUrl } = await uploadImage(file);
                  // Save relative for DB, absolute for preview
                  setForm((prev) => ({ ...prev, image: url, imagePreview: absoluteUrl || url }));
                  toast.success('Image uploaded');
                } catch (err) {
                  toast.error(err?.response?.data?.message || 'Upload failed');
                } finally {
                  setLoading(false);
                }
              }}
            />
          </Button>
          {(form.image || form.imagePreview) && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              {(() => {
                const abs = form.imagePreview || toAbsoluteImageUrl(form.image);
                return (
                  <a href={abs} target="_blank" rel="noreferrer" title="Open full image">
                    <img
                      src={abs}
                      alt="Product"
                      onError={(e)=>{ console.error('Preview image failed to load:', abs); e.currentTarget.style.opacity='0.3'; }}
                      style={{ height: 220, width: 220, objectFit: form.imageFit || 'cover', objectPosition: `${form.imageFocalX || 50}% ${form.imageFocalY || 50}%`, borderRadius: 6, border: '1px solid #ddd' }}
                    />
                  </a>
                );
              })()}
              <Typography variant="body2" sx={{ maxWidth: 420, wordBreak: 'break-all' }}>
                Uploaded: <a href={form.imagePreview || toAbsoluteImageUrl(form.image)} target="_blank" rel="noreferrer">{form.image || form.imagePreview}</a>
              </Typography>
              <Button size="small" color="error" onClick={() => setForm(prev => ({ ...prev, image: '', imagePreview: '' }))}>Remove</Button>
            </Stack>
          )}
        </Stack>
        {/* Image presentation options */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <TextField
            select
            SelectProps={{ native: true }}
            label="Image Fit"
            value={form.imageFit}
            onChange={e => setForm({ ...form, imageFit: e.target.value })}
          >
            {['cover','contain','fill','scale-down','none'].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </TextField>
          <TextField
            label="Focal X (%)"
            type="number"
            inputProps={{ min: 0, max: 100 }}
            value={form.imageFocalX}
            onChange={e => setForm({ ...form, imageFocalX: Math.max(0, Math.min(100, Number(e.target.value))) })}
          />
          <TextField
            label="Focal Y (%)"
            type="number"
            inputProps={{ min: 0, max: 100 }}
            value={form.imageFocalY}
            onChange={e => setForm({ ...form, imageFocalY: Math.max(0, Math.min(100, Number(e.target.value))) })}
          />
        </Stack>
        {/* Description */}
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
            <TableCell>Image</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Sizes</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products.map(p => (
            <TableRow key={p._id}>
              <TableCell>
                {(() => {
                  const srcRaw = p.image || (Array.isArray(p.images) && p.images.length ? p.images[0] : '');
                  const src = toAbsoluteImageUrl(srcRaw);
                  return srcRaw ? (
                    <a href={src} target="_blank" rel="noreferrer" title="Open image">
                      <img src={src} alt="thumb" style={{ height: 40, width: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }} onError={(e)=>{ console.error('Table thumb failed to load:', src); e.currentTarget.style.opacity='0.3'; }} />
                    </a>
                  ) : (
                    <span style={{ color: '#999' }}>No image</span>
                  );
                })()}
              </TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>₹ {p.price}</TableCell>
              <TableCell>{p.category}</TableCell>
              <TableCell>{Array.isArray(p.sizes) && p.sizes.length ? p.sizes.join(', ') : '-'}</TableCell>
              <TableCell>{p.isActive ? 'Active' : 'Inactive'}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button 
                    size="small" 
                    startIcon={<LocalOffer />}
                    onClick={() => {
                      setDiscountDialog({ open: true, product: p });
                    }}
                  >
                    Suggest Discount
                  </Button>
                  <Button size="small" onClick={() => {
                    const sizesStr = Array.isArray(p.sizes) ? p.sizes.join(', ') : '';
                    setEdit({ ...p, sizesStr });
                    setEditOpen(true);
                  }}>Edit</Button>
                  <Button size="small" variant="outlined" onClick={() => toggleActive(p)}>{p.isActive ? 'Deactivate' : 'Activate'}</Button>
                  <Button size="small" color="error" onClick={() => remove(p._id)}>Delete</Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Product Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Product</DialogTitle>
        <DialogContent dividers>
          {edit && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Name" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
              <TextField label="Price" type="number" value={edit.price} onChange={e => setEdit({ ...edit, price: e.target.value })} />
              <TextField label="Category" value={edit.category || ''} onChange={e => setEdit({ ...edit, category: e.target.value })} />
              <TextField label="Image URL" value={edit.image || ''} onChange={e => setEdit({ ...edit, image: e.target.value })} />
              <TextField label="Sizes (comma separated)" value={edit.sizesStr || ''} onChange={e => setEdit({ ...edit, sizesStr: e.target.value })} />
              <TextField label="Description" multiline minRows={3} value={edit.description || ''} onChange={e => setEdit({ ...edit, description: e.target.value })} />
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  select
                  SelectProps={{ native: true }}
                  label="Image Fit"
                  value={edit.imageFit || 'cover'}
                  onChange={e => setEdit({ ...edit, imageFit: e.target.value })}
                >
                  {['cover','contain','fill','scale-down','none'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </TextField>
                <TextField label="Focal X (%)" type="number" inputProps={{ min:0, max:100 }} value={edit.imageFocalX ?? 50} onChange={e => setEdit({ ...edit, imageFocalX: Math.max(0, Math.min(100, Number(e.target.value))) })} />
                <TextField label="Focal Y (%)" type="number" inputProps={{ min:0, max:100 }} value={edit.imageFocalY ?? 50} onChange={e => setEdit({ ...edit, imageFocalY: Math.max(0, Math.min(100, Number(e.target.value))) })} />
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Stock Qty" type="number" value={edit.stockQty ?? 0} onChange={e => setEdit({ ...edit, stockQty: e.target.value })} />
                <FormControlLabel control={<Switch checked={!!edit.inStock} onChange={e => setEdit({ ...edit, inStock: e.target.checked })} />} label="In Stock" />
                <FormControlLabel control={<Switch checked={!!edit.isNew} onChange={e => setEdit({ ...edit, isNew: e.target.checked })} />} label="New" />
                <FormControlLabel control={<Switch checked={!!edit.isBestseller} onChange={e => setEdit({ ...edit, isBestseller: e.target.checked })} />} label="Bestseller" />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={async () => {
            if (!edit) return;
            try {
              const updates = {
                name: edit.name,
                price: Number(edit.price),
                category: edit.category,
                image: edit.image || null,
                description: edit.description || '',
                stockQty: Number(edit.stockQty || 0),
                inStock: !!edit.inStock,
                isNew: !!edit.isNew,
                isBestseller: !!edit.isBestseller,
                imageFit: edit.imageFit || 'cover',
                imageFocalX: Number(edit.imageFocalX ?? 50),
                imageFocalY: Number(edit.imageFocalY ?? 50),
                sizes: (edit.sizesStr || '').split(',').map(s => s.trim()).filter(Boolean)
              };
              const { data } = await api.put(`/api/products/${edit._id}`, updates);
              setProducts(prev => prev.map(x => x._id === edit._id ? data.product : x));
              setEditOpen(false);
              toast.success('Product updated');
            } catch (err) {
              toast.error(err?.response?.data?.message || 'Update failed');
            }
          }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Suggest Discount Dialog */}
      <Dialog 
        open={discountDialog.open} 
        onClose={() => {
          setDiscountDialog({ open: false, product: null });
          setDiscountForm({ discount: '', reason: '', startDate: '', endDate: '' });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LocalOffer color="primary" />
            <Typography variant="h6">Suggest Discount</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {discountDialog.product && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Suggesting a discount for <strong>{discountDialog.product.name}</strong> (₹{discountDialog.product.price})
              </Alert>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField
                  label="Discount Percentage"
                  type="number"
                  inputProps={{ min: 0, max: 100 }}
                  value={discountForm.discount}
                  onChange={(e) => setDiscountForm({ ...discountForm, discount: e.target.value })}
                  helperText="Enter discount percentage (0-100)"
                  required
                />
                <TextField
                  label="Reason for Discount"
                  multiline
                  rows={3}
                  value={discountForm.reason}
                  onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })}
                  helperText="Explain why you're suggesting this discount"
                  required
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Start Date (Optional)"
                    type="date"
                    value={discountForm.startDate}
                    onChange={(e) => setDiscountForm({ ...discountForm, startDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="End Date (Optional)"
                    type="date"
                    value={discountForm.endDate}
                    onChange={(e) => setDiscountForm({ ...discountForm, endDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDiscountDialog({ open: false, product: null });
            setDiscountForm({ discount: '', reason: '', startDate: '', endDate: '' });
          }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            startIcon={<LocalOffer />}
            onClick={handleSuggestDiscount}
          >
            Submit Suggestion
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}