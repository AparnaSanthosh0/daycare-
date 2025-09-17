import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Button,
  Alert,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Avatar,
} from '@mui/material';
import { toast } from 'react-toastify';
import api, { API_BASE_URL } from '../../config/api';
import ProductsTab from './ProductsTab';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Simple TabPanel helper
function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

// New Vendor Dashboard with modules
const VendorDashboard = () => {
  const { user } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(null); // when null, show only profile header
  const location = useLocation();
  const navigate = useNavigate();

  // Sync tab with ?tab= query param and keep URL updated
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('tab');
    if (raw === null) {
      if (tab !== null) setTab(null);
      return;
    }
    const t = Number(raw);
    if (!Number.isNaN(t) && t !== tab) setTab(t);
  }, [location.search, tab]);

  // Removed unused handleTabChange; navigation is triggered via buttons that set ?tab=

  // Placeholder state for each module (wire to API later)
  const [purchaseOrders, setPurchaseOrders] = useState([
    { id: 'PO-1001', product: 'Baby Lotion', qty: 120, status: 'Pending', eta: '2025-09-20' },
    { id: 'PO-1002', product: 'Feeding Bottles', qty: 60, status: 'Dispatched', eta: '2025-09-14' },
  ]);
  const [deliveries] = useState([
    { id: 'DL-9001', poId: 'PO-0999', status: 'Delivered', date: '2025-09-01' },
  ]);
  const [contract, setContract] = useState({
    startDate: '2025-01-01',
    endDate: '2026-01-01',
    terms: 'Supply essential childcare products monthly with 7-day delivery window.',
    renewal: 'Auto-renew annually unless terminated with 30 days notice.'
  });
  const [performanceNotes, setPerformanceNotes] = useState('');
  const [ratings] = useState([
    { id: 'RT-1', date: '2025-08-31', score: 4.5, notes: 'On-time delivery, good packaging.' },
    { id: 'RT-2', date: '2025-09-05', score: 4.0, notes: 'Minor delay acknowledged.' },
  ]);
  const [invoices] = useState([
    { id: 'INV-2025-001', amount: 12500, status: 'Paid', issued: '2025-08-28', due: '2025-09-05', paidAt: '2025-09-02' },
    { id: 'INV-2025-002', amount: 7600, status: 'Due', issued: '2025-09-08', due: '2025-09-18', paidAt: null },
  ]);
  const [returnsList, setReturnsList] = useState([
    { id: 'RET-3001', product: 'Teethers', qty: 10, reason: 'Defective batch', status: 'Requested' },
  ]);
  const [tickets, setTickets] = useState([
    { id: 'TCK-7001', channel: 'email', subject: 'Packaging inquiry', status: 'Open', createdAt: '2025-09-10' },
  ]);
  const [reviews, setReviews] = useState([
    { id: 'RV-5001', product: 'Baby Lotion', rating: 5, text: 'Great quality!', status: 'Pending' },
    { id: 'RV-5002', product: 'Feeding Bottle', rating: 3, text: 'Cap was loose', status: 'Pending' },
  ]);
  const [vouchers, setVouchers] = useState([
    { code: 'WELCOME10', type: 'percent', value: 10, expiresAt: '2025-12-31', uses: 12, limit: 100 },
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/api/vendor'); // returns approved vendor
        setVendor(data.vendor || null);
      } catch (e) {
        // Keep UI usable with modules even if vendor not loaded
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const vendorHeader = useMemo(() => (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={user?.profileImage ? (user.profileImage.startsWith('http') ? user.profileImage : `${API_BASE_URL}${user.profileImage}`) : undefined}
            alt={vendor?.companyName || 'Vendor'}
            sx={{ width: 64, height: 64 }}
          />
          <Box>
            <Typography variant="h6" fontWeight={700}>{vendor?.companyName || 'Vendor'}</Typography>
            <Typography variant="body2" color="text.secondary">{vendor?.vendorName || '-'}</Typography>
          </Box>
        </Stack>
        <Chip label={(vendor?.status || 'pending').toUpperCase()} color={vendor?.status === 'approved' ? 'success' : vendor?.status === 'pending' ? 'warning' : 'default'} />
      </Box>
      {vendor && (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Email</Typography>
            <Typography>{vendor.email || '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
            <Typography>{vendor.phone || '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">License</Typography>
            {vendor.licenseUrl ? (
              <Button
                component="a"
                href={vendor.licenseUrl?.startsWith('http') ? vendor.licenseUrl : `${API_BASE_URL}${vendor.licenseUrl}`}
                target="_blank"
                rel="noopener"
                size="small"
              >
                View
              </Button>
            ) : (
              <Typography>-</Typography>
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Address</Typography>
            <Typography>
              {[vendor.address?.street, vendor.address?.city, vendor.address?.state, vendor.address?.zipCode].filter(Boolean).join(', ') || '-'}
            </Typography>
          </Grid>
        </Grid>
      )}
    </Paper>
  ), [vendor, user]);

  // Action handlers (stubs)
  const markDelivered = (poId) => {
    setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: 'Delivered' } : p));
    toast.success(`PO ${poId} marked as delivered (stub)`);
  };
  const saveContract = () => {
    toast.success('Contract updated (stub)');
  };
  const sendPerfResponse = () => {
    if (!performanceNotes.trim()) {
      toast.info('Enter a response before sending');
      return;
    }
    toast.success('Performance response sent to admin (stub)');
    setPerformanceNotes('');
  };
  const handleRefundAction = (id, action) => {
    setReturnsList(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
    toast.success(`Return ${id} -> ${action} (stub)`);
  };
  const handleTicketAction = (id, action) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: action } : t));
    toast.success(`Ticket ${id} -> ${action} (stub)`);
  };
  const handleReviewModeration = (id, action) => {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
    toast.success(`Review ${id} -> ${action} (stub)`);
  };
  const addVoucher = (payload) => {
    setVouchers(prev => [{ ...payload }, ...prev]);
    toast.success('Voucher created (stub)');
  };

  if (loading) return <Typography sx={{ p: 3 }}>Loading...</Typography>;

  if (!vendor) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No approved vendor yet. Please wait for admin approval.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography
          variant="h3"
          fontWeight={900}
          sx={{
            letterSpacing: '0.5px',
            color: 'black'
          }}
        >
          Vendor Portal
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/vendor')}>Profile</Button>
          {tab !== null && (
            <Button variant="contained" onClick={() => navigate('/vendor')}>Go to Profile</Button>
          )}
        </Stack>
      </Stack>
      <Grid container spacing={2}>
        {tab === null && (
          <>
            <Grid item xs={12}>{vendorHeader}</Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, background: (theme) => theme.palette.mode === 'light' ? 'linear-gradient(135deg,#f5f0ff,#e8f3ff)' : 'inherit' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>Quick Actions</Typography>
                  <Button variant="contained" onClick={async () => {
                    try {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const form = new FormData();
                        form.append('image', file);
                        await api.post('/api/auth/profile/image', form);
                        toast.success('Profile image updated');
                        navigate(0);
                      };
                      input.click();
                    } catch (err) {
                      toast.error(err?.response?.data?.message || 'Failed to upload');
                    }
                  }}>Upload Profile Photo</Button>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button fullWidth variant="contained" onClick={() => navigate('/vendor?tab=0')}>Manage POs & Deliveries</Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button fullWidth variant="outlined" onClick={() => navigate('/vendor?tab=2')}>View Invoices</Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button fullWidth variant="outlined" onClick={() => navigate('/vendor?tab=4')}>Open Tickets</Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Button fullWidth variant="outlined" onClick={() => navigate('/vendor?tab=7')}>Add Products</Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </>
        )}

        <Grid item xs={12}>
          {/* Only show modules when a tab is explicitly selected via sidebar */}
          {tab !== null && (
            <Paper sx={{ p: 2 }}>
              {/* Removed internal tab bar; content is controlled by the left sidebar (?tab=) */}

            {/* Supplier & Vendor Management (POs and Deliveries) */}
            <TabPanel value={tab} index={0}>
              <Typography variant="h6" sx={{ mb: 1 }}>Purchase Orders</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>PO ID</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>ETA</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {purchaseOrders.map(po => (
                    <TableRow key={po.id}>
                      <TableCell>{po.id}</TableCell>
                      <TableCell>{po.product}</TableCell>
                      <TableCell>{po.qty}</TableCell>
                      <TableCell>{po.status}</TableCell>
                      <TableCell>{po.eta}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" variant="outlined" onClick={() => toast.info('View details (stub)')}>View</Button>
                          {po.status !== 'Delivered' && (
                            <Button size="small" variant="contained" onClick={() => markDelivered(po.id)}>Mark Delivered</Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Recent Deliveries</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Delivery ID</TableCell>
                    <TableCell>PO</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deliveries.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>{d.id}</TableCell>
                      <TableCell>{d.poId}</TableCell>
                      <TableCell>{d.status}</TableCell>
                      <TableCell>{d.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabPanel>

            {/* Performance & Contract Management */}
            <TabPanel value={tab} index={1}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ mb: 1 }}>Contract</Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="Start Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={contract.startDate}
                      onChange={e => setContract(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                    <TextField
                      label="End Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={contract.endDate}
                      onChange={e => setContract(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                    <TextField
                      label="Terms"
                      multiline
                      minRows={3}
                      value={contract.terms}
                      onChange={e => setContract(prev => ({ ...prev, terms: e.target.value }))}
                    />
                    <TextField
                      label="Renewal"
                      multiline
                      minRows={2}
                      value={contract.renewal}
                      onChange={e => setContract(prev => ({ ...prev, renewal: e.target.value }))}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" onClick={saveContract}>Save</Button>
                      <Button variant="outlined" onClick={() => toast.info('Download PDF (stub)')}>Download</Button>
                    </Stack>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ mb: 1 }}>Admin Performance Ratings</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ratings.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>{r.date}</TableCell>
                          <TableCell>{r.score}</TableCell>
                          <TableCell>{r.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TextField
                    sx={{ mt: 2 }}
                    label="Respond to admin"
                    placeholder="Thank you, we will improve delivery confirmations."
                    value={performanceNotes}
                    onChange={e => setPerformanceNotes(e.target.value)}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button variant="contained" onClick={sendPerfResponse}>Send Response</Button>
                  </Stack>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Invoice & Payment Status */}
            <TabPanel value={tab} index={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" defaultValue="all">
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="Due">Due</MenuItem>
                    <MenuItem value="Paid">Paid</MenuItem>
                  </Select>
                </FormControl>
                <TextField size="small" label="Search by ID" placeholder="INV-2025-..." />
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Issued</TableCell>
                    <TableCell>Due</TableCell>
                    <TableCell>Paid At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.id}</TableCell>
                      <TableCell>₹ {inv.amount.toLocaleString()}</TableCell>
                      <TableCell>{inv.status}</TableCell>
                      <TableCell>{inv.issued}</TableCell>
                      <TableCell>{inv.due}</TableCell>
                      <TableCell>{inv.paidAt || '-'}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" variant="outlined" onClick={() => toast.info('Open invoice (stub)')}>View</Button>
                          <Button size="small" onClick={() => toast.info('Download PDF (stub)')}>Download</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabPanel>

            {/* Returns & Refunds Management */}
            <TabPanel value={tab} index={3}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Return ID</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {returnsList.map(ret => (
                    <TableRow key={ret.id}>
                      <TableCell>{ret.id}</TableCell>
                      <TableCell>{ret.product}</TableCell>
                      <TableCell>{ret.qty}</TableCell>
                      <TableCell>{ret.reason}</TableCell>
                      <TableCell>{ret.status}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" variant="outlined" onClick={() => toast.info('Details (stub)')}>Details</Button>
                          <Button size="small" onClick={() => handleRefundAction(ret.id, 'Approved')}>Approve</Button>
                          <Button size="small" color="warning" onClick={() => handleRefundAction(ret.id, 'Refunded')}>Refund</Button>
                          <Button size="small" color="secondary" onClick={() => handleRefundAction(ret.id, 'Replaced')}>Replace</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabPanel>

            {/* Customer Support & Ticketing */}
            <TabPanel value={tab} index={4}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Channel</InputLabel>
                  <Select label="Channel" defaultValue="all">
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="chat">Chat</MenuItem>
                    <MenuItem value="phone">Phone</MenuItem>
                  </Select>
                </FormControl>
                <TextField size="small" label="Search tickets" />
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ticket</TableCell>
                    <TableCell>Channel</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tickets.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{t.id}</TableCell>
                      <TableCell>{t.channel}</TableCell>
                      <TableCell>{t.subject}</TableCell>
                      <TableCell>{t.status}</TableCell>
                      <TableCell>{t.createdAt}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" variant="outlined" onClick={() => toast.info('Open ticket (stub)')}>Open</Button>
                          <Button size="small" onClick={() => handleTicketAction(t.id, 'In Progress')}>In Progress</Button>
                          <Button size="small" color="success" onClick={() => handleTicketAction(t.id, 'Closed')}>Close</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabPanel>

            {/* Product Reviews & Ratings Moderation */}
            <TabPanel value={tab} index={5}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Review</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Text</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reviews.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{r.id}</TableCell>
                      <TableCell>{r.product}</TableCell>
                      <TableCell>{r.rating}</TableCell>
                      <TableCell>{r.text}</TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" variant="outlined" onClick={() => toast.info('Respond (stub)')}>Respond</Button>
                          <Button size="small" color="success" onClick={() => handleReviewModeration(r.id, 'Approved')}>Approve</Button>
                          <Button size="small" color="warning" onClick={() => handleReviewModeration(r.id, 'Flagged')}>Flag</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabPanel>

            {/* Gift Cards & Vouchers Management */}
            <TabPanel value={tab} index={6}>
              <Typography variant="h6" sx={{ mb: 2 }}>Create Voucher</Typography>
              <VoucherForm onCreate={addVoucher} />

              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Existing Vouchers</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell>Uses</TableCell>
                    <TableCell>Limit</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vouchers.map(v => (
                    <TableRow key={v.code}>
                      <TableCell>{v.code}</TableCell>
                      <TableCell>{v.type}</TableCell>
                      <TableCell>{v.type === 'percent' ? `${v.value}%` : `₹ ${v.value}`}</TableCell>
                      <TableCell>{v.expiresAt}</TableCell>
                      <TableCell>{v.uses}</TableCell>
                      <TableCell>{v.limit}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" variant="outlined" onClick={() => toast.info('View redemptions (stub)')}>Redemptions</Button>
                          <Button size="small" color="warning" onClick={() => toast.info('Disable (stub)')}>Disable</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabPanel>

            {/* Products Management */}
            <TabPanel value={tab} index={7}>
              <ProductsTab />
            </TabPanel>
          </Paper>
        )}
        </Grid>
      </Grid>
    </Box>
  );
};

function VoucherForm({ onCreate }) {
  const [code, setCode] = useState('');
  const [type, setType] = useState('percent');
  const [value, setValue] = useState(10);
  const [expiresAt, setExpiresAt] = useState('');
  const [limit, setLimit] = useState(100);

  const handleCreate = () => {
    if (!code || !expiresAt || !value) {
      toast.error('Please fill required fields');
      return;
    }
    const payload = { code: code.trim().toUpperCase(), type, value: Number(value), expiresAt, uses: 0, limit: Number(limit) };
    onCreate(payload);
    setCode('');
    setValue(10);
    setExpiresAt('');
    setLimit(100);
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
      <TextField label="Code" placeholder="WELCOME10" value={code} onChange={e => setCode(e.target.value)} />
      <FormControl sx={{ minWidth: 140 }}>
        <InputLabel>Type</InputLabel>
        <Select label="Type" value={type} onChange={e => setType(e.target.value)}>
          <MenuItem value="percent">Percent</MenuItem>
          <MenuItem value="amount">Amount</MenuItem>
        </Select>
      </FormControl>
      <TextField label="Value" type="number" value={value} onChange={e => setValue(e.target.value)} sx={{ maxWidth: 160 }} />
      <TextField label="Expires" type="date" InputLabelProps={{ shrink: true }} value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
      <TextField label="Usage Limit" type="number" value={limit} onChange={e => setLimit(e.target.value)} sx={{ maxWidth: 160 }} />
      <Button variant="contained" onClick={handleCreate}>Create</Button>
    </Stack>
  );
}

export default VendorDashboard;