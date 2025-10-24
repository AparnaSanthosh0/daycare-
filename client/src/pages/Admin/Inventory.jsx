import React, { useEffect, useState, useCallback } from 'react';
import { Box, Paper, Typography, Grid, Stack, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Select, MenuItem, FormControl, InputLabel, Chip, Alert, Snackbar } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';

export default function Inventory() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [filters, setFilters] = useState({ productId: '', warehouseId: '', lowStock: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [whForm, setWhForm] = useState({ name: '', code: '' });
  const [itemForm, setItemForm] = useState({ product: '', warehouse: '', batchNo: '', quantity: 0, reorderPoint: 0, locationCode: '' });
  const [movementForm, setMovementForm] = useState({ product: '', warehouse: '', batchNo: '', type: 'IN', quantity: 1, reference: '' });

  const refreshLists = useCallback(async () => {
    try {
      const params = { ...filters };
      const [itemsRes, movesRes] = await Promise.all([
        api.get('/api/inventory/items', { params }),
        api.get('/api/inventory/movements', { params }),
      ]);
      setItems(itemsRes.data.items || []);
      setMovements(movesRes.data.movements || []);
    } catch (e) {
      console.error('Inventory refresh error:', e);
      setError(e?.response?.data?.message || 'Failed to load inventory lists');
    }
  }, [filters]);

  const loadAll = useCallback(async () => {
    try {
      const [wh, pr] = await Promise.all([
        api.get('/api/inventory/warehouses'),
        api.get('/api/products'),
      ]);
      setWarehouses(wh.data.warehouses || []);
      setProducts(pr.data.products || []);
      await refreshLists();
    } catch (e) {
      console.error('Inventory init error:', e);
      setError(e?.response?.data?.message || 'Failed to load inventory dependencies');
    }
  }, [refreshLists]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAll();
    }
  }, [user, loadAll]);

  

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Access denied. Admin only.</Typography>
      </Box>
    );
  }

  return (
    <>
    <Box sx={{ p: 3 }}>
      {!!error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Inventory & Warehouse Management</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={refreshLists}>Refresh</Button>
          <Button variant="contained" onClick={async () => {
            try {
              await api.post('/api/inventory/alerts/low-stock/send');
              setSuccess('Low stock alert email sent (if items found).');
              await refreshLists();
            } catch (e) {
              console.error('Low stock alert error:', e);
              setError(e?.response?.data?.message || 'Failed to send low stock alert');
            }
          }}>Send Low Stock Alert</Button>
        </Stack>
      </Stack>

      {/* Warehouses */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField label="Warehouse Name" value={whForm.name} onChange={e => setWhForm({ ...whForm, name: e.target.value })} />
          <TextField label="Code" value={whForm.code} onChange={e => setWhForm({ ...whForm, code: e.target.value })} />
          <Button variant="contained" onClick={async () => {
            try {
              if (!whForm.name || !whForm.code) {
                setError('Please enter Warehouse Name and Code');
                return;
              }
              await api.post('/api/inventory/warehouses', whForm);
              setWhForm({ name: '', code: '' });
              const { data } = await api.get('/api/inventory/warehouses');
              setWarehouses(data.warehouses || []);
              setSuccess('Warehouse added');
            } catch (e) {
              console.error('Add warehouse error:', e);
              setError(e?.response?.data?.message || 'Failed to add warehouse');
            }
          }}>Add Warehouse</Button>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
          {warehouses.map(w => (
            <Chip key={w._id} label={`${w.name} (${w.code})`} />
          ))}
        </Stack>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Product</InputLabel>
            <Select label="Product" value={filters.productId} onChange={e => setFilters({ ...filters, productId: e.target.value })}>
              <MenuItem value=""><em>All</em></MenuItem>
              {products.map(p => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Warehouse</InputLabel>
            <Select label="Warehouse" value={filters.warehouseId} onChange={e => setFilters({ ...filters, warehouseId: e.target.value })}>
              <MenuItem value=""><em>All</em></MenuItem>
              {warehouses.map(w => <MenuItem key={w._id} value={w._id}>{w.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Low Stock</InputLabel>
            <Select label="Low Stock" value={filters.lowStock ? 'true' : ''} onChange={e => setFilters({ ...filters, lowStock: e.target.value === 'true' })}>
              <MenuItem value=""><em>All</em></MenuItem>
              <MenuItem value={'true'}>Only Low Stock</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={refreshLists}>Apply</Button>
        </Stack>
      </Paper>

      {/* Upsert item */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Create/Update Inventory Item</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Product</InputLabel>
              <Select label="Product" value={itemForm.product} onChange={e => setItemForm({ ...itemForm, product: e.target.value })}>
                {products.map(p => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Warehouse</InputLabel>
              <Select label="Warehouse" value={itemForm.warehouse} onChange={e => setItemForm({ ...itemForm, warehouse: e.target.value })}>
                {warehouses.map(w => <MenuItem key={w._id} value={w._id}>{w.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField fullWidth label="Batch No" value={itemForm.batchNo} onChange={e => setItemForm({ ...itemForm, batchNo: e.target.value })} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField fullWidth label="Location" value={itemForm.locationCode} onChange={e => setItemForm({ ...itemForm, locationCode: e.target.value })} />
          </Grid>
          <Grid item xs={6} md={1}>
            <TextField fullWidth type="number" label="Qty" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })} />
          </Grid>
          <Grid item xs={6} md={1}>
            <TextField fullWidth type="number" label="Reorder" value={itemForm.reorderPoint} onChange={e => setItemForm({ ...itemForm, reorderPoint: e.target.value })} />
          </Grid>
        </Grid>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={async () => {
            try {
              const payload = { ...itemForm, quantity: Number(itemForm.quantity || 0), reorderPoint: Number(itemForm.reorderPoint || 0) };
              await api.post('/api/inventory/items', payload);
              setSuccess('Inventory item saved');
              await refreshLists();
            } catch (e) {
              console.error('Save item error:', e);
              setError(e?.response?.data?.message || 'Failed to save inventory item');
            }
          }}>Save Item</Button>
        </Stack>
      </Paper>

      {/* Movement */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Stock Movement</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Product</InputLabel>
              <Select label="Product" value={movementForm.product} onChange={e => setMovementForm({ ...movementForm, product: e.target.value })}>
                {products.map(p => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Warehouse</InputLabel>
              <Select label="Warehouse" value={movementForm.warehouse} onChange={e => setMovementForm({ ...movementForm, warehouse: e.target.value })}>
                {warehouses.map(w => <MenuItem key={w._id} value={w._id}>{w.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField fullWidth label="Batch No" value={movementForm.batchNo} onChange={e => setMovementForm({ ...movementForm, batchNo: e.target.value })} />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select label="Type" value={movementForm.type} onChange={e => setMovementForm({ ...movementForm, type: e.target.value })}>
                <MenuItem value={'IN'}>IN</MenuItem>
                <MenuItem value={'OUT'}>OUT</MenuItem>
                <MenuItem value={'ADJUST'}>ADJUST</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField fullWidth type="number" label="Qty" value={movementForm.quantity} onChange={e => setMovementForm({ ...movementForm, quantity: Number(e.target.value || 0) })} />
          </Grid>
        </Grid>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={async () => {
            try {
              await api.post('/api/inventory/movements', movementForm);
              setSuccess('Movement recorded');
              await refreshLists();
            } catch (e) {
              console.error('Record movement error:', e);
              setError(e?.response?.data?.message || 'Failed to record movement');
            }
          }}>Record Movement</Button>
        </Stack>
      </Paper>

      {/* Items table */}
      <Typography variant="h6" sx={{ mb: 1 }}>Inventory Items</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Warehouse</TableCell>
            <TableCell>Batch</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Qty</TableCell>
            <TableCell>Reorder</TableCell>
            <TableCell>Alert</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((it) => (
            <TableRow key={it._id}>
              <TableCell>{it.product?.name}</TableCell>
              <TableCell>{it.product?.category}</TableCell>
              <TableCell>{it.warehouse?.name}</TableCell>
              <TableCell>{it.batchNo || '-'}</TableCell>
              <TableCell>{it.locationCode || '-'}</TableCell>
              <TableCell>{it.quantity}</TableCell>
              <TableCell>{it.reorderPoint}</TableCell>
              <TableCell>{it.quantity < it.reorderPoint ? <Chip label="Low" color="warning" size="small" /> : '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Movements table */}
      <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>Recent Movements</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>When</TableCell>
            <TableCell>Product</TableCell>
            <TableCell>Warehouse</TableCell>
            <TableCell>Batch</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Qty</TableCell>
            <TableCell>Ref</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {movements.map(m => (
            <TableRow key={m._id}>
              <TableCell>{new Date(m.createdAt).toLocaleString()}</TableCell>
              <TableCell>{m.product?.name}</TableCell>
              <TableCell>{m.warehouse?.name}</TableCell>
              <TableCell>{m.batchNo || '-'}</TableCell>
              <TableCell>{m.type}</TableCell>
              <TableCell>{m.quantity}</TableCell>
              <TableCell>{m.reference || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
    <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
        {success}
      </Alert>
    </Snackbar>
  </>
  );
}