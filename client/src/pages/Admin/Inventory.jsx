import React, { useEffect, useState, useCallback } from 'react';
import { Box, Paper, Typography, Grid, Stack, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Select, MenuItem, FormControl, InputLabel, Chip, Alert, Snackbar } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';
import DiscountManagement from '../../components/DiscountManagement';

export default function Inventory() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [vendorStock, setVendorStock] = useState(null);
  const [filters, setFilters] = useState({ productId: '', warehouseId: '', lowStock: false });
  const [stockFilters, setStockFilters] = useState({ 
    search: '', 
    vendor: '', 
    status: '', 
    category: '' 
  });
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
      const [wh, pr, vs] = await Promise.all([
        api.get('/api/inventory/warehouses'),
        api.get('/api/products'),
        api.get('/api/inventory/vendor-stock'),
      ]);
      setWarehouses(wh.data.warehouses || []);
      setProducts(pr.data.products || []);
      setVendorStock(vs.data);
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

      {/* Vendor Stock Overview */}
      {vendorStock && (
        <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #e3f2fd, #f3e5f5)' }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
            📊 Vendor Stock Overview
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: 1 }}>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                  {vendorStock.summary?.totalProducts || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Products
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: 1 }}>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                  {vendorStock.summary?.inStockProducts || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  In Stock
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: 1 }}>
                <Typography variant="h4" color="error.main" sx={{ fontWeight: 'bold' }}>
                  {vendorStock.summary?.outOfStockProducts || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Out of Stock
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: 1 }}>
                <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                  {vendorStock.summary?.totalVendors || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Vendors
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Vendor Stock Summary Table */}
          {vendorStock.vendorStockSummary && vendorStock.vendorStockSummary.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                📈 Vendor Stock Health
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Vendor</strong></TableCell>
                    <TableCell align="center"><strong>Total Products</strong></TableCell>
                    <TableCell align="center"><strong>In Stock</strong></TableCell>
                    <TableCell align="center"><strong>Out of Stock</strong></TableCell>
                    <TableCell align="center"><strong>Avg Price</strong></TableCell>
                    <TableCell align="center"><strong>Stock Health</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendorStock.vendorStockSummary.map((vendor, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {vendor.vendorName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {vendor.vendorEmail}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">{vendor.totalProducts}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={vendor.inStockProducts} 
                          color="success" 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={vendor.outOfStockProducts} 
                          color={vendor.outOfStockProducts > 0 ? "error" : "default"} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="center">₹{vendor.averagePrice?.toFixed(2) || 0}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={vendor.stockHealth?.replace('_', ' ').toUpperCase()} 
                          color={
                            vendor.stockHealth === 'excellent' ? 'success' : 
                            vendor.stockHealth === 'good' ? 'warning' : 'error'
                          } 
                          size="small" 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Item-by-Item Stock Details */}
          {vendorStock.detailedProducts && vendorStock.detailedProducts.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  📦 Item-by-Item Stock Details
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={() => setStockFilters({ search: '', vendor: '', status: '', category: '' })}
                  size="small"
                >
                  Clear Filters
                </Button>
              </Box>

              {/* Stock Filters */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Search Products"
                      value={stockFilters.search}
                      onChange={(e) => setStockFilters({ ...stockFilters, search: e.target.value })}
                      size="small"
                      fullWidth
                      placeholder="Search by name or description..."
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Vendor</InputLabel>
                      <Select
                        value={stockFilters.vendor}
                        onChange={(e) => setStockFilters({ ...stockFilters, vendor: e.target.value })}
                        label="Vendor"
                      >
                        <MenuItem value="">All Vendors</MenuItem>
                        {vendorStock.vendorStockSummary?.map((vendor, index) => (
                          <MenuItem key={index} value={vendor.vendorName}>
                            {vendor.vendorName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Stock Status</InputLabel>
                      <Select
                        value={stockFilters.status}
                        onChange={(e) => setStockFilters({ ...stockFilters, status: e.target.value })}
                        label="Stock Status"
                      >
                        <MenuItem value="">All Status</MenuItem>
                        <MenuItem value="good">Good Stock</MenuItem>
                        <MenuItem value="low">Low Stock</MenuItem>
                        <MenuItem value="out">Out of Stock</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={stockFilters.category}
                        onChange={(e) => setStockFilters({ ...stockFilters, category: e.target.value })}
                        label="Category"
                      >
                        <MenuItem value="">All Categories</MenuItem>
                        {Array.from(new Set(vendorStock.detailedProducts.map(p => p.category).filter(Boolean))).map(category => (
                          <MenuItem key={category} value={category}>
                            {category}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="body2" color="text.secondary">
                      Showing {vendorStock.detailedProducts.filter(product => {
                        const matchesSearch = !stockFilters.search || 
                          product.name.toLowerCase().includes(stockFilters.search.toLowerCase()) ||
                          product.description?.toLowerCase().includes(stockFilters.search.toLowerCase());
                        const matchesVendor = !stockFilters.vendor || product.vendor?.name === stockFilters.vendor;
                        const matchesStatus = !stockFilters.status || product.stockStatus === stockFilters.status;
                        const matchesCategory = !stockFilters.category || product.category === stockFilters.category;
                        return matchesSearch && matchesVendor && matchesStatus && matchesCategory;
                      }).length} of {vendorStock.detailedProducts.length} products
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Product</strong></TableCell>
                    <TableCell align="center"><strong>Vendor</strong></TableCell>
                    <TableCell align="center"><strong>Current Stock</strong></TableCell>
                    <TableCell align="center"><strong>Original Stock</strong></TableCell>
                    <TableCell align="center"><strong>Stock Change</strong></TableCell>
                    <TableCell align="center"><strong>Price</strong></TableCell>
                    <TableCell align="center"><strong>Status</strong></TableCell>
                    <TableCell align="center"><strong>Last Updated</strong></TableCell>
                    <TableCell align="center"><strong>Category</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendorStock.detailedProducts.filter(product => {
                    const matchesSearch = !stockFilters.search || 
                      product.name.toLowerCase().includes(stockFilters.search.toLowerCase()) ||
                      product.description?.toLowerCase().includes(stockFilters.search.toLowerCase());
                    const matchesVendor = !stockFilters.vendor || product.vendor?.name === stockFilters.vendor;
                    const matchesStatus = !stockFilters.status || product.stockStatus === stockFilters.status;
                    const matchesCategory = !stockFilters.category || product.category === stockFilters.category;
                    return matchesSearch && matchesVendor && matchesStatus && matchesCategory;
                  }).map((product, index) => (
                    <TableRow key={index} sx={{ 
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                      backgroundColor: product.stockStatus === 'out' ? 'rgba(244,67,54,0.05)' : 
                                     product.stockStatus === 'low' ? 'rgba(255,152,0,0.05)' : 'transparent'
                    }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {product.image && (
                            <Box
                              component="img"
                              src={product.image}
                              alt={product.name}
                              sx={{ 
                                width: 50, 
                                height: 50, 
                                borderRadius: 1, 
                                objectFit: 'cover',
                                border: '1px solid #e0e0e0'
                              }}
                            />
                          )}
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {product.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 200 }}>
                              {product.description?.substring(0, 60)}...
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {product.vendor?.name || 'No Vendor'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {product.vendor?.email || ''}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 'bold',
                            color: product.stockStatus === 'out' ? 'error.main' : 
                                   product.stockStatus === 'low' ? 'warning.main' : 'success.main'
                          }}>
                            {product.stock}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            current
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="h6" sx={{ 
                            fontWeight: 'bold',
                            color: 'primary.main'
                          }}>
                            {product.originalStock}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            original
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body1" sx={{ 
                            fontWeight: 'bold',
                            color: product.stockChange > 0 ? 'error.main' : 
                                   product.stockChange < 0 ? 'success.main' : 'text.secondary'
                          }}>
                            {product.stockChange > 0 ? `-${product.stockChange}` : 
                             product.stockChange < 0 ? `+${Math.abs(product.stockChange)}` : '0'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {product.stockChangePercentage > 0 ? `+${product.stockChangePercentage}%` : 
                             product.stockChangePercentage < 0 ? `${product.stockChangePercentage}%` : '0%'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          ₹{product.price}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={product.stockStatus?.toUpperCase()} 
                          color={
                            product.stockStatus === 'good' ? 'success' : 
                            product.stockStatus === 'low' ? 'warning' : 'error'
                          } 
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="caption">
                          {new Date(product.lastStockUpdate).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {new Date(product.lastStockUpdate).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={product.category || 'Uncategorized'} 
                          color="info" 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Vendor Stock Update History */}
          {vendorStock.detailedProducts && vendorStock.detailedProducts.some(p => p.vendorStockUpdates?.length > 0) && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                📈 Vendor Stock Update History
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Product</strong></TableCell>
                    <TableCell align="center"><strong>Vendor</strong></TableCell>
                    <TableCell align="center"><strong>Previous Stock</strong></TableCell>
                    <TableCell align="center"><strong>New Stock</strong></TableCell>
                    <TableCell align="center"><strong>Change</strong></TableCell>
                    <TableCell align="center"><strong>Reason</strong></TableCell>
                    <TableCell align="center"><strong>Updated At</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendorStock.detailedProducts
                    .filter(product => product.vendorStockUpdates?.length > 0)
                    .flatMap(product => 
                      product.vendorStockUpdates.slice(-3).map((update, index) => ({
                        product,
                        update,
                        key: `${product._id}-${index}`
                      }))
                    )
                    .sort((a, b) => new Date(b.update.updatedAt) - new Date(a.update.updatedAt))
                    .slice(0, 20)
                    .map(({ product, update, key }) => (
                    <TableRow key={key}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {product.image && (
                            <Box
                              component="img"
                              src={product.image}
                              alt={product.name}
                              sx={{ width: 30, height: 30, borderRadius: 1, objectFit: 'cover' }}
                            />
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {product.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {product.vendor?.name || 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {update.previousStock}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {update.newStock}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={update.newStock > update.previousStock ? 
                            `+${update.newStock - update.previousStock}` : 
                            `${update.newStock - update.previousStock}`
                          }
                          color={update.newStock > update.previousStock ? 'success' : 'error'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="caption">
                          {update.reason}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="caption">
                          {new Date(update.updatedAt).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {new Date(update.updatedAt).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {/* Recent Stock Movements */}
          {vendorStock.recentMovements && vendorStock.recentMovements.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                🔄 Recent Stock Movements
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Product</strong></TableCell>
                    <TableCell align="center"><strong>Type</strong></TableCell>
                    <TableCell align="center"><strong>Quantity</strong></TableCell>
                    <TableCell align="center"><strong>Performed By</strong></TableCell>
                    <TableCell align="center"><strong>Date</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendorStock.recentMovements.slice(0, 10).map((movement, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {movement.product?.image && (
                            <Box
                              component="img"
                              src={movement.product.image}
                              alt={movement.product.name}
                              sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover' }}
                            />
                          )}
                          <Typography variant="body2">
                            {movement.product?.name || 'Unknown Product'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={movement.type} 
                          color={movement.type === 'IN' ? 'success' : 'error'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="center">{movement.quantity}</TableCell>
                      <TableCell align="center">
                        {movement.performedBy?.firstName} {movement.performedBy?.lastName}
                      </TableCell>
                      <TableCell align="center">
                        {new Date(movement.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      )}

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

      {/* Discount Management Section */}
      <Box sx={{ mt: 4 }}>
        <DiscountManagement userRole={user?.role} />
      </Box>
    </Box>
    <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
        {success}
      </Alert>
    </Snackbar>
  </>
  );
}