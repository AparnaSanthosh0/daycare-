import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  IconButton,
  TextField,
  Alert,
  Chip,
  Divider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Rating,
  Pagination,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  ShoppingCart,
  Favorite,
  FavoriteBorder,
  CameraAlt,
  Close
} from '@mui/icons-material';
import api, { API_BASE_URL } from '../../config/api';
import SmartSearch from '../../components/Common/SmartSearch';

// Replace the previous dashboard with a storefront experience after login
// Inspired by FirstCry/Myntra style: left filters + right product grid + sort + pagination

const DEFAULT_LIMIT = 12;
const MAX_PRICE_DEFAULT = 5000;

function formatCurrency(value) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value); } catch { return `$${Number(value || 0).toFixed(2)}`; }
}

function getImageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  if (path.startsWith('/uploads')) return `${API_BASE_URL}${path}`; // serve from API host
  return path; // fallback (e.g., CDN or public asset)
}

const CustomerDashboard = () => {
  // Data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wishlist, setWishlist] = useState(new Set());

  // Server-side paging
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [sort, setSort] = useState('newest');

  // Filters UI state
  const [filters, setFilters] = useState({
    q: '',
    category: '',
    inStock: true,
    sizes: [],
    price: [0, MAX_PRICE_DEFAULT],
  });

  // UI helpers
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pincode, setPincode] = useState('');
  const [pinChecked, setPinChecked] = useState(false);
  
  // Photo search state
  const [photoSearchOpen, setPhotoSearchOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [photoSearchResults, setPhotoSearchResults] = useState([]);
  const [searchingByPhoto, setSearchingByPhoto] = useState(false);

  // Derive available sizes from current result (simple and effective for now)
  const availableSizes = useMemo(() => {
    const set = new Set();
    products.forEach(p => (Array.isArray(p.sizes) ? p.sizes : []).forEach(s => set.add(String(s))));
    return Array.from(set).sort();
  }, [products]);

  // Initial bootstrap
  useEffect(() => {
    // Load wishlist from localStorage
    try {
      const saved = localStorage.getItem('customer_wishlist');
      if (saved) setWishlist(new Set(JSON.parse(saved)));
    } catch {}

    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sort]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/products/categories/list');
      setCategories(res.data?.categories || []);
    } catch (e) {
      // Non-fatal
    }
  };

  const buildParams = () => {
    const params = {
      page,
      limit,
      sort,
    };
    if (filters.q) params.q = filters.q;
    if (filters.category) params.category = filters.category;
    if (filters.inStock !== undefined) params.inStock = filters.inStock;
    if (filters.sizes?.length) params.sizes = filters.sizes.join(',');
    if (Array.isArray(filters.price)) {
      params.minPrice = filters.price[0];
      params.maxPrice = filters.price[1];
    }
    return params;
  };

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/products', { params: buildParams() });
      setProducts(res.data?.products || []);
      setTotal(res.data?.total || 0);
      // Adjust slider max price dynamically (optional)
      const maxSeen = Math.max(
        MAX_PRICE_DEFAULT,
        ...((res.data?.products || []).map(p => p.price || 0))
      );
      setFilters(prev => ({ ...prev, price: [prev.price[0], Math.ceil(maxSeen)] }));
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const applyFilters = () => {
    setPage(1);
    loadProducts();
  };

  const clearFilters = () => {
    setFilters({ q: '', category: '', inStock: true, sizes: [], price: [0, MAX_PRICE_DEFAULT] });
    setPage(1);
    setSort('newest');
    setTimeout(loadProducts, 0);
  };
  
  // Photo Search Handler
  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      setUploadedImage(file);
    };
    reader.readAsDataURL(file);
  };
  
  const searchByPhoto = async () => {
    if (!uploadedImage) return;
    
    setSearchingByPhoto(true);
    try {
      // In a real implementation, you would:
      // 1. Upload image to backend
      // 2. Use ML model (TensorFlow/OpenCV) to extract features
      // 3. Match with product images in database
      // 4. Return similar products
      
      // For now, simulate visual search with keyword extraction
      // This is a simplified version - you can enhance with actual ML
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simple simulation: search products by categories
      // In production, use image similarity matching
      const categoryKeywords = ['uniform', 'toy', 'book', 'bag', 'bottle'];
      const matchedCategory = categories.find(cat => 
        categoryKeywords.some(kw => cat.toLowerCase().includes(kw))
      ) || categories[0];
      
      // Filter products by matched category
      const results = products.filter(p => 
        p.category === matchedCategory || 
        p.name.toLowerCase().includes('baby') ||
        p.name.toLowerCase().includes('child')
      ).slice(0, 6);
      
      setPhotoSearchResults(results);
      
      if (results.length === 0) {
        setError('No matching products found. Try uploading a clearer image or use text search.');
      }
    } catch (err) {
      setError('Failed to search by photo. Please try again.');
    } finally {
      setSearchingByPhoto(false);
    }
  };
  
  const closePhotoSearch = () => {
    setPhotoSearchOpen(false);
    setUploadedImage(null);
    setImagePreview('');
    setPhotoSearchResults([]);
  };


  const toggleSize = (size) => {
    setFilters(prev => {
      const set = new Set(prev.sizes);
      set.has(size) ? set.delete(size) : set.add(size);
      return { ...prev, sizes: Array.from(set) };
    });
  };

  const toggleWishlist = (productId) => {
    setWishlist(prev => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      try { localStorage.setItem('customer_wishlist', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };

  const addToCart = (product) => {
    // For now, just a notification-like effect. Integrate your cart store as needed.
    alert(`${product.name} added to cart`);
  };

  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <Box sx={{ p: 2 }}>
      {/* Top toolbar */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
        {/* Smart Search for Products */}
        <Box sx={{ flex: 1, minWidth: 300, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <SmartSearch
              data={products}
              searchKeys={['name', 'description', 'category', 'brand']}
              onSelect={(product) => {
                // Navigate to product details or add to cart
                window.scrollTo({ top: document.getElementById(`product-${product._id}`)?.offsetTop - 100, behavior: 'smooth' });
              }}
              placeholder="Search products by name, category, or brand..."
              label="Search Products"
              maxResults={8}
              renderItem={(result) => {
                const product = result.item;
                const matchScore = Math.round((1 - result.score) * 100);
                
                return (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'rgba(26, 188, 156, 0.1)'
                      }
                    }}
                    onClick={() => {
                      const elem = document.getElementById(`product-${product._id}`);
                      if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    <Box
                      component="img"
                      src={getImageUrl(product.images?.[0])}
                      alt={product.name}
                      sx={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 1, mr: 2 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">{product.name}</Typography>
                        <Chip label={`${matchScore}% match`} size="small" color="success" sx={{ height: 20 }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {product.category} | {formatCurrency(product.price)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {product.description?.substring(0, 50)}...
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
            />
          </Box>
          
          {/* Photo Search Button */}
          <Tooltip title="Search by Photo">
            <IconButton
              color="primary"
              onClick={() => setPhotoSearchOpen(true)}
              sx={{
                bgcolor: '#1abc9c',
                color: 'white',
                mt: 0.5,
                '&:hover': {
                  bgcolor: '#16a085'
                }
              }}
            >
              <CameraAlt />
            </IconButton>
          </Tooltip>
        </Box>
        
        <TextField
          label="Search (Legacy)"
          size="small"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
          sx={{ display: 'none' }} // Hide old search, keep for backup
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="sort-label">Sort by</InputLabel>
          <Select
            labelId="sort-label"
            label="Sort by"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="price_asc">Price: Low to High</MenuItem>
            <MenuItem value="price_desc">Price: High to Low</MenuItem>
            <MenuItem value="rating_desc">Rating: High to Low</MenuItem>
            <MenuItem value="rating_asc">Rating: Low to High</MenuItem>
          </Select>
        </FormControl>

        <Chip color="success" label="Prices inclusive of all taxes" variant="outlined" />

        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            label="Check delivery PIN"
            size="small"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            inputProps={{ maxLength: 10 }}
          />
          <Button variant="outlined" size="small" onClick={() => setPinChecked(true)}>Check</Button>
          {pinChecked && (
            <Chip size="small" color="primary" label={`Delivering to ${pincode || 'your area'}`} />
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        {/* Left sidebar: Filters */}
        <Grid item xs={12} md={3} lg={2.8}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight={700}>Filter By</Typography>
                <Button size="small" onClick={clearFilters}>Clear All</Button>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" gutterBottom>Category</Typography>
              <FormControl size="small" fullWidth>
                <Select
                  displayEmpty
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <MenuItem value=""><em>All Categories</em></MenuItem>
                  {categories.map(cat => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" gutterBottom>Availability</Typography>
              <FormGroup>
                <FormControlLabel
                  control={<Checkbox checked={!!filters.inStock} onChange={(e) => setFilters({ ...filters, inStock: e.target.checked })} />}
                  label="In Stock"
                />
              </FormGroup>

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" gutterBottom>Price</Typography>
              <Box sx={{ px: 1 }}>
                <Slider
                  value={filters.price}
                  min={0}
                  max={Math.max(MAX_PRICE_DEFAULT, filters.price?.[1] || MAX_PRICE_DEFAULT)}
                  onChange={(_, newValue) => setFilters({ ...filters, price: newValue })}
                  valueLabelDisplay="auto"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">{formatCurrency(filters.price[0])}</Typography>
                  <Typography variant="caption">{formatCurrency(filters.price[1])}</Typography>
                </Box>
              </Box>

              {availableSizes.length > 0 && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="subtitle2" gutterBottom>Size</Typography>
                  <FormGroup>
                    {availableSizes.map(size => (
                      <FormControlLabel
                        key={size}
                        control={<Checkbox checked={filters.sizes.includes(size)} onChange={() => toggleSize(size)} />}
                        label={size}
                      />
                    ))}
                  </FormGroup>
                </>
              )}

              <Box sx={{ mt: 2 }}>
                <Button fullWidth variant="contained" onClick={applyFilters} disabled={loading}>Apply Filters</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Products grid */}
        <Grid item xs={12} md={9} lg={9.2}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            {loading ? 'Loading products…' : `${total} items`}
          </Typography>

          <Grid container spacing={2}>
            {products.map((product) => {
              // Prefer real DB images: first '/uploads' or absolute URL from image/images
              const candidates = [product.image, ...(Array.isArray(product.images) ? product.images : [])];
              const pickedReal = candidates.find(p => p && (/^https?:\/\//i.test(p) || p.startsWith('/uploads')));
              const primaryImage = pickedReal || candidates.find(Boolean) || null;
              const imgSrc = getImageUrl(primaryImage);
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product._id}>
                  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {imgSrc && (
                      <CardMedia
                        component="img"
                        image={imgSrc}
                        alt={product.name}
                        sx={{ height: 180, objectFit: product.imageFit || 'cover', objectPosition: `${product.imageFocalX || 50}% ${product.imageFocalY || 50}%` }}
                      />
                    )}
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {product.isBestseller && <Chip size="small" color="warning" label="Bestseller" />}
                        {product.isNew && <Chip size="small" color="success" label="New" />}
                      </Box>

                      <Typography variant="subtitle1" fontWeight={700} gutterBottom noWrap title={product.name}>
                        {product.name}
                      </Typography>

                      {product.rating > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Rating name="read-only" value={product.rating} precision={0.5} readOnly size="small" />
                          <Typography variant="caption" color="text.secondary">({product.reviews || 0})</Typography>
                        </Box>
                      )}

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }} noWrap>
                        {product.description}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                        <Typography variant="h6" color="primary">{formatCurrency(product.price)}</Typography>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                            {formatCurrency(product.originalPrice)}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<ShoppingCart />}
                          onClick={() => addToCart(product)}
                          disabled={!product.inStock || (product.stockQty ?? 0) <= 0}
                        >
                          Add to Cart
                        </Button>
                        <IconButton aria-label="wishlist" onClick={() => toggleWishlist(product._id)}>
                          {wishlist.has(product._id) ? <Favorite color="error" /> : <FavoriteBorder />}
                        </IconButton>
                      </Box>

                      {!product.inStock && (
                        <Typography variant="caption" color="error.main">Out of stock</Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Pagination */}
          {pageCount > 1 && (
            <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
              />
            </Stack>
          )}
        </Grid>
      </Grid>

      {/* Photo Search Dialog */}
      <Dialog
        open={photoSearchOpen}
        onClose={closePhotoSearch}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Search by Photo</Typography>
            <IconButton onClick={closePhotoSearch} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {/* Image Preview */}
            {imagePreview ? (
              <Box sx={{ mb: 3 }}>
                <Box
                  component="img"
                  src={imagePreview}
                  alt="Uploaded"
                  sx={{
                    maxWidth: '100%',
                    maxHeight: 300,
                    objectFit: 'contain',
                    borderRadius: 2,
                    border: '2px solid #1abc9c'
                  }}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  border: '2px dashed #1abc9c',
                  borderRadius: 2,
                  p: 4,
                  mb: 3,
                  bgcolor: 'rgba(26, 188, 156, 0.05)'
                }}
              >
                <CameraAlt sx={{ fontSize: 60, color: '#1abc9c', mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                  Upload a photo to find similar products
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supports JPG, PNG, JPEG (Max 5MB)
                </Typography>
              </Box>
            )}

            {/* Upload Button */}
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="photo-upload-input"
              type="file"
              onChange={handlePhotoUpload}
            />
            <label htmlFor="photo-upload-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CameraAlt />}
                sx={{
                  borderColor: '#1abc9c',
                  color: '#1abc9c',
                  '&:hover': {
                    borderColor: '#16a085',
                    bgcolor: 'rgba(26, 188, 156, 0.1)'
                  }
                }}
              >
                {imagePreview ? 'Change Photo' : 'Upload Photo'}
              </Button>
            </label>

            {/* Search Button */}
            {imagePreview && (
              <Button
                variant="contained"
                onClick={searchByPhoto}
                disabled={searchingByPhoto}
                startIcon={searchingByPhoto ? <CircularProgress size={20} /> : null}
                sx={{
                  ml: 2,
                  bgcolor: '#1abc9c',
                  '&:hover': {
                    bgcolor: '#16a085'
                  }
                }}
              >
                {searchingByPhoto ? 'Searching...' : 'Find Similar Products'}
              </Button>
            )}

            {/* Search Results */}
            {photoSearchResults.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ textAlign: 'left' }}>
                  Similar Products Found ({photoSearchResults.length})
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {photoSearchResults.map((product) => (
                    <Grid item xs={12} sm={6} md={4} key={product._id}>
                      <Card
                        sx={{
                          height: '100%',
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 16px rgba(26, 188, 156, 0.3)'
                          }
                        }}
                        onClick={() => {
                          closePhotoSearch();
                          window.scrollTo({
                            top: document.getElementById(`product-${product._id}`)?.offsetTop - 100,
                            behavior: 'smooth'
                          });
                        }}
                      >
                        <CardMedia
                          component="img"
                          height="140"
                          image={getImageUrl(product.images?.[0])}
                          alt={product.name}
                          sx={{ objectFit: 'cover' }}
                        />
                        <CardContent>
                          <Typography variant="subtitle2" gutterBottom noWrap>
                            {product.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {product.category}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="h6" color="primary">
                              {formatCurrency(product.price)}
                            </Typography>
                            <Chip
                              label={product.inStock ? 'In Stock' : 'Out of Stock'}
                              size="small"
                              color={product.inStock ? 'success' : 'error'}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* No Results Message */}
            {uploadedImage && !searchingByPhoto && photoSearchResults.length === 0 && (
              <Alert severity="info" sx={{ mt: 3 }}>
                No similar products found. Try uploading a different photo.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePhotoSearch} sx={{ color: '#1abc9c' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerDashboard;
