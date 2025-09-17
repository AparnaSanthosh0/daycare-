import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Avatar,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  MenuItem
} from '@mui/material';
import {
  SupervisorAccount,
  People,
  Group,
  Business,
  CheckCircle,
  Cancel,
  Visibility,
  PersonAdd,
  Refresh
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';
import { API_BASE_URL } from '../../config/api';

// Animated counter for stats
const CountUp = ({ value, duration = 600 }) => {
  const [display, setDisplay] = React.useState(0);
  const prevRef = React.useRef(0);
  React.useEffect(() => {
    const start = performance.now();
    const from = prevRef.current;
    const to = Number(value) || 0;
    const d = Math.max(duration, 200);
    let raf;
    const step = (now) => {
      const t = Math.min(1, (now - start) / d);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    prevRef.current = to;
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display}</>;
};

const StatCard = ({ title, value, icon, color, onClick }) => (
  <Card sx={{ height: '100%', cursor: onClick ? 'pointer' : 'default', transition: 'transform 120ms ease, box-shadow 120ms ease', '&:hover': { transform: onClick ? 'translateY(-3px)' : 'none', boxShadow: 6 } }} onClick={onClick}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom variant="overline">
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            <CountUp value={value} />
          </Typography>
        </Box>
        <Avatar sx={{ backgroundColor: color, width: 56, height: 56 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // Data states
  const [pendingStaff, setPendingStaff] = useState([]);
  const [pendingParents, setPendingParents] = useState([]);
  const [pendingVendors, setPendingVendors] = useState([]);
  const [currentVendor, setCurrentVendor] = useState(null);
  // Families (parents + children combined)
  const [families, setFamilies] = useState([]);

  // UI state
  const [search, setSearch] = useState('');
  
  // Dialog states
  const [viewDialog, setViewDialog] = useState({ open: false, data: null, type: '' });
  const [actionDialog, setActionDialog] = useState({ open: false, data: null, type: '', action: '' });
  const [createChildDialog, setCreateChildDialog] = useState(false);
  const [reason, setReason] = useState('');
  
  // Create child form (and parent selection)
  const [childForm, setChildForm] = useState({
    parentId: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    program: 'preschool',
    tuitionRate: 0,
    allergies: [],
    medicalConditions: [],
    emergencyContacts: [],
    authorizedPickup: []
  });
  const [parentsList, setParentsList] = useState([]);
  const [prefilledLocked, setPrefilledLocked] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardData();
      // Load parents to select when creating a child
      (async () => {
        try {
          const res = await api.get('/api/admin/parents', { params: { page: 1, limit: 100 } });
          setParentsList(res.data || []);
        } catch (e) {
          console.error('Load parents list error:', e);
        }
      })();
      // Load combined parents and children for Families section
      (async () => {
        try {
          const [parentsRes, childrenRes] = await Promise.all([
            api.get('/api/admin/parents'),
            api.get('/api/children')
          ]);
          const parents = Array.isArray(parentsRes.data) ? parentsRes.data : (parentsRes.data || []);
          const children = Array.isArray(childrenRes.data) ? childrenRes.data : (childrenRes.data.children || []);
          const byParent = new Map();
          for (const p of parents) {
            byParent.set(p._id, { parent: p, children: [] });
          }
          for (const c of children) {
            (c.parents || []).forEach((pid) => {
              if (!byParent.has(pid)) byParent.set(pid, { parent: { _id: pid }, children: [] });
              byParent.get(pid).children.push(c);
            });
          }
          setFamilies(Array.from(byParent.values()));
        } catch (e) {
          console.error('Load families error:', e);
        }
      })();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, staffRes, parentsRes, vendorsRes, currentVendorRes] = await Promise.all([
        api.get('/api/admin/dashboard/stats'),
        api.get('/api/admin/staff/pending'),
        api.get('/api/admin/parents/pending'),
        api.get('/api/admin/vendors/pending'),
        api.get('/api/vendor')
      ]);

      setStats(statsRes.data);
      setPendingStaff(staffRes.data);
      setPendingParents(parentsRes.data);
      setPendingVendors(vendorsRes.data);
      setCurrentVendor(currentVendorRes.data?.vendor || null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const prefillFromAdmission = async (parentId) => {
    try {
      const res = await api.get('/api/admin/admissions/pending');
      const list = res.data || [];
      const ar = list.find((x) => (
        (x.parentUser && (x.parentUser._id === parentId || x.parentUser === parentId)) ||
        (x.parent && (x.parent._id === parentId || x.parent === parentId))
      ));
      if (!ar) { setPrefilledLocked(false); return; }
      const name = ar.child?.name || '';
      const [firstName = '', ...rest] = name.trim().split(' ');
      const lastName = rest.join(' ');
      const dob = ar.child?.dateOfBirth ? new Date(ar.child.dateOfBirth) : null;
      const dobStr = dob && !isNaN(dob.getTime()) ? dob.toISOString().slice(0, 10) : '';

      setChildForm((prev) => ({
        ...prev,
        parentId,
        firstName,
        lastName,
        dateOfBirth: dobStr,
        gender: ar.child?.gender || 'male',
        program: ar.child?.program || 'preschool',
        tuitionRate: prev.tuitionRate || 0,
        allergies: [],
        medicalConditions: ar.child?.medicalInfo ? [ar.child.medicalInfo] : [],
        emergencyContacts: ar.child?.emergencyContactName ? [{
          name: ar.child.emergencyContactName,
          phone: ar.child.emergencyContactPhone || '',
          relationship: 'Emergency'
        }] : [],
        authorizedPickup: []
      }));
      setPrefilledLocked(true);
    } catch (e) {
      console.error('Prefill from admission error:', e);
      setPrefilledLocked(false);
    }
  };

  const handleApproveReject = async (id, type, action) => {
    try {
      let endpoint = `/api/admin/${type}/${id}/status`;
      let payload = { status: action, reason };

      if (type === 'vendors') {
        endpoint = `/api/admin/vendors/${id}/${action === 'approved' ? 'approve' : 'reject'}`;
        payload = undefined; // no body needed for the new endpoints
      }

      if (payload) {
        await api.put(endpoint, payload);
      } else {
        await api.put(endpoint);
      }
      
      setActionDialog({ open: false, data: null, type: '', action: '' });
      setReason('');
      fetchDashboardData();
    } catch (error) {
      console.error(`Error ${action}ing ${type}:`, error);
      setError(`Failed to ${action} ${type}`);
    }
  };

  const handleCreateChild = async () => {
    try {
      if (!childForm.parentId) { setError('Select a parent'); return; }
      if (!childForm.firstName || !childForm.lastName || !childForm.dateOfBirth) { setError('Please fill required fields'); return; }
      // Build emergencyContacts respecting schema required fields
      const ec0 = (Array.isArray(childForm.emergencyContacts) ? childForm.emergencyContacts[0] : null) || {};
      const emergencyContacts = (ec0.name && ec0.phone)
        ? [{ name: ec0.name.trim(), phone: ec0.phone.trim(), relationship: (ec0.relationship || 'Emergency').trim(), canPickup: !!ec0.canPickup }]
        : [];

      const ap0 = (Array.isArray(childForm.authorizedPickup) ? childForm.authorizedPickup[0] : null) || {};
      const authorizedPickup = (ap0.name || ap0.phone)
        ? [{ name: (ap0.name || '').trim(), phone: (ap0.phone || '').trim(), relationship: (ap0.relationship || '').trim(), photoId: ap0.photoId || '' }]
        : [];

      const payload = {
        firstName: childForm.firstName.trim(),
        lastName: childForm.lastName.trim(),
        dateOfBirth: childForm.dateOfBirth,
        gender: childForm.gender,
        parents: [childForm.parentId],
        program: childForm.program,
        tuitionRate: Number(childForm.tuitionRate) || 0,
        allergies: (childForm.allergies || []).map((a) => String(a)).filter(Boolean),
        medicalConditions: (childForm.medicalConditions || []).map((c) => ({ condition: String(c) })).filter((m) => m.condition),
        emergencyContacts,
        authorizedPickup,
        schedule: {}
      };
      await api.post('/api/children', payload);
      setCreateChildDialog(false);
      setChildForm({ parentId: '', firstName: '', lastName: '', dateOfBirth: '', gender: 'male', program: 'preschool', tuitionRate: 0, allergies: [], medicalConditions: [], emergencyContacts: [], authorizedPickup: [] });
      setPrefilledLocked(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Error creating child:', error);
      setError(error?.response?.data?.message || 'Failed to create child profile');
    }
  };

  const renderPendingTable = (raw, type) => {
    const q = search.trim().toLowerCase();
    const data = q
      ? raw.filter((it) => {
          const name = type === 'vendors' ? it.vendorName : `${it.firstName} ${it.lastName}`;
          return (
            (name || '').toLowerCase().includes(q) ||
            (it.email || '').toLowerCase().includes(q)
          );
        })
      : raw;
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Date Applied</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item._id}>
                <TableCell>
                  {type === 'vendors' 
                    ? item.vendorName 
                    : (
                      <Button
                        size="small"
                        onClick={() => {
                          // Open Create Child dialog prefilled with this parent and default child fields from last admission if any
                          setCreateChildDialog(true);
                          setPrefilledLocked(true);
                          prefillFromAdmission(item._id);
                          setChildForm((prev) => ({
                            ...prev,
                            parentId: item._id,
                            firstName: '',
                            lastName: '',
                            dateOfBirth: '',
                            gender: 'male',
                            program: 'preschool',
                            tuitionRate: 0,
                            allergies: [],
                            medicalConditions: [],
                            emergencyContacts: item.emergencyContacts || [],
                            authorizedPickup: []
                          }));
                        }}
                      >
                        {`${item.firstName} ${item.lastName}`}
                      </Button>
                    )}
                </TableCell>
                <TableCell>{item.email}</TableCell>
                <TableCell>{item.phone}</TableCell>
                <TableCell>
                  {new Date(item.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton
                      onClick={() => setViewDialog({ open: true, data: item, type })}
                      size="small"
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Approve">
                    <IconButton
                      onClick={() => setActionDialog({ 
                        open: true, 
                        data: item, 
                        type: type === 'vendors' ? 'vendors' : type, 
                        action: 'approved' 
                      })}
                      size="small"
                      color="success"
                    >
                      <CheckCircle />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reject">
                    <IconButton
                      onClick={() => setActionDialog({ 
                        open: true, 
                        data: item, 
                        type: type === 'vendors' ? 'vendors' : type, 
                        action: 'rejected' 
                      })}
                      size="small"
                      color="error"
                    >
                      <Cancel />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No pending {type} found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Admin privileges required.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Welcome banner */}
      <Paper elevation={0} sx={{ mb: 3, p: 3, borderRadius: 3, background: (theme) => theme.palette.mode === 'light' ? 'linear-gradient(135deg,#e3f2fd,#ede7f6)' : 'linear-gradient(135deg,#263238,#37474f)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" fontWeight={800}>Welcome back, {user?.firstName || 'Admin'} 👋</Typography>
            <Typography variant="body2" color="text.secondary">Here’s what’s happening today. Use quick actions to move faster.</Typography>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<PersonAdd />}
              onClick={() => setCreateChildDialog(true)}
              sx={{ mr: 2 }}
            >
              Create Child Profile
            </Button>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={fetchDashboardData}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Statistics Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Staff"
            value={stats.totalStaff || 0}
            icon={<Group />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Parents"
            value={stats.totalParents || 0}
            icon={<People />}
            color="#388e3c"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Children"
            value={stats.totalChildren || 0}
            icon={<SupervisorAccount />}
            color="#f57c00"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Approvals"
            value={stats.pendingApprovals?.total || 0}
            icon={<Business />}
            color="#d32f2f"
          />
        </Grid>
      </Grid>

      {/* Parents & Children Combined (Families) */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Parents & Children</Typography>
          <Button size="small" onClick={async () => {
            try {
              const [parentsRes, childrenRes] = await Promise.all([
                api.get('/api/admin/parents'),
                api.get('/api/children')
              ]);
              const parents = Array.isArray(parentsRes.data) ? parentsRes.data : (parentsRes.data || []);
              const children = Array.isArray(childrenRes.data) ? childrenRes.data : (childrenRes.data.children || []);
              const byParent = new Map();
              for (const p of parents) byParent.set(p._id, { parent: p, children: [] });
              for (const c of children) (c.parents || []).forEach((pid) => {
                if (!byParent.has(pid)) byParent.set(pid, { parent: { _id: pid }, children: [] });
                byParent.get(pid).children.push(c);
              });
              setFamilies(Array.from(byParent.values()));
            } catch (e) { console.error('Refresh families error:', e); }
          }}>Refresh</Button>
        </Box>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Parent</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Children</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {families.map((f, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>
                    {f.parent?.firstName || f.parent?.lastName ? (
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{f.parent.firstName} {f.parent.lastName}</Typography>
                        <Typography variant="caption" color="text.secondary">ID: {f.parent._id}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2">(Unknown Parent)</Typography>
                    )}
                  </TableCell>
                  <TableCell>{f.parent?.email || '—'}</TableCell>
                  <TableCell>{f.parent?.phone || '—'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {f.children.length === 0 && <Chip size="small" label="No children" variant="outlined" />}
                      {f.children.map((c) => (
                        <Chip key={c._id} size="small" label={`${c.firstName} ${c.lastName} • ${c.program}`} />
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {families.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">No families found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Pending Approvals Section */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" gutterBottom>
            Pending Approvals
          </Typography>
          {/* Quick search/filter */}
          <TextField size="small" placeholder="Search name or email" onChange={(e) => setSearch(e.target.value)} sx={{ ml: 2, width: 260 }} />
        </Box>
        
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Staff
                {pendingStaff.length > 0 && (
                  <Chip size="small" label={pendingStaff.length} color="error" />
                )}
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Parents
                {pendingParents.length > 0 && (
                  <Chip size="small" label={pendingParents.length} color="error" />
                )}
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Vendors
                {pendingVendors.length > 0 && (
                  <Chip size="small" label={pendingVendors.length} color="error" />
                )}
              </Box>
            } 
          />
        </Tabs>

        <Box sx={{ mt: 3 }}>
          {tabValue === 0 && renderPendingTable(pendingStaff, 'staff')}
          {tabValue === 1 && renderPendingTable(pendingParents, 'parents')}
          {tabValue === 2 && (
            <Box>
              {currentVendor ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Current approved vendor: <strong>{currentVendor.vendorName}</strong> ({currentVendor.companyName}). Vendor selection is closed.
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  No vendor approved yet. Approve exactly one from the list below; the rest will be auto-rejected and notified.
                </Alert>
              )}
              {renderPendingTable(pendingVendors, 'vendors')}
            </Box>
          )}
        </Box>
      </Paper>

      {/* View Details Dialog */}
      <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false, data: null, type: '' })} maxWidth="md" fullWidth>
        <DialogTitle>
          {viewDialog.type === 'vendors' ? 'Vendor' : 
           viewDialog.type === 'staff' ? 'Staff' : 'Parent'} Details
        </DialogTitle>
        <DialogContent>
          {viewDialog.data && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Name:</Typography>
                <Typography>
                  {viewDialog.type === 'vendors' 
                    ? viewDialog.data.vendorName 
                    : `${viewDialog.data.firstName} ${viewDialog.data.lastName}`}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Email:</Typography>
                <Typography>{viewDialog.data.email}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Phone:</Typography>
                <Typography>{viewDialog.data.phone}</Typography>
              </Grid>
              {viewDialog.type === 'vendors' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Company:</Typography>
                    <Typography>{viewDialog.data.companyName}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">License Number:</Typography>
                    <Typography>{viewDialog.data.businessLicenseNumber}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Address:</Typography>
                    <Typography>
                      {[
                        viewDialog.data.address?.street,
                        viewDialog.data.address?.city,
                        viewDialog.data.address?.state,
                        viewDialog.data.address?.zipCode
                      ].filter(Boolean).join(', ') || '—'}
                    </Typography>
                  </Grid>
                  {viewDialog.data.licenseUrl && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Certificate:</Typography>
                      <Box sx={{ mt: 1 }}>
                        <Button
                          size="small"
                          component="a"
                          href={viewDialog.data.licenseUrl?.startsWith('http') ? viewDialog.data.licenseUrl : `${API_BASE_URL}${viewDialog.data.licenseUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="outlined"
                        >
                          View / Download
                        </Button>
                      </Box>
                    </Grid>
                  )}
                </>
              )}
              {viewDialog.type === 'staff' && viewDialog.data.staff && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Experience:</Typography>
                    <Typography>{viewDialog.data.staff.yearsOfExperience} years</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Qualification:</Typography>
                    <Typography>{viewDialog.data.staff.qualification}</Typography>
                  </Grid>
                </>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2">Applied Date:</Typography>
                <Typography>{new Date(viewDialog.data.createdAt).toLocaleString()}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, data: null, type: '' })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, data: null, type: '', action: '' })}>
        <DialogTitle>
          {actionDialog.action === 'approved' ? 'Approve' : 'Reject'} {actionDialog.type}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to {actionDialog.action === 'approved' ? 'approve' : 'reject'} this {actionDialog.type}?
          </Typography>
          {actionDialog.action === 'rejected' && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, data: null, type: '', action: '' })}>
            Cancel
          </Button>
          <Button
            onClick={() => handleApproveReject(actionDialog.data?._id, actionDialog.type, actionDialog.action)}
            color={actionDialog.action === 'approved' ? 'success' : 'error'}
            variant="contained"
          >
            {actionDialog.action === 'approved' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Child Profile Dialog */}
      <Dialog open={createChildDialog} onClose={() => setCreateChildDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Child Profile</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Parent"
                value={childForm.parentId}
                onChange={(e) => setChildForm({ ...childForm, parentId: e.target.value })}
                required
              >
                {parentsList.map((p) => (
                  <MenuItem key={p._id} value={p._id} onClick={() => prefillFromAdmission(p._id)}>
                    {p.firstName} {p.lastName} - {p.email}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={childForm.firstName}
                onChange={(e) => setChildForm({ ...childForm, firstName: e.target.value })}
                required
                disabled={prefilledLocked}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={childForm.lastName}
                onChange={(e) => setChildForm({ ...childForm, lastName: e.target.value })}
                required
                disabled={prefilledLocked}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Date of Birth"
                InputLabelProps={{ shrink: true }}
                value={childForm.dateOfBirth}
                onChange={(e) => setChildForm({ ...childForm, dateOfBirth: e.target.value })}
                required
                disabled={prefilledLocked}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Gender"
                value={childForm.gender}
                onChange={(e) => setChildForm({ ...childForm, gender: e.target.value })}
                disabled={prefilledLocked}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Program"
                value={childForm.program}
                onChange={(e) => setChildForm({ ...childForm, program: e.target.value })}
                disabled={prefilledLocked}
              >
                <option value="infant">Infant</option>
                <option value="toddler">Toddler</option>
                <option value="preschool">Preschool</option>
                <option value="prekindergarten">Prekindergarten</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Medical Info"
                multiline
                minRows={2}
                value={childForm.medicalInfo || ''}
                onChange={(e) => setChildForm({ ...childForm, medicalInfo: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Allergies (comma separated)"
                value={childForm.allergies.join(', ')}
                onChange={(e) => setChildForm({ ...childForm, allergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Medical Conditions (comma separated)"
                value={childForm.medicalConditions.join(', ')}
                onChange={(e) => setChildForm({ ...childForm, medicalConditions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Emergency Contact (optional)</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={(childForm.emergencyContacts?.[0]?.name) || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      const arr = Array.isArray(childForm.emergencyContacts) ? [...childForm.emergencyContacts] : [];
                      arr[0] = { ...(arr[0] || { relationship: 'Emergency' }), name: v };
                      setChildForm({ ...childForm, emergencyContacts: arr });
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={(childForm.emergencyContacts?.[0]?.phone) || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      const arr = Array.isArray(childForm.emergencyContacts) ? [...childForm.emergencyContacts] : [];
                      arr[0] = { ...(arr[0] || { relationship: 'Emergency' }), phone: v };
                      setChildForm({ ...childForm, emergencyContacts: arr });
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Relationship"
                    value={(childForm.emergencyContacts?.[0]?.relationship) || 'Emergency'}
                    onChange={(e) => {
                      const v = e.target.value;
                      const arr = Array.isArray(childForm.emergencyContacts) ? [...childForm.emergencyContacts] : [];
                      arr[0] = { ...(arr[0] || {}), relationship: v };
                      setChildForm({ ...childForm, emergencyContacts: arr });
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Authorized Pickup (optional)</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={(childForm.authorizedPickup?.[0]?.name) || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      const arr = Array.isArray(childForm.authorizedPickup) ? [...childForm.authorizedPickup] : [];
                      arr[0] = { ...(arr[0] || {}), name: v };
                      setChildForm({ ...childForm, authorizedPickup: arr });
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={(childForm.authorizedPickup?.[0]?.phone) || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      const arr = Array.isArray(childForm.authorizedPickup) ? [...childForm.authorizedPickup] : [];
                      arr[0] = { ...(arr[0] || {}), phone: v };
                      setChildForm({ ...childForm, authorizedPickup: arr });
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Relationship"
                    value={(childForm.authorizedPickup?.[0]?.relationship) || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      const arr = Array.isArray(childForm.authorizedPickup) ? [...childForm.authorizedPickup] : [];
                      arr[0] = { ...(arr[0] || {}), relationship: v };
                      setChildForm({ ...childForm, authorizedPickup: arr });
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateChildDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateChild}
            variant="contained"
            disabled={!childForm.parentId || !childForm.firstName || !childForm.lastName || !childForm.dateOfBirth}
          >
            Create Profile
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;