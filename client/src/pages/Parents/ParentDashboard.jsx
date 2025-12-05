import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  Avatar,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Chip,
  Divider,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Person,
  ChildCare,
  PhotoCamera,
  Delete,
  Save,
  Edit,
  Refresh,
  Event,
  LocalDining,
  PhotoAlbum,
  // Analytics,
  TrendingUp,
  Assessment
  // People,
  // SupervisorAccount,
  // ContactPhone,
  // Email
} from '@mui/icons-material';
import api, { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import MealRecommendation from '../../components/MealRecommendation';

// Simple helper to format date strings
const formatDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toLocaleDateString();
};

// Normalize any image/resource URL against API_BASE_URL.
// - Works whether API_BASE_URL is "http://host:port" or "http://host:port/api"
// - Returns absolute URL for relative resource paths (e.g., "/uploads/..." or "uploads/...")
const toAbsoluteUrl = (maybePath) => {
  if (!maybePath) return '';
  if (typeof maybePath === 'string' && /^https?:\/\//i.test(maybePath)) return maybePath;
  try {
    // Derive an origin (strip trailing '/api' if present). If API_BASE_URL is relative, fall back to window origin.
    let origin = API_BASE_URL.replace(/\/?api\/?$/i, '').replace(/\/$/, '');
    if (!/^https?:\/\//i.test(origin)) {
      if (typeof window !== 'undefined' && window.location?.origin) {
        origin = window.location.origin;
      }
    }
    const resource = String(maybePath).startsWith('/') ? String(maybePath) : `/${String(maybePath)}`;
    const u = new URL(resource, origin);
    return u.href;
  } catch (e) {
    return String(maybePath);
  }
};

const toTagArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((v) => (typeof v === 'string' ? v.trim() : v));
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${k}${v ? `: ${v}` : ''}`);
  }
  return String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
};

const ParentDashboard = ({ initialTab }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [, setLoading] = useState(false);
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Data for active child
  const [profile, setProfile] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [profileImageVersion, setProfileImageVersion] = useState(0);
  const [photoPreview, setPhotoPreview] = useState({ open: false, url: '' });
  const [attendance, setAttendance] = useState(null);
  const [activities, setActivities] = useState({ recent: [], count: 0 });
  const [meals, setMeals] = useState({ plan: [], weekOf: null });
  const [reports, setReports] = useState({
    attendance: { summary: null, history: [] },
    activities: { participation: [], trends: null },
    milestones: { completed: [], upcoming: [] },
    nutrition: { consumption: [], preferences: [] }
  });
  // Staff information
  const [assignedStaff, setAssignedStaff] = useState([]);
  // Admissions state for adding additional children
  const [admissions, setAdmissions] = useState([]);
  const [admissionForm, setAdmissionForm] = useState({
    childName: '',
    childDob: '',
    childGender: 'male',
    program: 'preschool',
    medicalInfo: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });
  const [admissionMsg, setAdmissionMsg] = useState('');
  const [admissionError, setAdmissionError] = useState('');
  const [admissionLoading, setAdmissionLoading] = useState(false);
  
  // Billing states
  const [billingData, setBillingData] = useState({ invoices: [], payments: [] });
  const [paymentDialog, setPaymentDialog] = useState({ open: false, invoice: null });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Editable fields (parent-allowed)
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({
    allergies: [],
    medicalConditions: [], // store as array of strings for simplicity; server accepts objects or strings; keep minimal
    emergencyContacts: [],
    authorizedPickup: [],
    notes: ''
  });

  // AI Recommendations state
  const [aiRecommendationType, setAiRecommendationType] = useState(null); // 'education', 'social', 'nutrition', or null
  const [educationRecommendations, setEducationRecommendations] = useState([]);
  const [socialRecommendations, setSocialRecommendations] = useState(null);
  const [nutritionRecommendations, setNutritionRecommendations] = useState(null);

  const socialPlaymates = socialRecommendations?.playmates || [];
  const socialGroupActivities = socialRecommendations?.groupActivities || [];
  const socialSkillsFocus = socialRecommendations?.socialSkills || [];

  const normalizedNutritionItems = useMemo(() => {
    if (!nutritionRecommendations) return [];
    const baseList = Array.isArray(nutritionRecommendations.meals) && nutritionRecommendations.meals.length > 0
      ? nutritionRecommendations.meals
      : Array.isArray(nutritionRecommendations.recommendations)
        ? nutritionRecommendations.recommendations
        : [];

    return baseList.map((item, idx) => {
      if (typeof item === 'string') {
        return {
          id: `nutrition-${idx}`,
          title: item,
          description: '',
          tags: []
        };
      }
      const tags = [
        ...toTagArray(item.benefits),
        ...toTagArray(item.nutrients)
      ].filter(Boolean);

      return {
        id: item.id || `nutrition-${idx}`,
        title: item.name || item.category || `Option ${idx + 1}`,
        description: item.description || item.benefits || '',
        tags
      };
    });
  }, [nutritionRecommendations]);

  // const activeChild = useMemo(
  //   () => children.find((c) => c._id === activeChildId) || null,
  //   [children, activeChildId]
  // );

  // Map initialTab prop to tab index when component mounts
  useEffect(() => {
    const map = {
      notifications: 10,
      messaging: 11,
      billing: 12,
      feedback: 7,
      staff: 6,
      reports: 8,
      admissions: 9,
    };
    if (initialTab && map[initialTab] !== undefined) setTab(map[initialTab]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  // Load my children
  const loadChildren = useCallback(async () => {
    try {
      setErrorMsg('');
      setLoading(true);
      if (user?.role !== 'parent') {
        setChildren([]);
        setActiveChildId('');
        setErrorMsg('This area is for Parent accounts. Please sign in as a Parent to view your children and gallery.');
        return;
      }
      const res = await api.get('/api/parents/me/children');
      setChildren(res.data || []);
      if ((res.data || []).length > 0 && !activeChildId) {
        setActiveChildId(res.data[0]._id);
      }
    } catch (e) {
      console.error('Load children error:', e);
      const msg = e?.response?.data?.message || '';
      const status = e?.response?.status;
      const code = e?.response?.data?.code;
      
      // Handle the case when no child profiles exist
      if (status === 403 && code === 'NO_CHILD_PROFILE') {
        setChildren([]);
        setErrorMsg('No child profiles found. Please contact administration to create your child profile before accessing the dashboard.');
        return;
      }
      
      // Many deployments return 404 "Route not found" when the parent/children API isn't enabled yet.
      // Treat this as non-fatal and keep the dashboard usable without an orange banner.
      if (status === 404 || /route not found/i.test(msg)) {
        setChildren([]);
        setErrorMsg('');
      } else {
        setErrorMsg(msg || 'Failed to load children');
      }
    } finally {
      setLoading(false);
    }
  }, [activeChildId, user?.role]);

  useEffect(() => {
    loadChildren();
    // Load my admissions list for visibility of pending statuses
    (async () => {
      try {
        const res = await api.get('/api/parents/me/admissions');
        setAdmissions(res.data || []);
      } catch (e) {
        // ignore
      }
    })();
  }, [loadChildren]);

  // Auto-refresh children data every 30 seconds to pick up newly approved admissions
  useEffect(() => {
    if (user?.role !== 'parent') return;
    
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/api/parents/me/children');
        const newChildren = res.data || [];
        
        // Only update if the number of children changed (new admission approved)
        if (newChildren.length !== children.length) {
          console.log('New children detected, updating dashboard...');
          setChildren(newChildren);
          
          // If we have a new child but no active child selected, select the first one
          if (newChildren.length > 0 && !activeChildId) {
            setActiveChildId(newChildren[0]._id);
          }
        }
      } catch (e) {
        // Silent fail for background refresh
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [children.length, activeChildId, user?.role]);

  // Fetch detail for the active child
  const fetchChildData = useCallback(async (childId) => {
    if (!childId) return;
    try {
      if (user?.role !== 'parent') return;
      const [pRes, gRes, aRes, actRes, mRes, rRes, sRes] = await Promise.all([
        api.get(`/api/children/${childId}`),
        api.get(`/api/children/${childId}/gallery`),
        api.get(`/api/children/${childId}/attendance`),
        api.get(`/api/children/${childId}/activities`),
        api.get(`/api/children/${childId}/meals`),
        api.get(`/api/children/${childId}/reports`),
        api.get(`/api/children/${childId}/staff`)
      ]);
      setProfile(pRes.data);
      setGallery(gRes.data || []);
      setAttendance(aRes.data || null);
      setActivities(actRes.data || { recent: [], count: 0 });
      setMeals(mRes.data || { plan: [], weekOf: null });
      setReports(rRes.data || {
        attendance: { summary: null, history: [] },
        activities: { participation: [], trends: null },
        milestones: { completed: [], upcoming: [] },
        nutrition: { consumption: [], preferences: [] }
      });
      console.log('Assigned staff response:', sRes.data);
      setAssignedStaff(sRes.data || []);

      // Seed edit fields from profile
      const pf = pRes.data || {};
      setEditFields({
        allergies: Array.isArray(pf.allergies) ? pf.allergies : [],
        medicalConditions: Array.isArray(pf.medicalConditions)
          ? pf.medicalConditions.map((m) => (typeof m === 'string' ? m : (m?.condition || ''))).filter(Boolean)
          : [],
        emergencyContacts: Array.isArray(pf.emergencyContacts) ? pf.emergencyContacts : [],
        authorizedPickup: Array.isArray(pf.authorizedPickup) ? pf.authorizedPickup : [],
        notes: pf.notes || ''
      });
    } catch (e) {
      console.error('Fetch child data error:', e);
      const msg = e?.response?.data?.message || '';
      const status = e?.response?.status;
      if (status === 404 || /route not found/i.test(msg)) {
        // Ignore cosmetic 404s from optional endpoints; do not show banner.
        setErrorMsg('');
      } else {
        setErrorMsg(msg || 'Failed to load child data');
      }
    }
  }, [user?.role]);

  // When active child changes, fetch everything
  useEffect(() => {
    if (activeChildId) {
      fetchChildData(activeChildId);
      fetchBillingData();
    }
  }, [activeChildId, fetchChildData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Simple polling for attendance, activities, meals
  useEffect(() => {
    if (!activeChildId || user?.role !== 'parent') return;
    const interval = setInterval(async () => {
      try {
        const [aRes, actRes, mRes] = await Promise.all([
          api.get(`/api/children/${activeChildId}/attendance`),
          api.get(`/api/children/${activeChildId}/activities`),
          api.get(`/api/children/${activeChildId}/meals`)
        ]);
        setAttendance(aRes.data || null);
        setActivities(actRes.data || { recent: [], count: 0 });
        setMeals(mRes.data || { plan: [], weekOf: null });
      } catch (e) {
        // silent fail to avoid UI spam
      }
    }, 30000); // 30s
    return () => clearInterval(interval);
  }, [activeChildId, user?.role]);

  const handleSave = async () => {
    if (!activeChildId) return;
    try {
      const payload = {
        allergies: editFields.allergies,
        medicalConditions: editFields.medicalConditions.map((c) => ({ condition: c })),
        emergencyContacts: editFields.emergencyContacts,
        authorizedPickup: editFields.authorizedPickup,
        notes: editFields.notes
      };
      const res = await api.put(`/api/children/${activeChildId}`, payload);
      setProfile(res.data.child);
      setEditMode(false);
    } catch (e) {
      console.error('Save child edit error:', e);
    }
  };

  const handleUpload = async (file, caption = '') => {
    if (!activeChildId || !file) return;
    try {
      const form = new FormData();
      form.append('photo', file);
      form.append('caption', caption);
      const res = await api.post(`/api/children/${activeChildId}/gallery`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setGallery((g) => [...g, res.data.photo]);
    } catch (e) {
      console.error('Upload error:', e);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!activeChildId || !photoId) return;
    try {
      await api.delete(`/api/children/${activeChildId}/gallery/${photoId}`);
      setGallery((g) => g.filter((p) => p._id !== photoId));
    } catch (e) {
      console.error('Delete photo error:', e);
    }
  };

  const AllergiesEditor = () => {
    const [input, setInput] = useState('');
    return (
      <Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          {editFields.allergies.map((a, idx) => (
            <Chip key={`${a}-${idx}`} label={a} onDelete={() => {
              setEditFields((f) => ({ ...f, allergies: f.allergies.filter((_, i) => i !== idx) }));
            }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" value={input} onChange={(e) => setInput(e.target.value)} label="Add allergy" />
          <Button variant="outlined" onClick={() => {
            if (input.trim()) {
              setEditFields((f) => ({ ...f, allergies: [...f.allergies, input.trim()] }));
              setInput('');
            }
          }}>Add</Button>
        </Box>
      </Box>
    );
  };

  const MedicalEditor = () => {
    const [input, setInput] = useState('');
    return (
      <Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          {(editFields.medicalConditions || []).map((m, idx) => (
            <Chip key={`${m}-${idx}`} label={m} onDelete={() => {
              setEditFields((f) => ({ ...f, medicalConditions: f.medicalConditions.filter((_, i) => i !== idx) }));
            }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" value={input} onChange={(e) => setInput(e.target.value)} label="Add medical note" />
          <Button variant="outlined" onClick={() => {
            if (input.trim()) {
              setEditFields((f) => ({ ...f, medicalConditions: [...f.medicalConditions, input.trim()] }));
              setInput('');
            }
          }}>Add</Button>
        </Box>
      </Box>
    );
  };

  const EmergencyEditor = () => {
    const [contact, setContact] = useState({ name: '', phone: '', relationship: 'Emergency' });
    return (
      <Box>
        {(editFields.emergencyContacts || []).map((c, idx) => (
          <Grid container spacing={1} key={idx} sx={{ mb: 1 }}>
            <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={c.name} onChange={(e) => {
              const v = e.target.value; setEditFields((f) => { const arr = [...f.emergencyContacts]; arr[idx] = { ...arr[idx], name: v }; return { ...f, emergencyContacts: arr }; });
            }} /></Grid>
            <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={c.phone} onChange={(e) => {
              const v = e.target.value; setEditFields((f) => { const arr = [...f.emergencyContacts]; arr[idx] = { ...arr[idx], phone: v }; return { ...f, emergencyContacts: arr }; });
            }} /></Grid>
            <Grid item xs={10} sm={3}><TextField size="small" fullWidth label="Relationship" value={c.relationship || 'Emergency'} onChange={(e) => {
              const v = e.target.value; setEditFields((f) => { const arr = [...f.emergencyContacts]; arr[idx] = { ...arr[idx], relationship: v }; return { ...f, emergencyContacts: arr }; });
            }} /></Grid>
            <Grid item xs={2} sm={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <IconButton color="error" onClick={() => setEditFields((f) => ({ ...f, emergencyContacts: f.emergencyContacts.filter((_, i) => i !== idx) }))}><Delete /></IconButton>
            </Grid>
          </Grid>
        ))}

        <Divider sx={{ my: 1 }} />
        <Grid container spacing={1}>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="Relationship" value={contact.relationship} onChange={(e) => setContact((c) => ({ ...c, relationship: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={1} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button variant="outlined" onClick={() => {
              if (contact.name && contact.phone) {
                setEditFields((f) => ({ ...f, emergencyContacts: [...(f.emergencyContacts || []), contact] }));
                setContact({ name: '', phone: '', relationship: 'Emergency' });
              }
            }}>Add</Button>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const AuthorizedPickupEditor = () => {
    const [person, setPerson] = useState({ name: '', phone: '', relationship: '' });
    return (
      <Box>
        {(editFields.authorizedPickup || []).map((c, idx) => (
          <Grid container spacing={1} key={idx} sx={{ mb: 1 }}>
            <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={c.name || ''} onChange={(e) => {
              const v = e.target.value; setEditFields((f) => { const arr = [...f.authorizedPickup]; arr[idx] = { ...arr[idx], name: v }; return { ...f, authorizedPickup: arr }; });
            }} /></Grid>
            <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={c.phone || ''} onChange={(e) => {
              const v = e.target.value; setEditFields((f) => { const arr = [...f.authorizedPickup]; arr[idx] = { ...arr[idx], phone: v }; return { ...f, authorizedPickup: arr }; });
            }} /></Grid>
            <Grid item xs={10} sm={3}><TextField size="small" fullWidth label="Relationship" value={c.relationship || ''} onChange={(e) => {
              const v = e.target.value; setEditFields((f) => { const arr = [...f.authorizedPickup]; arr[idx] = { ...arr[idx], relationship: v }; return { ...f, authorizedPickup: arr }; });
            }} /></Grid>
            <Grid item xs={2} sm={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <IconButton color="error" onClick={() => setEditFields((f) => ({ ...f, authorizedPickup: f.authorizedPickup.filter((_, i) => i !== idx) }))}><Delete /></IconButton>
            </Grid>
          </Grid>
        ))}

        <Divider sx={{ my: 1 }} />
        <Grid container spacing={1}>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={person.name} onChange={(e) => setPerson((c) => ({ ...c, name: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={person.phone} onChange={(e) => setPerson((c) => ({ ...c, phone: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="Relationship" value={person.relationship} onChange={(e) => setPerson((c) => ({ ...c, relationship: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={1} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button variant="outlined" onClick={() => {
              if (person.name && person.phone) {
                setEditFields((f) => ({ ...f, authorizedPickup: [...(f.authorizedPickup || []), person] }));
                setPerson({ name: '', phone: '', relationship: '' });
              }
            }}>Add</Button>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const Gallery = () => {
    const [file, setFile] = useState(null);
    const [caption, setCaption] = useState('');
    return (
      <Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="contained" component="label" startIcon={<PhotoCamera />} disabled={!activeChildId}>
            Upload Photo
            <input hidden type="file" accept="image/*" multiple onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Button>
          <TextField 
            size="small" 
            label="Caption" 
            value={caption} 
            onChange={(e) => setCaption(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <Button 
            variant="outlined" 
            onClick={() => { if (file) { handleUpload(file, caption); setFile(null); setCaption(''); } }} 
            disabled={!file}
          >
            Add Photo
          </Button>
          <IconButton onClick={() => fetchChildData(activeChildId)} title="Refresh Gallery">
            <Refresh />
          </IconButton>
        </Box>
        <Grid container spacing={2}>
          {gallery.map((p) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={p._id}>
              <Card sx={{ position: 'relative' }}>
                <CardMedia 
                  component="img" 
                  height="180" 
                  image={toAbsoluteUrl(p.url || '')} 
                  alt={p.caption || 'Child photo'}
                  sx={{ objectFit: 'cover', cursor: 'pointer' }}
                  title={toAbsoluteUrl(p.url || '')}
                  onError={(e) => {
                    const bad = e.currentTarget.getAttribute('src');
                    // Try a last-resort fallback using window origin
                    try {
                      const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';
                      const resource = (p.url || '').startsWith('/') ? (p.url || '') : `/${p.url || ''}`;
                      const fallback = origin ? new URL(resource, origin).href : '';
                      if (fallback && fallback !== bad) {
                        // eslint-disable-next-line no-console
                        console.warn('Gallery image failed, retrying with origin fallback', { bad, fallback });
                        e.currentTarget.src = fallback;
                        return;
                      }
                    } catch (err) {
                      // ignore
                    }
                    // eslint-disable-next-line no-console
                    console.error('Gallery image failed to load:', bad);
                  }}
                  onClick={() => {
                    const fullUrl = toAbsoluteUrl(p.url || '');
                    setPhotoPreview({ open: true, url: fullUrl });
                  }}
                />
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, mr: 1 }}>
                    {p.caption || 'No caption'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton 
                      size="small" 
                      color="primary" 
                      onClick={() => {
                        // Set as profile image
                        api.post(`/api/children/${activeChildId}/gallery/${p._id}/set-profile`)
                          .then(() => {
                            fetchChildData(activeChildId);
                            setProfileImageVersion((v) => v + 1);
                          })
                          .catch(console.error);
                      }}
                      title="Set as profile image"
                    >
                      <Person />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleDeletePhoto(p._id)}
                      title="Delete photo"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {gallery.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <PhotoCamera sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  No photos yet. Upload some memories!
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>

        {/* Photo Preview Dialog */}
        <Dialog open={photoPreview.open} onClose={() => setPhotoPreview({ open: false, url: '' })} maxWidth="md" fullWidth>
          <DialogTitle>Photo</DialogTitle>
          <DialogContent dividers>
            {photoPreview.url && (
              <Box sx={{ textAlign: 'center' }}>
                <Box 
                  component="img" 
                  src={photoPreview.url} 
                  alt="Preview" 
                  title={photoPreview.url}
                  sx={{ maxWidth: '100%', borderRadius: 1 }}
                  onError={(e) => {
                    const bad = e.currentTarget.getAttribute('src');
                    try {
                      const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';
                      const resource = photoPreview.url?.replace(/^https?:\/\/[^/]+/i, '') || '';
                      const resourceFixed = resource.startsWith('/') ? resource : `/${resource}`;
                      const fallback = origin ? new URL(resourceFixed, origin).href : '';
                      if (fallback && fallback !== bad) {
                        // eslint-disable-next-line no-console
                        console.warn('Preview image failed, retrying with origin fallback', { bad, fallback });
                        e.currentTarget.src = fallback;
                        return;
                      }
                    } catch (err) {
                      // ignore
                    }
                    // eslint-disable-next-line no-console
                    console.error('Preview image failed to load:', bad);
                  }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPhotoPreview({ open: false, url: '' })}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  };

  const ProfileCard = () => {
    const fullName = profile ? `${profile.firstName} ${profile.lastName}` : '';
    const age = profile ? calculateAge(profile.dateOfBirth) : '';
    
    return (
      <Card>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {profile?.profileImage ? (
                <img 
                  src={`${toAbsoluteUrl(profile.profileImage)}?v=${profileImageVersion}`}
                  alt={fullName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <ChildCare />
              )}
            </Avatar>
          }
          title={fullName}
          subheader={profile ? `${profile.gender?.toUpperCase() || ''} • ${age} years old • DOB: ${formatDate(profile.dateOfBirth)}` : ''}
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Program" 
                value={profile?.program ? profile.program.charAt(0).toUpperCase() + profile.program.slice(1) : ''} 
                InputProps={{ readOnly: true }} 
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Enrollment Date" 
                value={formatDate(profile?.enrollmentDate)} 
                InputProps={{ readOnly: true }} 
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Medical Info" 
                value={profile?.medicalConditions?.[0]?.condition || 'None provided'} 
                InputProps={{ readOnly: true }} 
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Status" 
                value={profile?.isActive ? 'Active' : 'Inactive'} 
                InputProps={{ readOnly: true }} 
                color={profile?.isActive ? 'success' : 'error'}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Helper function to calculate age
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return '';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // AI Recommendations Functions
  const generateEducationRecommendations = useCallback(() => {
    if (!profile) return [];
    
    const age = calculateAge(profile.dateOfBirth);
    const interests = profile.interests || [];
    
    // Education recommendations based on age and program
    const recommendations = [
      {
        id: 1,
        title: 'Interactive Storytelling',
        description: 'Enhance language skills through engaging story sessions',
        ageRange: '2-5',
        category: 'Language Development',
        benefits: ['Vocabulary building', 'Listening skills', 'Imagination'],
        suitable: true
      },
      {
        id: 2,
        title: 'Number Recognition Games',
        description: 'Fun counting and number games for early math skills',
        ageRange: '3-6',
        category: 'Mathematics',
        benefits: ['Number recognition', 'Counting', 'Pattern identification'],
        suitable: true
      },
      {
        id: 3,
        title: 'Arts & Crafts Projects',
        description: 'Creative activities to develop fine motor skills',
        ageRange: '2-6',
        category: 'Creative Development',
        benefits: ['Fine motor skills', 'Creativity', 'Following instructions'],
        suitable: age >= 2 || interests.includes('arts_crafts') || true
      },
      {
        id: 4,
        title: 'Science Discovery Time',
        description: 'Simple experiments and nature exploration',
        ageRange: '3-6',
        category: 'STEM',
        benefits: ['Critical thinking', 'Observation skills', 'Curiosity'],
        suitable: true
      },
      {
        id: 5,
        title: 'Musical Expression',
        description: 'Singing, dancing, and instrument play for development',
        ageRange: '1-6',
        category: 'Creative Arts',
        benefits: ['Rhythm', 'Memory', 'Emotional expression'],
        suitable: true
      }
    ];
    
    return recommendations.filter(rec => rec.suitable).slice(0, 3);
  }, [profile]);

  const generateSocialRecommendations = useCallback(async () => {
    if (!activeChildId) return null;
    
    try {
      const response = await api.get(`/api/recommendations/child/${activeChildId}`);
      return {
        playmates: response.data.recommendations || [],
        groupActivities: [
          'Circle Time Discussions',
          'Collaborative Art Projects', 
          'Team Building Games',
          'Group Storytelling'
        ],
        socialSkills: [
          'Sharing and taking turns',
          'Expressing feelings appropriately', 
          'Making friends',
          'Conflict resolution'
        ]
      };
    } catch (error) {
      console.error('Error fetching social recommendations:', error);
      return {
        playmates: [],
        groupActivities: ['Circle Time', 'Group Play', 'Team Activities'],
        socialSkills: ['Sharing', 'Communication', 'Empathy', 'Cooperation']
      };
    }
  }, [activeChildId]);

  const generateNutritionRecommendations = useCallback(async () => {
    if (!profile) return null;
    
    const age = calculateAge(profile.dateOfBirth);
    const allergies = profile.allergies || [];
    
    try {
      const response = await api.post('/api/meal-recommendations/predict', {
        age: age,
        dietaryPreference: 'balanced',
        hasAllergy: allergies.length > 0
      });
      
      return {
        ...response.data,
        tips: [
          'Introduce variety gradually',
          'Make mealtime enjoyable',
          'Involve child in food preparation',
          'Be patient with new foods'
        ],
        allergies: allergies
      };
    } catch (error) {
      console.error('Error fetching nutrition recommendations:', error);
      return {
        recommendations: [
          'Colorful fruit and vegetable plates',
          'Whole grain options for sustained energy',
          'Protein-rich snacks for growth',
          'Calcium sources for strong bones'
        ],
        tips: [
          'Encourage trying new foods',
          'Create positive mealtime environment',
          'Offer choices when possible'
        ],
        allergies: allergies
      };
    }
  }, [profile]);

  const handleAiRecommendationClick = async (type) => {
    setAiRecommendationType(type);
    
    switch (type) {
      case 'education':
        const eduRecs = generateEducationRecommendations();
        setEducationRecommendations(eduRecs);
        break;
      case 'social':
        const socialRecs = await generateSocialRecommendations();
        setSocialRecommendations(socialRecs);
        break;
      case 'nutrition':
        const nutritionRecs = await generateNutritionRecommendations();
        setNutritionRecommendations(nutritionRecs);
        break;
      default:
        setAiRecommendationType(null);
    }
  };

  // Fetch billing data for the active child
  const fetchBillingData = async () => {
    if (!activeChildId) return;
    
    try {
      const [invoicesRes, paymentsRes] = await Promise.all([
        api.get(`/api/billing/invoices/child/${activeChildId}`),
        api.get(`/api/billing/payments/child/${activeChildId}`)
      ]);
      
      setBillingData({
        invoices: invoicesRes.data || [],
        payments: paymentsRes.data || []
      });
    } catch (error) {
      console.error('Error fetching billing data:', error);
      // Generate sample billing data if API fails
      const defaultAmount = profile?.tuitionRate || 500;
      const childName = profile?.firstName && profile?.lastName 
        ? `${profile.firstName} ${profile.lastName}` 
        : 'Child';
      
      setBillingData({
        invoices: [{
          _id: '1',
          invoiceNumber: 'INV-001',
          amount: defaultAmount,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          description: `Monthly tuition for ${childName}`,
          childId: activeChildId
        }],
        payments: []
      });
    }
  };

  // Process payment
  const processPayment = async (invoice) => {
    setPaymentLoading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update invoice status to paid
      const updatedInvoices = billingData.invoices.map(inv => 
        inv._id === invoice._id ? { ...inv, status: 'paid' } : inv
      );
      
      // Add payment record
      const newPayment = {
        _id: Date.now().toString(),
        invoiceId: invoice._id,
        amount: invoice.amount,
        paymentDate: new Date().toISOString(),
        method: 'online',
        status: 'completed'
      };
      
      setBillingData({
        invoices: updatedInvoices,
        payments: [...billingData.payments, newPayment]
      });
      
      setPaymentDialog({ open: false, invoice: null });
      alert('Payment processed successfully!');
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Schedule display component
  const ScheduleCard = () => {
    if (!profile?.schedule) return null;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    return (
      <Card>
        <CardHeader title="Weekly Schedule" />
        <CardContent>
          <Grid container spacing={2}>
            {days.map((day, index) => {
              const daySchedule = profile.schedule[day];
              return (
                <Grid item xs={12} sm={6} md={4} key={day}>
                  <Box sx={{ 
                    p: 2, 
                    border: '1px solid', 
                    borderColor: daySchedule?.enrolled ? 'success.main' : 'grey.300',
                    borderRadius: 1,
                    bgcolor: daySchedule?.enrolled ? 'success.50' : 'grey.50'
                  }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {dayNames[index]}
                    </Typography>
                    {daySchedule?.enrolled ? (
                      <Box>
                        <Typography variant="body2" color="success.main">
                          ✓ Enrolled
                        </Typography>
                        <Typography variant="body2">
                          {daySchedule.start} - {daySchedule.end}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not enrolled
                      </Typography>
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // StaffCard removed - moved to different location

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Parent Dashboard</Typography>
      {errorMsg && (
        <Box sx={{ mb: 2, p: 1.5, borderRadius: 1, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.light', color: 'warning.dark' }}>
          {errorMsg}
        </Box>
      )}

      {/* Parent + Child summary */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Parent</Typography>
              <Typography variant="body1">You are logged in as the parent. Manage your child's information below.</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Selected Child</Typography>
              <Typography variant="body1">{(children.find(c => c._id === activeChildId)?.firstName || '-') + ' ' + (children.find(c => c._id === activeChildId)?.lastName || '')}</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Child selector */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Avatar><Person /></Avatar>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="child-select-label">Select Child</InputLabel>
              <Select
                labelId="child-select-label"
                label="Select Child"
                value={activeChildId}
                onChange={(e) => setActiveChildId(e.target.value)}
              >
                {children.map((c) => (
                  <MenuItem key={c._id} value={c._id}>{c.firstName} {c.lastName}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item>
            <IconButton onClick={() => activeChildId && fetchChildData(activeChildId)}><Refresh /></IconButton>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs - show only up to Feedback (index 0..7). Sidebar links open others. */}
      <Paper sx={{ p: 2 }}>
        {tab <= 7 && (
          <>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons allowScrollButtonsMobile>
          <Tab label="Profile" icon={<ChildCare />} iconPosition="start" />
          <Tab label="Medical & Emergency" icon={<Event />} iconPosition="start" />
          <Tab label="Gallery" icon={<PhotoAlbum />} iconPosition="start" />
          <Tab label="Attendance" icon={<Event />} iconPosition="start" />
          <Tab label="Activities" icon={<Event />} iconPosition="start" />
          <Tab label="Meals" icon={<LocalDining />} iconPosition="start" />
          <Tab label="Staff" icon={<Person />} iconPosition="start" />
          <Tab label="Feedback" icon={<Assessment />} iconPosition="start" />
        </Tabs>
        <Divider sx={{ mb: 2 }} />
          </>
        )}

        {/* Content */}
        {user?.role === 'parent' && (!activeChildId || children.length === 0) && (
          <Box>
            {children.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <ChildCare sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No Child Profiles Found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Your child profile has not been created yet. Please contact the administration to create your child profile before you can access the dashboard.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Once your child profile is created by the admin, you will be able to view your child's information, attendance, activities, and more.
                </Typography>
                <Button variant="contained" onClick={() => setTab(8)}>
                  Submit Admission Request
                </Button>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No child selected.
                </Typography>
                <Button variant="contained" onClick={() => setTab(7)}>Go to Admissions</Button>
              </Box>
            )}
          </Box>
        )}

        {user?.role === 'parent' && activeChildId && children.length > 0 && (
          <Box>
            {tab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <ProfileCard />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Notes" action={
                      editMode ? <Button size="small" startIcon={<Save />} onClick={handleSave}>Save</Button>
                               : <Button size="small" startIcon={<Edit />} onClick={() => setEditMode(true)}>Edit</Button>
                    } />
                    <CardContent>
                      <TextField
                        fullWidth
                        multiline
                        minRows={4}
                        value={editFields.notes}
                        onChange={(e) => setEditFields((f) => ({ ...f, notes: e.target.value }))}
                        placeholder="Any notes you'd like to add"
                        disabled={!editMode}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <ScheduleCard />
                </Grid>
                {/* AI-Powered Recommendations - Featured */}
                <Grid item xs={12}>
                  <Card sx={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                    color: 'white',
                    mb: 2
                  }}>
                    <CardHeader 
                      title="🤖 AI-Powered Recommendations" 
                      subheader="Personalized insights for your child's development"
                      titleTypographyProps={{ color: 'inherit', fontWeight: 'bold' }}
                      subheaderTypographyProps={{ color: 'rgba(255,255,255,0.8)' }}
                    />
                    <CardContent>
                      <Typography variant="body1" sx={{ mb: 2, opacity: 0.9 }}>
                        Our AI system analyzes your child's progress, interests, and developmental milestones to provide personalized recommendations.
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                          <Box 
                            sx={{ 
                              textAlign: 'center', 
                              p: 2, 
                              bgcolor: aiRecommendationType === 'education' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', 
                              borderRadius: 1,
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.2)',
                                transform: 'translateY(-2px)'
                              }
                            }}
                            onClick={() => handleAiRecommendationClick(aiRecommendationType === 'education' ? null : 'education')}
                          >
                            <Typography variant="h6" gutterBottom>📚 Education</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                              Tailored learning activities
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Box 
                            sx={{ 
                              textAlign: 'center', 
                              p: 2, 
                              bgcolor: aiRecommendationType === 'social' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', 
                              borderRadius: 1,
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.2)',
                                transform: 'translateY(-2px)'
                              }
                            }}
                            onClick={() => handleAiRecommendationClick(aiRecommendationType === 'social' ? null : 'social')}
                          >
                            <Typography variant="h6" gutterBottom>👥 Social</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                              Optimal peer groupings
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                          <Box 
                            sx={{ 
                              textAlign: 'center', 
                              p: 2, 
                              bgcolor: aiRecommendationType === 'nutrition' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', 
                              borderRadius: 1,
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.2)',
                                transform: 'translateY(-2px)'
                              }
                            }}
                            onClick={() => handleAiRecommendationClick(aiRecommendationType === 'nutrition' ? null : 'nutrition')}
                          >
                            <Typography variant="h6" gutterBottom>🥗 Nutrition</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                              Smart meal suggestions
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* AI Recommendations Display */}
                {aiRecommendationType === 'education' && educationRecommendations.length > 0 && (
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader 
                        title="📚 Educational Recommendations" 
                        subheader="Personalized learning activities for your child"
                      />
                      <CardContent>
                        <Grid container spacing={2}>
                          {educationRecommendations.map((rec) => (
                            <Grid item xs={12} md={4} key={rec.id}>
                              <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                  <Typography variant="h6" gutterBottom color="primary">
                                    {rec.title}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {rec.description}
                                  </Typography>
                                  <Box sx={{ mb: 2 }}>
                                    <Chip 
                                      label={rec.category} 
                                      size="small" 
                                      color="primary" 
                                      variant="outlined"
                                      sx={{ mr: 1 }}
                                    />
                                    <Chip 
                                      label={`Ages ${rec.ageRange}`} 
                                      size="small" 
                                      color="secondary" 
                                      variant="outlined"
                                    />
                                  </Box>
                                  <Typography variant="body2" gutterBottom>
                                    <strong>Benefits:</strong>
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {rec.benefits.map((benefit, idx) => (
                                      <Chip 
                                        key={idx} 
                                        label={benefit} 
                                        size="small" 
                                        color="success" 
                                        variant="filled"
                                      />
                                    ))}
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {aiRecommendationType === 'social' && socialRecommendations && (
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader 
                        title="👥 Social Development Recommendations" 
                        subheader="Building friendship and social skills"
                      />
                      <CardContent>
                        <Grid container spacing={2}>
                          {socialPlaymates.slice(0, 3).map((playmate, idx) => (
                            <Grid item xs={12} md={4} key={`playmate-${idx}`}>
                              <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                  <Typography variant="overline" color="primary.main">
                                    Playmate Match
                                  </Typography>
                                  <Typography variant="h6" gutterBottom>
                                    {playmate.name || 'Compatible friend'}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Age {playmate.age || '—'} • Compatibility {playmate.compatibility ? `${playmate.compatibility}%` : 'High'}
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {(playmate.sharedInterests || []).slice(0, 4).map((interest, interestIdx) => (
                                      <Chip 
                                        key={interestIdx} 
                                        label={interest} 
                                        size="small" 
                                        color="primary" 
                                      />
                                    ))}
                                    {(!playmate.sharedInterests || playmate.sharedInterests.length === 0) && (
                                      <Chip label="Balanced interests" size="small" color="default" />
                                    )}
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}

                          {socialGroupActivities.length > 0 && (
                            <Grid item xs={12} md={6} lg={4}>
                              <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                  <Typography variant="overline" color="secondary.main">
                                    Group Activities
                                  </Typography>
                                  <Typography variant="h6" gutterBottom>
                                    Collaboration Boosters
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {socialGroupActivities.map((activity, idx) => (
                                      <Chip 
                                        key={idx} 
                                        label={activity} 
                                        size="small" 
                                        color="secondary" 
                                        variant="outlined"
                                      />
                                    ))}
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          )}

                          {socialSkillsFocus.length > 0 && (
                            <Grid item xs={12} md={6} lg={4}>
                              <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                  <Typography variant="overline" color="success.main">
                                    Social Skills Focus
                                  </Typography>
                                  <Typography variant="h6" gutterBottom>
                                    Confidence Builders
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {socialSkillsFocus.map((skill, idx) => (
                                      <Chip 
                                        key={idx} 
                                        label={skill} 
                                        size="small" 
                                        color="success" 
                                        variant="outlined"
                                      />
                                    ))}
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {aiRecommendationType === 'nutrition' && nutritionRecommendations && (
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader 
                        title="🥗 Nutrition Recommendations" 
                        subheader="Healthy eating for optimal growth and development"
                      />
                      <CardContent>
                        <Grid container spacing={2}>
                          {normalizedNutritionItems.map((item) => (
                            <Grid item xs={12} md={4} key={item.id}>
                              <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                  <Typography variant="overline" color="primary.main">
                                    Meal Idea
                                  </Typography>
                                  <Typography variant="h6" gutterBottom>
                                    {item.title}
                                  </Typography>
                                  {item.description && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                      {item.description}
                                    </Typography>
                                  )}
                                  {item.tags.length > 0 && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                      {item.tags.map((tag, idx) => (
                                        <Chip 
                                          key={idx} 
                                          label={tag} 
                                          size="small" 
                                          color="success" 
                                          variant="outlined"
                                        />
                                      ))}
                                    </Box>
                                  )}
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}

                          {(nutritionRecommendations.tips || []).length > 0 && (
                            <Grid item xs={12} md={normalizedNutritionItems.length ? 6 : 12}>
                              <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                  <Typography variant="overline" color="secondary.main">
                                    Nutrition Tips
                                  </Typography>
                                  <Typography variant="h6" gutterBottom>
                                    Daily Habits
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {nutritionRecommendations.tips.map((tip, idx) => (
                                      <Typography key={idx} variant="body2">
                                        • {tip}
                                      </Typography>
                                    ))}
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          )}

                          {(nutritionRecommendations.allergies || []).length > 0 && (
                            <Grid item xs={12} md={normalizedNutritionItems.length ? 6 : 12}>
                              <Card variant="outlined" sx={{ height: '100%' }}>
                                <CardContent>
                                  <Typography variant="overline" color="warning.main">
                                    Allergy Watchlist
                                  </Typography>
                                  <Typography variant="h6" gutterBottom>
                                    Ingredients to Avoid
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {nutritionRecommendations.allergies.map((allergy, idx) => (
                                      <Chip 
                                        key={idx} 
                                        label={allergy} 
                                        color="warning" 
                                        size="small" 
                                      />
                                    ))}
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          )}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

              </Grid>
            )}

            {tab === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Allergies" />
                    <CardContent>
                      <AllergiesEditor />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Medical Information" />
                    <CardContent>
                      <MedicalEditor />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Emergency Contacts" />
                    <CardContent>
                      <EmergencyEditor />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Authorized Pickups" />
                    <CardContent>
                      <AuthorizedPickupEditor />
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Display current medical information */}
                <Grid item xs={12}>
                  <Card>
                    <CardHeader title="Current Medical Information" />
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="h6" gutterBottom>Allergies</Typography>
                          {profile?.allergies && profile.allergies.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {profile.allergies.map((allergy, idx) => (
                                <Chip key={idx} label={allergy} color="warning" size="small" />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">No allergies recorded</Typography>
                          )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="h6" gutterBottom>Medical Conditions</Typography>
                          {profile?.medicalConditions && profile.medicalConditions.length > 0 ? (
                            <Box>
                              {profile.medicalConditions.map((condition, idx) => (
                                <Box key={idx} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                                  <Typography variant="body2"><strong>{condition.condition}</strong></Typography>
                                  {condition.medication && (
                                    <Typography variant="caption" color="text.secondary">
                                      Medication: {condition.medication}
                                    </Typography>
                                  )}
                                  {condition.instructions && (
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      Instructions: {condition.instructions}
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">No medical conditions recorded</Typography>
                          )}
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  {editMode ? (
                    <Button variant="contained" startIcon={<Save />} onClick={handleSave}>Save Changes</Button>
                  ) : (
                    <Button variant="outlined" startIcon={<Edit />} onClick={() => setEditMode(true)}>Enable Editing</Button>
                  )}
                </Grid>
              </Grid>
            )}

            {tab === 2 && (
              <Gallery />
            )}

            {tab === 3 && (
              <Box>
                <Grid container spacing={3}>
                  {/* Today's Status Card */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader 
                        title="📅 Today's Attendance" 
                        subheader={new Date().toLocaleDateString()}
                        avatar={<Event />}
                      />
                      <CardContent>
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h4" color={attendance?.today?.status === 'present' ? 'success.main' : 'text.secondary'} gutterBottom>
                            {attendance?.today?.status ? 
                              (attendance.today.status === 'present' ? '✅ Present' : '❌ Absent') : 
                              '⏳ Not Checked In'
                            }
                          </Typography>
                          {attendance?.today?.checkIn && (
                            <Typography variant="body1" gutterBottom>
                              <strong>Check-in:</strong> {new Date(attendance.today.checkIn).toLocaleTimeString()}
                            </Typography>
                          )}
                          {attendance?.today?.checkOut && (
                            <Typography variant="body1">
                              <strong>Check-out:</strong> {new Date(attendance.today.checkOut).toLocaleTimeString()}
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Weekly Summary */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader title="📊 This Week's Summary" />
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                              <Typography variant="h3" color="success.main">
                                {attendance?.week?.present || 0}
                              </Typography>
                              <Typography variant="body2" color="success.main">
                                Days Present
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.50', borderRadius: 1 }}>
                              <Typography variant="h3" color="error.main">
                                {attendance?.week?.absent || 0}
                              </Typography>
                              <Typography variant="body2" color="error.main">
                                Days Absent
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            Attendance Rate: <strong>{attendance?.week?.rate || 0}%</strong>
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={attendance?.week?.rate || 0} 
                            color={attendance?.week?.rate >= 80 ? 'success' : 'warning'}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Attendance Calendar/History */}
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader 
                        title="📈 Attendance History" 
                        subheader="Recent attendance records"
                        action={
                          <IconButton onClick={() => fetchChildData(activeChildId)} title="Refresh">
                            <Refresh />
                          </IconButton>
                        }
                      />
                      <CardContent>
                        {attendance?.history && attendance.history.length > 0 ? (
                          <Box>
                            <Grid container spacing={1} sx={{ mb: 2 }}>
                              <Grid item xs={3}><Typography variant="subtitle2">Date</Typography></Grid>
                              <Grid item xs={3}><Typography variant="subtitle2">Check-in</Typography></Grid>
                              <Grid item xs={3}><Typography variant="subtitle2">Check-out</Typography></Grid>
                              <Grid item xs={3}><Typography variant="subtitle2">Status</Typography></Grid>
                            </Grid>
                            <Divider sx={{ mb: 2 }} />
                            {attendance.history.slice(0, 10).map((record, idx) => (
                              <Grid container spacing={1} key={idx} sx={{ 
                                mb: 1, 
                                p: 1, 
                                bgcolor: idx % 2 === 0 ? 'grey.50' : 'white',
                                borderRadius: 1,
                                alignItems: 'center'
                              }}>
                                <Grid item xs={3}>
                                  <Typography variant="body2">
                                    {formatDate(record.date)}
                                  </Typography>
                                </Grid>
                                <Grid item xs={3}>
                                  <Typography variant="body2" color="success.main">
                                    {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}
                                  </Typography>
                                </Grid>
                                <Grid item xs={3}>
                                  <Typography variant="body2" color="error.main">
                                    {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}
                                  </Typography>
                                </Grid>
                                <Grid item xs={3}>
                                  <Chip 
                                    label={record.status || 'Unknown'} 
                                    size="small" 
                                    color={record.status === 'present' ? 'success' : 
                                           record.status === 'absent' ? 'error' : 'default'}
                                  />
                                </Grid>
                              </Grid>
                            ))}
                          </Box>
                        ) : (
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Event sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" gutterBottom color="text.secondary">
                              No Attendance Records Yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Attendance records will appear here once staff starts tracking your child's attendance.
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Information Note */}
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.main' }}>
                      <Typography variant="body2" color="info.main">
                        <strong>ℹ️ Note:</strong> Attendance is tracked by daycare staff. If you notice any discrepancies, 
                        please contact your child's assigned staff or use the messaging feature to report issues.
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {tab === 4 && (
              <Box>
                <Grid container spacing={3}>
                  {/* Activities Summary */}
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardHeader 
                        title="🎯 Activities Overview"
                        subheader="Your child's participation summary"
                      />
                      <CardContent>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h3" color="primary.main" gutterBottom>
                            {activities?.count || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Activities This Month
                          </Typography>
                          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around' }}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" color="success.main">
                                {Math.floor((activities?.count || 0) * 0.7)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Completed
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" color="warning.main">
                                {Math.floor((activities?.count || 0) * 0.3)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                In Progress
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Activity Categories */}
                  <Grid item xs={12} md={8}>
                    <Card>
                      <CardHeader title="📚 Activity Categories" />
                      <CardContent>
                        <Grid container spacing={2}>
                          {[
                            { name: 'Educational', icon: '📖', color: 'primary', count: Math.floor((activities?.count || 0) * 0.4) },
                            { name: 'Creative Arts', icon: '🎨', color: 'secondary', count: Math.floor((activities?.count || 0) * 0.3) },
                            { name: 'Physical Play', icon: '⚽', color: 'success', count: Math.floor((activities?.count || 0) * 0.2) },
                            { name: 'Social Games', icon: '👫', color: 'info', count: Math.floor((activities?.count || 0) * 0.1) }
                          ].map((category, idx) => (
                            <Grid item xs={6} sm={3} key={idx}>
                              <Paper sx={{ 
                                p: 2, 
                                textAlign: 'center',
                                border: '1px solid',
                                borderColor: `${category.color}.200`,
                                bgcolor: `${category.color}.50`,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: 3
                                }
                              }}>
                                <Typography variant="h4" sx={{ mb: 1 }}>
                                  {category.icon}
                                </Typography>
                                <Typography variant="h6" color={`${category.color}.main`} gutterBottom>
                                  {category.count}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {category.name}
                                </Typography>
                              </Paper>
                            </Grid>
                          ))}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Recent Activities List */}
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader 
                        title="📅 Recent Activities" 
                        subheader="Latest activities your child participated in"
                        action={
                          <IconButton onClick={() => fetchChildData(activeChildId)} title="Refresh">
                            <Refresh />
                          </IconButton>
                        }
                      />
                      <CardContent>
                        {(activities?.recent || []).length === 0 ? (
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Event sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" gutterBottom color="text.secondary">
                              No Activities Yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Your child's activities will appear here once they start participating in daycare programs.
                            </Typography>
                          </Box>
                        ) : (
                          <Grid container spacing={2}>
                            {activities.recent.map((activity, idx) => (
                              <Grid item xs={12} md={6} key={idx}>
                                <Card variant="outlined" sx={{ 
                                  p: 2,
                                  transition: 'all 0.3s ease',
                                  '&:hover': {
                                    boxShadow: 3,
                                    transform: 'translateY(-1px)'
                                  }
                                }}>
                                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                                      {activity.category === 'education' ? '📚' :
                                       activity.category === 'art' ? '🎨' :
                                       activity.category === 'physical' ? '⚽' :
                                       activity.category === 'music' ? '🎵' : '🎯'}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="h6" gutterBottom>
                                        {activity.title || 'Activity'}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        {activity.description || 'No description available'}
                                      </Typography>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Chip 
                                          label={activity.category || 'General'} 
                                          size="small" 
                                          color="primary" 
                                          variant="outlined"
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                          {formatDate(activity.date)}
                                        </Typography>
                                      </Box>
                                      {activity.participation && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Typography variant="caption" color="text.secondary">
                                            Participation:
                                          </Typography>
                                          <Chip 
                                            label={activity.participation} 
                                            size="small" 
                                            color={activity.participation === 'Excellent' ? 'success' : 
                                                   activity.participation === 'Good' ? 'primary' : 'default'}
                                          />
                                        </Box>
                                      )}
                                    </Box>
                                  </Box>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Activity Milestones */}
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader title="🏆 Activity Milestones" />
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom color="success.main">
                              🎉 Recent Achievements
                            </Typography>
                            {(reports?.milestones?.completed || []).slice(0, 3).map((milestone, idx) => (
                              <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                                <Typography variant="body1" fontWeight="bold">
                                  ✅ {milestone.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Achieved: {formatDate(milestone.achievedDate)}
                                </Typography>
                              </Box>
                            )) || (
                              <Typography variant="body2" color="text.secondary">
                                No milestones achieved yet.
                              </Typography>
                            )}
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom color="warning.main">
                              🎯 Upcoming Goals
                            </Typography>
                            {(reports?.milestones?.upcoming || []).slice(0, 3).map((milestone, idx) => (
                              <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                                <Typography variant="body1" fontWeight="bold">
                                  🎯 {milestone.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Target: {formatDate(milestone.targetDate)}
                                </Typography>
                              </Box>
                            )) || (
                              <Typography variant="body2" color="text.secondary">
                                No upcoming milestones set.
                              </Typography>
                            )}
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {tab === 5 && (
              <Box>
                <Card sx={{ mb: 3 }}>
                  <CardHeader title="Meal Plan" />
                  <CardContent>
                  {meals?.title && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" gutterBottom>{meals.title}</Typography>
                      {meals.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {meals.description}
                        </Typography>
                      )}
                      {meals.createdBy && (
                        <Typography variant="caption" color="text.secondary">
                          Planned by: {meals.createdBy.firstName} {meals.createdBy.lastName}
                        </Typography>
                      )}
                    </Box>
                  )}
                  
                  {(meals?.plan || []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      {meals?.message || 'No meal plan available for this week.'}
                    </Typography>
                  ) : (
                    <Box>
                      {meals.plan.map((dayPlan, idx) => (
                        <Box key={idx} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                          <Typography variant="subtitle1" gutterBottom sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                            {dayPlan.day}
                          </Typography>
                          
                          <Grid container spacing={2}>
                            {dayPlan.menu.breakfast && (
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Breakfast:</Typography>
                                <Typography variant="body2">{dayPlan.menu.breakfast || 'Not specified'}</Typography>
                              </Grid>
                            )}
                            
                            {dayPlan.menu.morningSnack && (
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Morning Snack:</Typography>
                                <Typography variant="body2">{dayPlan.menu.morningSnack || 'Not specified'}</Typography>
                              </Grid>
                            )}
                            
                            {dayPlan.menu.lunch && (
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Lunch:</Typography>
                                <Typography variant="body2">{dayPlan.menu.lunch || 'Not specified'}</Typography>
                              </Grid>
                            )}
                            
                            {dayPlan.menu.afternoonSnack && (
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">Afternoon Snack:</Typography>
                                <Typography variant="body2">{dayPlan.menu.afternoonSnack || 'Not specified'}</Typography>
                              </Grid>
                            )}
                          </Grid>
                          
                          {dayPlan.notes && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">Notes:</Typography>
                              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{dayPlan.notes}</Typography>
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
              
              {/* Meal Recommendation System */}
              <MealRecommendation />
            </Box>
            )}

            {/* Staff Information Tab */}
            {tab === 6 && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader 
                        title="👥 Assigned Staff" 
                        subheader="Your child's dedicated caregivers"
                        avatar={<Person />}
                        action={
                          <IconButton onClick={() => fetchChildData(activeChildId)} title="Refresh Staff Info">
                            <Refresh />
                          </IconButton>
                        }
                      />
                      <CardContent>
                        {assignedStaff && assignedStaff.length > 0 ? (
                          <Grid container spacing={2}>
                            {assignedStaff.map((staff, index) => (
                              <Grid item xs={12} md={6} key={staff._id || index}>
                                <Card variant="outlined" sx={{ p: 2 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Avatar 
                                      sx={{ 
                                        width: 64, 
                                        height: 64, 
                                        bgcolor: 'primary.main',
                                        fontSize: '1.5rem'
                                      }}
                                      src={staff.profileImage ? toAbsoluteUrl(staff.profileImage) : undefined}
                                    >
                                      {!staff.profileImage && (staff.firstName?.[0] || 'S')}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="h6" gutterBottom>
                                        {staff.firstName} {staff.lastName}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary" gutterBottom>
                                        📧 {staff.email}
                                      </Typography>
                                      {staff.phone && (
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                          📞 {staff.phone}
                                        </Typography>
                                      )}
                                      <Chip 
                                        label="Primary Caregiver" 
                                        size="small" 
                                        color="primary" 
                                        sx={{ mt: 1 }}
                                      />
                                    </Box>
                                  </Box>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        ) : (
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Person sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" gutterBottom color="text.secondary">
                              No Staff Assigned Yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                              Your child hasn't been assigned to a staff member yet. Please contact the administration for assistance.
                            </Typography>
                            <Button 
                              variant="outlined" 
                              onClick={() => fetchChildData(activeChildId)}
                              startIcon={<Refresh />}
                            >
                              Check Again
                            </Button>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Contact Information */}
                  {assignedStaff && assignedStaff.length > 0 && (
                    <Grid item xs={12}>
                      <Card>
                        <CardHeader title="📞 Contact Information" />
                        <CardContent>
                          <Typography variant="body1" gutterBottom>
                            <strong>How to reach your child's caregivers:</strong>
                          </Typography>
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              • For daily updates and concerns, contact the assigned staff directly
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              • For emergencies, call the main daycare number: <strong>(555) 123-4567</strong>
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              • Staff are available during daycare hours: 7:00 AM - 6:00 PM
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              • Please allow up to 2 hours for non-urgent responses during busy periods
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}

                </Grid>
              </Box>
            )}

            {/* Feedback & Complaints with AI Classification */}
            {tab === 7 && (
              <Box>
                <Card key="feedback-card-2024">
                  <CardHeader 
                    title="🧠 Feedback & AI Analysis" 
                    subheader="Share your feedback and get instant AI-powered sentiment analysis"
                  />
                  <CardContent>
                    <Grid container spacing={3}>
                      {/* Left Side - Submit Feedback */}
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom color="primary">Submit Feedback</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                              <InputLabel>Category</InputLabel>
                              <Select 
                                value={editFields.fbCategory || 'feedback'} 
                                onChange={(e) => setEditFields(f => ({ ...f, fbCategory: e.target.value }))}
                                label="Category"
                              >
                                <MenuItem value="feedback">Feedback</MenuItem>
                                <MenuItem value="complaint">Complaint</MenuItem>
                                <MenuItem value="suggestion">Suggestion</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField 
                              fullWidth 
                              label="Subject" 
                              value={editFields.fbSubject || ''} 
                              onChange={(e) => setEditFields(f => ({ ...f, fbSubject: e.target.value }))} 
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField 
                              fullWidth 
                              multiline 
                              minRows={4} 
                              label="Details" 
                              value={editFields.fbDetails || ''} 
                              onChange={(e) => setEditFields(f => ({ ...f, fbDetails: e.target.value }))} 
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Button 
                              variant="contained" 
                              color="primary"
                              fullWidth
                              onClick={async () => {
                                try {
                                  const payload = { 
                                    category: editFields.fbCategory || 'feedback', 
                                    subject: editFields.fbSubject || '', 
                                    details: editFields.fbDetails || '' 
                                  };
                                  if (!payload.subject || !payload.details) return;
                                  await api.post('/api/parents/me/feedback', payload);
                                  setEditFields(f => ({ ...f, fbSubject: '', fbDetails: '' }));
                                  alert('Feedback submitted successfully!');
                                } catch (e) { 
                                  console.error('Feedback submit error:', e);
                                  alert('Error submitting feedback. Please try again.');
                                }
                              }}
                            >
                              Submit Feedback
                            </Button>
                          </Grid>
                        </Grid>
                      </Grid>

                      {/* Right Side - AI Sentiment Analysis */}
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom color="secondary">AI Sentiment Analysis</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              multiline
                              minRows={3}
                              label="Feedback Text"
                              placeholder="Enter feedback text to analyze..."
                              value={editFields.aiFeedbackText || ''}
                              onChange={(e) => setEditFields(f => ({ ...f, aiFeedbackText: e.target.value }))}
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                              <InputLabel>Service Category</InputLabel>
                              <Select
                                value={editFields.aiServiceCategory || 'meal'}
                                onChange={(e) => setEditFields(f => ({ ...f, aiServiceCategory: e.target.value }))}
                                label="Service Category"
                              >
                                <MenuItem value="meal">Meal</MenuItem>
                                <MenuItem value="activity">Activity</MenuItem>
                                <MenuItem value="communication">Communication</MenuItem>
                                <MenuItem value="safety">Safety</MenuItem>
                                <MenuItem value="general">General</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                              <InputLabel>Rating (1-5)</InputLabel>
                              <Select
                                value={editFields.aiRating || 5}
                                onChange={(e) => setEditFields(f => ({ ...f, aiRating: e.target.value }))}
                                label="Rating (1-5)"
                              >
                                <MenuItem value={1}>1 - Very Poor</MenuItem>
                                <MenuItem value={2}>2 - Poor</MenuItem>
                                <MenuItem value={3}>3 - Average</MenuItem>
                                <MenuItem value={4}>4 - Good</MenuItem>
                                <MenuItem value={5}>5 - Excellent</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12}>
                            <Button 
                              variant="contained" 
                              color="secondary"
                              fullWidth
                              onClick={async () => {
                                try {
                                  if (!editFields.aiFeedbackText) {
                                    alert('Please enter feedback text to analyze');
                                    return;
                                  }
                                  
                                  const response = await api.post('/api/feedback-classification/predict', {
                                    text: editFields.aiFeedbackText,
                                    serviceCategory: editFields.aiServiceCategory || 'meal',
                                    rating: parseInt(editFields.aiRating) || 5
                                  });
                                  
                                  setEditFields(f => ({ 
                                    ...f, 
                                    aiResult: response.data.prediction,
                                    aiConfidence: response.data.confidence,
                                    aiAnalysis: response.data
                                  }));
                                } catch (e) {
                                  console.error('AI Classification error:', e);
                                  alert('Error analyzing feedback. Please try again.');
                                }
                              }}
                            >
                              Classify Sentiment
                            </Button>
                          </Grid>
                          
                          {/* Results Display */}
                          {editFields.aiResult && (
                            <Grid item xs={12}>
                              <Card variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Typography variant="h6" gutterBottom>
                                  Analysis Results
                                </Typography>
                                <Box sx={{ mb: 2 }}>
                                  <Chip 
                                    label={editFields.aiResult === 'Positive' ? '✅ Positive' : '⚠️ Needs Improvement'} 
                                    color={editFields.aiResult === 'Positive' ? 'success' : 'warning'}
                                    size="large"
                                  />
                                </Box>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Confidence:</strong> {(editFields.aiConfidence * 100).toFixed(1)}%
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Service Category:</strong> {editFields.aiServiceCategory}
                                </Typography>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Rating:</strong> {editFields.aiRating}/5
                                </Typography>
                                {editFields.aiAnalysis?.explanation && (
                                  <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                                    {editFields.aiAnalysis.explanation}
                                  </Typography>
                                )}
                              </Card>
                            </Grid>
                          )}
                        </Grid>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Reports & Analytics */}
            {tab === 8 && (
              <Box>
                <Grid container spacing={3}>
                  {/* Attendance Summary */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader 
                    title="Attendance Summary" 
                    avatar={<Assessment />}
                    action={<IconButton onClick={() => fetchChildData(activeChildId)}><Refresh /></IconButton>}
                  />
                  <CardContent>
                    {reports.attendance.summary ? (
                      <Box>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="h4" color="primary">
                              {reports.attendance.summary.presentDays || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Days Present
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="h4" color="error">
                              {reports.attendance.summary.absentDays || 0}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Days Absent
                            </Typography>
                          </Grid>
                        </Grid>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2">
                              <strong>Attendance Rate:</strong> {reports.attendance.summary.attendanceRate || 0}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {reports.attendance.summary.attendanceRate >= 90 ? 'Excellent' : 
                               reports.attendance.summary.attendanceRate >= 80 ? 'Good' : 
                               reports.attendance.summary.attendanceRate >= 70 ? 'Fair' : 'Needs Improvement'}
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={reports.attendance.summary.attendanceRate || 0} 
                            sx={{ height: 8, borderRadius: 4 }}
                            color={reports.attendance.summary.attendanceRate >= 90 ? 'success' : 
                                   reports.attendance.summary.attendanceRate >= 80 ? 'primary' : 
                                   reports.attendance.summary.attendanceRate >= 70 ? 'warning' : 'error'}
                          />
                        </Box>
                        <Typography variant="body2">
                          <strong>This Month:</strong> {reports.attendance.summary.thisMonth || 0} days
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No attendance data available yet.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Activity Participation */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader 
                    title="Activity Participation" 
                    avatar={<TrendingUp />}
                  />
                  <CardContent>
                    {reports.activities.participation && reports.activities.participation.length > 0 ? (
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          Recent Activities
                        </Typography>
                        {reports.activities.participation.slice(0, 5).map((activity, idx) => (
                          <Box key={idx} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">{activity.name}</Typography>
                            <Chip 
                              label={activity.participation} 
                              size="small" 
                              color={activity.participation === 'Active' ? 'success' : 'default'}
                            />
                          </Box>
                        ))}
                        {reports.activities.trends && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2">
                              <strong>Participation Trend:</strong> {reports.activities.trends}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No activity participation data available yet.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Development Milestones */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="Development Milestones" />
                  <CardContent>
                    {reports.milestones.completed && reports.milestones.completed.length > 0 ? (
                      <Box>
                        <Typography variant="h6" gutterBottom color="success.main">
                          Recently Achieved
                        </Typography>
                        {reports.milestones.completed.slice(0, 3).map((milestone, idx) => (
                          <Box key={idx} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">✓ {milestone.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(milestone.achievedDate)}
                            </Typography>
                          </Box>
                        ))}
                        {reports.milestones.upcoming && reports.milestones.upcoming.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" gutterBottom color="warning.main">
                              Upcoming Goals
                            </Typography>
                            {reports.milestones.upcoming.slice(0, 2).map((milestone, idx) => (
                              <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                                • {milestone.name}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No milestone data available yet.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Nutrition Insights */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="Nutrition Insights" />
                  <CardContent>
                    {reports.nutrition.consumption && reports.nutrition.consumption.length > 0 ? (
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          Meal Consumption
                        </Typography>
                        {reports.nutrition.consumption.slice(0, 4).map((meal, idx) => (
                          <Box key={idx} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                              <CircularProgress
                                variant="determinate"
                                value={meal.consumption}
                                size={40}
                                thickness={4}
                                color={meal.consumption >= 80 ? 'success' : meal.consumption >= 60 ? 'primary' : 'warning'}
                              />
                              <Box
                                sx={{
                                  top: 0,
                                  left: 0,
                                  bottom: 0,
                                  right: 0,
                                  position: 'absolute',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Typography variant="caption" component="div" color="text.secondary">
                                  {meal.consumption}%
                                </Typography>
                              </Box>
                            </Box>
                            <Box>
                              <Typography variant="body2">{meal.type}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {meal.consumption >= 80 ? 'Great!' : meal.consumption >= 60 ? 'Good' : 'Needs attention'}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                        {reports.nutrition.preferences && reports.nutrition.preferences.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2">
                              <strong>Favorites:</strong> {reports.nutrition.preferences.join(', ')}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No nutrition data available yet.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Quick Stats */}
              <Grid item xs={12}>
                <Card>
                  <CardHeader title="Quick Overview" />
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {activities.count || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Activities
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="success.main">
                            {gallery.length || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Photos Shared
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="info.main">
                            {meals.plan?.length || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Meal Plans
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="warning.main">
                            {reports.milestones.completed?.length || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Milestones Achieved
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

            {/* Admissions: add additional child */}
            {tab === 9 && (
              <Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader title="Add Another Child (Admission)" subheader="Your request will be reviewed by admin" />
                      <CardContent>
                        {admissionMsg && (
                          <Typography color="success.main" sx={{ mb: 1 }}>{admissionMsg}</Typography>
                        )}
                        {admissionError && (
                          <Typography color="error.main" sx={{ mb: 1 }}>{admissionError}</Typography>
                        )}
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Child Name" value={admissionForm.childName} onChange={(e) => setAdmissionForm(f => ({ ...f, childName: e.target.value }))} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth type="date" label="Date of Birth" value={admissionForm.childDob} onChange={(e) => setAdmissionForm(f => ({ ...f, childDob: e.target.value }))} InputLabelProps={{ shrink: true }} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField select fullWidth label="Gender" value={admissionForm.childGender} onChange={(e) => setAdmissionForm(f => ({ ...f, childGender: e.target.value }))}>
                              <MenuItem value="male">Male</MenuItem>
                              <MenuItem value="female">Female</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField select fullWidth label="Program" value={admissionForm.program} onChange={(e) => setAdmissionForm(f => ({ ...f, program: e.target.value }))}>
                              <MenuItem value="infant">Infant</MenuItem>
                              <MenuItem value="toddler">Toddler</MenuItem>
                              <MenuItem value="preschool">Preschool</MenuItem>
                              <MenuItem value="prekindergarten">Pre-Kindergarten</MenuItem>
                            </TextField>
                          </Grid>
                          <Grid item xs={12}>
                            <TextField fullWidth multiline minRows={3} label="Medical Info" value={admissionForm.medicalInfo} onChange={(e) => setAdmissionForm(f => ({ ...f, medicalInfo: e.target.value }))} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Emergency Contact Name" value={admissionForm.emergencyContactName} onChange={(e) => setAdmissionForm(f => ({ ...f, emergencyContactName: e.target.value }))} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Emergency Contact Phone (10 digits)" value={admissionForm.emergencyContactPhone} onChange={(e) => setAdmissionForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} />
                          </Grid>
                        </Grid>
                      </CardContent>
                      <CardContent>
                        <Button variant="contained" disabled={admissionLoading} onClick={async () => {
                          setAdmissionError('');
                          setAdmissionMsg('');
                          setAdmissionLoading(true);
                          try {
                            // Validate required fields before submission
                            if (!admissionForm.childName.trim()) {
                              throw new Error('Child name is required');
                            }
                            if (!admissionForm.childDob) {
                              throw new Error('Date of birth is required');
                            }
                            if (admissionForm.emergencyContactPhone && !/^\d{10}$/.test(admissionForm.emergencyContactPhone)) {
                              throw new Error('Emergency contact phone must be exactly 10 digits (if provided)');
                            }
                            
                            const payload = { ...admissionForm };
                            console.log('Submitting admission with payload:', payload);
                            const res = await api.post('/api/parents/me/admissions', payload);
                            setAdmissionMsg('✅ Admission submitted successfully! Awaiting admin approval.');
                            setAdmissions(a => [res.data.admission, ...a]);
                            setAdmissionForm({ childName: '', childDob: '', childGender: 'male', program: 'preschool', medicalInfo: '', emergencyContactName: '', emergencyContactPhone: '' });
                            
                            // Refresh admissions list to make sure we show the latest data
                            setTimeout(async () => {
                              try {
                                const admissionsRes = await api.get('/api/parents/me/admissions');
                                setAdmissions(admissionsRes.data || []);
                              } catch (refreshError) {
                                console.log('Failed to refresh admissions list:', refreshError);
                              }
                            }, 1000);
                          } catch (e) {
                            console.error('Admission submission error:', e);
                            const errorMsg = e?.response?.data?.message || 
                                           e?.response?.data?.details || 
                                           e?.message || 
                                           'Failed to submit admission';
                            setAdmissionError(errorMsg);
                            
                            // If there are validation errors, show them
                            if (e?.response?.data?.errors) {
                              const validationErrors = e.response.data.errors.map(err => err.msg).join(', ');
                              setAdmissionError(`Validation errors: ${validationErrors}`);
                            }
                          } finally {
                            setAdmissionLoading(false);
                          }
                        }}>Submit Admission</Button>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader title="My Admissions" />
                      <CardContent>
                        {admissions.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">No admissions yet.</Typography>
                        ) : (
                          <Box>
                            {admissions.map((a) => (
                              <Box key={a._id} sx={{ mb: 1, p: 1, border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
                                <Typography variant="body2"><strong>{a.child?.name}</strong> — {new Date(a.child?.dateOfBirth).toLocaleDateString()} • {a.child?.gender}</Typography>
                                <Typography variant="caption" color="text.secondary">Status: {a.status}</Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Notifications: visitor, pickup, emergency alerts */}
            {tab === 10 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Visitor & Pickup Notifications" subheader="Real-time alerts from the center" />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        You will receive notifications when someone arrives for pickup or visits your child.
                      </Typography>
                      <Box sx={{ p: 2, bgcolor: 'warning.50', border: '1px dashed', borderColor: 'warning.main', borderRadius: 1 }}>
                        <Typography variant="body2"><strong>Example:</strong> Grandma approved for pickup at 3:10 PM.</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader title="Emergency Alerts" subheader="Immediate notifications during emergencies" />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Critical alerts will be shown here and pushed to your device.
                      </Typography>
                      <Box sx={{ p: 2, bgcolor: 'error.50', border: '1px dashed', borderColor: 'error.main', borderRadius: 1 }}>
                        <Typography variant="body2"><strong>Example:</strong> Shelter-in-place drill completed successfully.</Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Messaging: direct messages to staff/admin */}
            {tab === 11 && (
              <Card>
                <CardHeader title="Messages" subheader="Send a message to staff or administration" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField select fullWidth label="To" value={editFields.to || 'staff'} onChange={(e) => setEditFields(f => ({ ...f, to: e.target.value }))}>
                        <MenuItem value="staff">Assigned Staff</MenuItem>
                        <MenuItem value="admin">Administration</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <TextField fullWidth label="Subject" value={editFields.subject || ''} onChange={(e) => setEditFields(f => ({ ...f, subject: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth multiline minRows={4} label="Message" value={editFields.body || ''} onChange={(e) => setEditFields(f => ({ ...f, body: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12} sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="contained" onClick={async () => {
                        try {
                          const payload = { to: editFields.to || 'staff', subject: editFields.subject || '', body: editFields.body || '' };
                          if (!payload.subject || !payload.body) return;
                          await api.post('/api/parents/me/messages', payload);
                          await api.get('/api/parents/me/messages');
                          setActivities(a => ({ ...a, recent: a.recent }));
                          setEditFields(f => ({ ...f, subject: '', body: '' }));
                          setGallery(g => g);
                          // optionally store messages state if needed
                        } catch (e) { console.error('Send message error:', e); }
                      }}>Send</Button>
                      <Button variant="text" onClick={async () => {
                        try { await api.get('/api/parents/me/messages'); } catch (e) { /* ignore */ }
                      }}>Refresh</Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Billing & Payments */}
            {tab === 12 && (
              <Box>
                {/* Child Tuition Overview */}
                <Card sx={{ mb: 3 }}>
                  <CardHeader 
                    title={`Tuition & Billing - ${profile?.firstName || 'Child'} ${profile?.lastName || ''}`}
                    subheader={`Program: ${profile?.program || 'N/A'} | Monthly Rate: $${profile?.tuitionRate || 0}`}
                  />
                  <CardContent>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                          <CardContent>
                            <Typography variant="h4">${profile?.tuitionRate || 0}</Typography>
                            <Typography variant="body2">Monthly Tuition</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                          <CardContent>
                            <Typography variant="h4">{billingData.payments.length}</Typography>
                            <Typography variant="body2">Payments Made</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                          <CardContent>
                            <Typography variant="h4">
                              {billingData.invoices.filter(inv => inv.status === 'pending').length}
                            </Typography>
                            <Typography variant="body2">Pending Invoices</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                          <CardContent>
                            <Typography variant="h4">
                              ${billingData.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0).toFixed(2)}
                            </Typography>
                            <Typography variant="body2">Total Paid</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Pending Invoices */}
                <Card sx={{ mb: 3 }}>
                  <CardHeader title="Pending Invoices" subheader="Outstanding payments for your child" />
                  <CardContent>
                    {billingData.invoices.filter(inv => inv.status === 'pending').length > 0 ? (
                      <Grid container spacing={2}>
                        {billingData.invoices.filter(inv => inv.status === 'pending').map((invoice) => (
                          <Grid item xs={12} md={6} key={invoice._id}>
                            <Card variant="outlined" sx={{ border: '1px solid', borderColor: 'warning.main' }}>
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                  <Box>
                                    <Typography variant="h6" color="warning.main">
                                      {invoice.invoiceNumber}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {invoice.description}
                                    </Typography>
                                  </Box>
                                  <Chip label={invoice.status.toUpperCase()} color="warning" size="small" />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                  <Typography variant="h5" color="success.main">
                                    ${invoice.amount.toFixed(2)}
                                  </Typography>
                                  <Typography variant="body2" color="error.main">
                                    Due: {new Date(invoice.dueDate).toLocaleDateString()}
                                  </Typography>
                                </Box>
                                <Button
                                  variant="contained"
                                  fullWidth
                                  onClick={() => setPaymentDialog({ open: true, invoice })}
                                  sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                                >
                                  Pay Now
                                </Button>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="h6" color="success.main">✅ All payments up to date!</Typography>
                        <Typography variant="body2" color="text.secondary">
                          No pending invoices for {profile?.firstName || 'your child'}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* Payment History */}
                <Card>
                  <CardHeader title="Payment History" subheader="Past payments and transactions" />
                  <CardContent>
                    {billingData.payments.length > 0 ? (
                      <Box>
                        {billingData.payments.map((payment) => (
                          <Box
                            key={payment._id}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 2,
                              borderBottom: '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <Box>
                              <Typography variant="body1" fontWeight="bold">
                                Payment #{payment._id}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(payment.paymentDate).toLocaleDateString()} • {payment.method}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="h6" color="success.main">
                                ${payment.amount.toFixed(2)}
                              </Typography>
                              <Chip label={payment.status.toUpperCase()} color="success" size="small" />
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" align="center">
                        No payment history available
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}


          </Box>
        )}
      </Paper>

      {/* Payment Processing Dialog */}
      <Dialog 
        open={paymentDialog.open} 
        onClose={() => setPaymentDialog({ open: false, invoice: null })}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Process Payment
        </DialogTitle>
        <DialogContent>
          {paymentDialog.invoice && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Invoice: {paymentDialog.invoice.invoiceNumber}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Description: {paymentDialog.invoice.description}
              </Typography>
              <Typography variant="h5" color="success.main" gutterBottom>
                Amount: ${paymentDialog.invoice.amount.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="error.main" gutterBottom>
                Due Date: {new Date(paymentDialog.invoice.dueDate).toLocaleDateString()}
              </Typography>
              
              <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2">
                  💳 This is a demo payment system. In production, this would integrate with a real payment gateway like Stripe or Razorpay.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setPaymentDialog({ open: false, invoice: null })}
            disabled={paymentLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => processPayment(paymentDialog.invoice)}
            variant="contained"
            disabled={paymentLoading}
            sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
          >
            {paymentLoading ? <CircularProgress size={20} /> : 'Pay Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParentDashboard;