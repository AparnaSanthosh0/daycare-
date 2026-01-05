import React, { useEffect, useState, useCallback } from 'react';
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
  DialogActions,
  Alert,
  Menu,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge
} from '@mui/material';
import {
  Person,
  ChildCare,
  PhotoCamera,
  Delete,
  Refresh,
  Event,
  Assessment,
  LocalHospital,
  Add,
  CheckCircle,
  Home,
  Favorite,
  ShoppingBag,
  Receipt,
  Message,
  ShoppingCart,
  Notifications,
  Logout as LogoutIcon
} from '@mui/icons-material';
import api, { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import MealRecommendation from '../../components/MealRecommendation';
import NannyServicesTab from '../../components/NannyServicesTab';

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

const ParentDashboard = ({ initialTab }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [, setLoading] = useState(false);
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Notifications state
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Data for active child
  const [profile, setProfile] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [profileImageVersion] = useState(0);
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
  
  // Billing states
  const [billingData, setBillingData] = useState({ invoices: [], payments: [] });
  const [paymentDialog, setPaymentDialog] = useState({ open: false, invoice: null });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Daycare sub-tabs state
  const [daycareTab, setDaycareTab] = useState(0);

  // Doctor Appointments states
  const [appointments, setAppointments] = useState([]);
  const [appointmentDialog, setAppointmentDialog] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    childId: '',
    appointmentDate: '',
    appointmentTime: '09:00',
    reason: '',
    appointmentType: 'onsite',
    isEmergency: false
  });
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [appointmentError, setAppointmentError] = useState('');
  const [appointmentSuccess, setAppointmentSuccess] = useState('');

  // Editable fields (parent-allowed)
  const [editFields, setEditFields] = useState({
    allergies: [],
    medicalConditions: [],
    emergencyContacts: [],
    authorizedPickup: [],
    notes: ''
  });

  // AI Recommendations state (kept for future use)
  // const [socialRecommendations, setSocialRecommendations] = useState(null);
  // const [nutritionRecommendations, setNutritionRecommendations] = useState(null);

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
  }, [loadChildren]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      // Try to fetch recommendations/notifications
      const response = await api.get('/api/recommendations/received');
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // If API doesn't exist, use empty array
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'parent') {
      fetchNotifications();
    }
  }, [user?.role, fetchNotifications]);

  // Handle notifications menu
  const handleNotificationsOpen = (event) => {
    setNotificationsAnchor(event.currentTarget);
    fetchNotifications();
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchor(null);
  };

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

  // Unused components - kept for future use
  // const AllergiesEditor = () => {
  //   const [input, setInput] = useState('');
  //   return (
  //     <Box>
  //       <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
  //         {editFields.allergies.map((a, idx) => (
  //           <Chip key={`${a}-${idx}`} label={a} onDelete={() => {
  //             setEditFields((f) => ({ ...f, allergies: f.allergies.filter((_, i) => i !== idx) }));
  //           }} />
  //         ))}
  //       </Box>
  //       <Box sx={{ display: 'flex', gap: 1 }}>
  //         <TextField size="small" value={input} onChange={(e) => setInput(e.target.value)} label="Add allergy" />
  //         <Button variant="outlined" onClick={() => {
  //           if (input.trim()) {
  //             setEditFields((f) => ({ ...f, allergies: [...f.allergies, input.trim()] }));
  //             setInput('');
  //           }
  //         }}>Add</Button>
  //       </Box>
  //     </Box>
  //   );
  // };

  // const MedicalEditor = () => {
  //   const [input, setInput] = useState('');
  //   return (
  //     <Box>
  //       <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
  //         {(editFields.medicalConditions || []).map((m, idx) => (
  //           <Chip key={`${m}-${idx}`} label={m} onDelete={() => {
  //             setEditFields((f) => ({ ...f, medicalConditions: f.medicalConditions.filter((_, i) => i !== idx) }));
  //           }} />
  //         ))}
  //       </Box>
  //       <Box sx={{ display: 'flex', gap: 1 }}>
  //         <TextField size="small" value={input} onChange={(e) => setInput(e.target.value)} label="Add medical note" />
  //         <Button variant="outlined" onClick={() => {
  //           if (input.trim()) {
  //             setEditFields((f) => ({ ...f, medicalConditions: [...f.medicalConditions, input.trim()] }));
  //             setInput('');
  //           }
  //         }}>Add</Button>
  //       </Box>
  //     </Box>
  //   );
  // };

  // const EmergencyEditor = () => {
  //   const [contact, setContact] = useState({ name: '', phone: '', relationship: 'Emergency' });
  //   return (
  //     <Box>
  //       {(editFields.emergencyContacts || []).map((c, idx) => (
  //         <Grid container spacing={1} key={idx} sx={{ mb: 1 }}>
  //           <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={c.name} onChange={(e) => {
  //             const v = e.target.value; setEditFields((f) => { const arr = [...f.emergencyContacts]; arr[idx] = { ...arr[idx], name: v }; return { ...f, emergencyContacts: arr }; });
  //           }} /></Grid>
  //           <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={c.phone} onChange={(e) => {
  //             const v = e.target.value; setEditFields((f) => { const arr = [...f.emergencyContacts]; arr[idx] = { ...arr[idx], phone: v }; return { ...f, emergencyContacts: arr }; });
  //           }} /></Grid>
  //           <Grid item xs={10} sm={3}><TextField size="small" fullWidth label="Relationship" value={c.relationship || 'Emergency'} onChange={(e) => {
  //             const v = e.target.value; setEditFields((f) => { const arr = [...f.emergencyContacts]; arr[idx] = { ...arr[idx], relationship: v }; return { ...f, emergencyContacts: arr }; });
  //           }} /></Grid>
  //           <Grid item xs={2} sm={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
  //             <IconButton color="error" onClick={() => setEditFields((f) => ({ ...f, emergencyContacts: f.emergencyContacts.filter((_, i) => i !== idx) }))}><Delete /></IconButton>
  //           </Grid>
  //         </Grid>
  //       ))}

  //       <Divider sx={{ my: 1 }} />
  //       <Grid container spacing={1}>
  //         <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} /></Grid>
  //         <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} /></Grid>
  //         <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="Relationship" value={contact.relationship} onChange={(e) => setContact((c) => ({ ...c, relationship: e.target.value }))} /></Grid>
  //         <Grid item xs={12} sm={1} sx={{ display: 'flex', alignItems: 'center' }}>
  //           <Button variant="outlined" onClick={() => {
  //             if (contact.name && contact.phone) {
  //               setEditFields((f) => ({ ...f, emergencyContacts: [...(f.emergencyContacts || []), contact] }));
  //               setContact({ name: '', phone: '', relationship: 'Emergency' });
  //             }
  //           }}>Add</Button>
  //         </Grid>
  //       </Grid>
  //     </Box>
  //   );
  // };

  // const AuthorizedPickupEditor = () => {
  //   const [person, setPerson] = useState({ name: '', phone: '', relationship: '' });
  //   return (
  //     <Box>
  //       {(editFields.authorizedPickup || []).map((c, idx) => (
  //         <Grid container spacing={1} key={idx} sx={{ mb: 1 }}>
  //           <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={c.name || ''} onChange={(e) => {
  //             const v = e.target.value; setEditFields((f) => { const arr = [...f.authorizedPickup]; arr[idx] = { ...arr[idx], name: v }; return { ...f, authorizedPickup: arr }; });
  //           }} /></Grid>
  //           <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={c.phone || ''} onChange={(e) => {
  //             const v = e.target.value; setEditFields((f) => { const arr = [...f.authorizedPickup]; arr[idx] = { ...arr[idx], phone: v }; return { ...f, authorizedPickup: arr }; });
  //           }} /></Grid>
  //           <Grid item xs={10} sm={3}><TextField size="small" fullWidth label="Relationship" value={c.relationship || ''} onChange={(e) => {
  //             const v = e.target.value; setEditFields((f) => { const arr = [...f.authorizedPickup]; arr[idx] = { ...arr[idx], relationship: v }; return { ...f, authorizedPickup: arr }; });
  //           }} /></Grid>
  //           <Grid item xs={2} sm={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
  //             <IconButton color="error" onClick={() => setEditFields((f) => ({ ...f, authorizedPickup: f.authorizedPickup.filter((_, i) => i !== idx) }))}><Delete /></IconButton>
  //           </Grid>
  //         </Grid>
  //       ))}

  //       <Divider sx={{ my: 1 }} />
  //       <Grid container spacing={1}>
  //         <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Name" value={person.name} onChange={(e) => setPerson((c) => ({ ...c, name: e.target.value }))} /></Grid>
  //         <Grid item xs={12} sm={4}><TextField size="small" fullWidth label="Phone" value={person.phone} onChange={(e) => setPerson((c) => ({ ...c, phone: e.target.value }))} /></Grid>
  //         <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="Relationship" value={person.relationship} onChange={(e) => setPerson((c) => ({ ...c, relationship: e.target.value }))} /></Grid>
  //         <Grid item xs={12} sm={1} sx={{ display: 'flex', alignItems: 'center' }}>
  //           <Button variant="outlined" onClick={() => {
  //             if (person.name && person.phone) {
  //               setEditFields((f) => ({ ...f, authorizedPickup: [...(f.authorizedPickup || []), person] }));
  //               setPerson({ name: '', phone: '', relationship: '' });
  //             }
  //           }}>Add</Button>
  //         </Grid>
  //       </Grid>
  //     </Box>
  //   );
  // };

  // const Gallery = () => {
  //   const [file, setFile] = useState(null);
  //   const [caption, setCaption] = useState('');
  //   return (
  //     <Box>
  //       <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
  //         <Button variant="contained" component="label" startIcon={<PhotoCamera />} disabled={!activeChildId}>
  //           Upload Photo
  //           <input hidden type="file" accept="image/*" multiple onChange={(e) => setFile(e.target.files?.[0] || null)} />
  //         </Button>
  //         <TextField 
  //           size="small" 
  //           label="Caption" 
  //           value={caption} 
  //           onChange={(e) => setCaption(e.target.value)}
  //           sx={{ minWidth: 200 }}
  //         />
  //         <Button 
  //           variant="outlined" 
  //           onClick={() => { if (file) { handleUpload(file, caption); setFile(null); setCaption(''); } }} 
  //           disabled={!file}
  //         >
  //           Add Photo
  //         </Button>
  //         <IconButton onClick={() => fetchChildData(activeChildId)} title="Refresh Gallery">
  //           <Refresh />
  //         </IconButton>
  //       </Box>
  //       <Grid container spacing={2}>
  //         {gallery.map((p) => (
  //           <Grid item xs={12} sm={6} md={4} lg={3} key={p._id}>
  //             <Card sx={{ position: 'relative' }}>
  //               <CardMedia 
  //                 component="img" 
  //                 height="180" 
  //                 image={toAbsoluteUrl(p.url || '')} 
  //                 alt={p.caption || 'Child photo'}
  //                 sx={{ objectFit: 'cover', cursor: 'pointer' }}
  //                 title={toAbsoluteUrl(p.url || '')}
  //                 onError={(e) => {
  //                   const bad = e.currentTarget.getAttribute('src');
  //                   try {
  //                     const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';
  //                     const resource = (p.url || '').startsWith('/') ? (p.url || '') : `/${p.url || ''}`;
  //                     const fallback = origin ? new URL(resource, origin).href : '';
  //                     if (fallback && fallback !== bad) {
  //                       console.warn('Gallery image failed, retrying with origin fallback', { bad, fallback });
  //                       e.currentTarget.src = fallback;
  //                       return;
  //                     }
  //                   } catch (err) {
  //                     // ignore
  //                   }
  //                   console.error('Gallery image failed to load:', bad);
  //                 }}
  //                 onClick={() => {
  //                   const fullUrl = toAbsoluteUrl(p.url || '');
  //                   setPhotoPreview({ open: true, url: fullUrl });
  //                 }}
  //               />
  //               <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  //                 <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, mr: 1 }}>
  //                   {p.caption || 'No caption'}
  //                 </Typography>
  //                 <Box sx={{ display: 'flex', gap: 0.5 }}>
  //                   <IconButton 
  //                     size="small" 
  //                     color="primary" 
  //                     onClick={() => {
  //                       api.post(`/api/children/${activeChildId}/gallery/${p._id}/set-profile`)
  //                         .then(() => {
  //                           fetchChildData(activeChildId);
  //                           setProfileImageVersion((v) => v + 1);
  //                         })
  //                         .catch(console.error);
  //                     }}
  //                     title="Set as profile image"
  //                   >
  //                     <Person />
  //                   </IconButton>
  //                   <IconButton 
  //                     size="small" 
  //                     color="error" 
  //                     onClick={() => handleDeletePhoto(p._id)}
  //                     title="Delete photo"
  //                   >
  //                     <Delete />
  //                   </IconButton>
  //                 </Box>
  //               </CardContent>
  //             </Card>
  //           </Grid>
  //         ))}
  //         {gallery.length === 0 && (
  //           <Grid item xs={12}>
  //             <Box sx={{ textAlign: 'center', py: 4 }}>
  //               <PhotoCamera sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
  //               <Typography variant="body2" color="text.secondary">
  //                 No photos yet. Upload some memories!
  //               </Typography>
  //             </Box>
  //           </Grid>
  //         )}
  //       </Grid>
  //       <Dialog open={photoPreview.open} onClose={() => setPhotoPreview({ open: false, url: '' })} maxWidth="md" fullWidth>
  //         <DialogTitle>Photo</DialogTitle>
  //         <DialogContent dividers>
  //           {photoPreview.url && (
  //             <Box sx={{ textAlign: 'center' }}>
  //               <Box 
  //                 component="img" 
  //                 src={photoPreview.url} 
  //                 alt="Preview" 
  //                 title={photoPreview.url}
  //                 sx={{ maxWidth: '100%', borderRadius: 1 }}
  //                 onError={(e) => {
  //                   const bad = e.currentTarget.getAttribute('src');
  //                   try {
  //                     const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';
  //                     const resource = photoPreview.url?.replace(/^https?:\/\/[^/]+/i, '') || '';
  //                     const resourceFixed = resource.startsWith('/') ? resource : `/${resource}`;
  //                     const fallback = origin ? new URL(resourceFixed, origin).href : '';
  //                     if (fallback && fallback !== bad) {
  //                       console.warn('Preview image failed, retrying with origin fallback', { bad, fallback });
  //                       e.currentTarget.src = fallback;
  //                       return;
  //                     }
  //                   } catch (err) {
  //                     // ignore
  //                   }
  //                   console.error('Preview image failed to load:', bad);
  //                 }}
  //               />
  //             </Box>
  //           )}
  //         </DialogContent>
  //         <DialogActions>
  //           <Button onClick={() => setPhotoPreview({ open: false, url: '' })}>Close</Button>
  //         </DialogActions>
  //       </Dialog>
  //     </Box>
  //   );
  // };

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

  // AI Recommendations Functions (kept for future use)
  // eslint-disable-next-line no-unused-vars
  // const generateEducationRecommendations = useCallback(() => {
  //   if (!profile) return [];
  //   // eslint-disable-next-line no-unused-vars
  //   const age = calculateAge(profile.dateOfBirth);
  //   const interests = profile.interests || [];
  //   const recommendations = [
  //     {
  //       id: 1,
  //       title: 'Interactive Storytelling',
  //       description: 'Enhance language skills through engaging story sessions',
  //       ageRange: '2-5',
  //       category: 'Language Development',
  //       benefits: ['Vocabulary building', 'Listening skills', 'Imagination'],
  //       suitable: true
  //     },
  //     {
  //       id: 2,
  //       title: 'Number Recognition Games',
  //       description: 'Fun counting and number games for early math skills',
  //       ageRange: '3-6',
  //       category: 'Mathematics',
  //       benefits: ['Number recognition', 'Counting', 'Pattern identification'],
  //       suitable: true
  //     },
  //     {
  //       id: 3,
  //       title: 'Arts & Crafts Projects',
  //       description: 'Creative activities to develop fine motor skills',
  //       ageRange: '2-6',
  //       category: 'Creative Development',
  //       benefits: ['Fine motor skills', 'Creativity', 'Following instructions'],
  //       suitable: age >= 2 || interests.includes('arts_crafts') || true
  //     },
  //     {
  //       id: 4,
  //       title: 'Science Discovery Time',
  //       description: 'Simple experiments and nature exploration',
  //       ageRange: '3-6',
  //       category: 'STEM',
  //       benefits: ['Critical thinking', 'Observation skills', 'Curiosity'],
  //       suitable: true
  //     },
  //     {
  //       id: 5,
  //       title: 'Musical Expression',
  //       description: 'Singing, dancing, and instrument play for development',
  //       ageRange: '1-6',
  //       category: 'Creative Arts',
  //       benefits: ['Rhythm', 'Memory', 'Emotional expression'],
  //       suitable: true
  //     }
  //   ];
  //   return recommendations.filter(rec => rec.suitable).slice(0, 3);
  // }, [profile]);

  // const generateSocialRecommendations = useCallback(async () => {
  //   if (!activeChildId) return null;
  //   try {
  //     const response = await api.get(`/api/recommendations/child/${activeChildId}`);
  //     return {
  //       playmates: response.data.recommendations || [],
  //       groupActivities: [
  //         'Circle Time Discussions',
  //         'Collaborative Art Projects', 
  //         'Team Building Games',
  //         'Group Storytelling'
  //       ],
  //       socialSkills: [
  //         'Sharing and taking turns',
  //         'Expressing feelings appropriately', 
  //         'Making friends',
  //         'Conflict resolution'
  //       ]
  //     };
  //   } catch (error) {
  //     console.error('Error fetching social recommendations:', error);
  //     return {
  //       playmates: [],
  //       groupActivities: ['Circle Time', 'Group Play', 'Team Activities'],
  //       socialSkills: ['Sharing', 'Communication', 'Empathy', 'Cooperation']
  //     };
  //   }
  // }, [activeChildId]);

  // const generateNutritionRecommendations = useCallback(async () => {
  //   if (!profile) return null;
  //   // eslint-disable-next-line no-unused-vars
  //   const age = calculateAge(profile.dateOfBirth);
  //   const allergies = profile.allergies || [];
  //   try {
  //     const response = await api.post('/api/meal-recommendations/predict', {
  //       age: age,
  //       dietaryPreference: 'balanced',
  //       hasAllergy: allergies.length > 0
  //     });
  //     return {
  //       ...response.data,
  //       tips: [
  //         'Introduce variety gradually',
  //         'Make mealtime enjoyable',
  //         'Involve child in food preparation',
  //         'Be patient with new foods'
  //       ],
  //       allergies: allergies
  //     };
  //   } catch (error) {
  //     console.error('Error fetching nutrition recommendations:', error);
  //     return {
  //       recommendations: [
  //         'Colorful fruit and vegetable plates',
  //         'Whole grain options for sustained energy',
  //         'Protein-rich snacks for growth',
  //         'Calcium sources for strong bones'
  //       ],
  //       tips: [
  //         'Encourage trying new foods',
  //         'Create positive mealtime environment',
  //         'Offer choices when possible'
  //       ],
  //       allergies: allergies
  //     };
  //   }
  // }, [profile]);

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
        method: 'card'
      };
      
      setBillingData({
        ...billingData,
        invoices: updatedInvoices,
        payments: [...billingData.payments, newPayment]
      });
      
      setPaymentDialog({ open: false, invoice: null });
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Fetch appointments
  const fetchAppointments = async () => {
    try {
      const response = await api.get('/api/appointments/parent');
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  // Book appointment
  const handleBookAppointment = async () => {
    setAppointmentLoading(true);
    setAppointmentError('');
    setAppointmentSuccess('');

    try {
      if (!appointmentForm.childId) {
        setAppointmentError('Please select a child');
        setAppointmentLoading(false);
        return;
      }

      if (!appointmentForm.appointmentDate) {
        setAppointmentError('Please select appointment date');
        setAppointmentLoading(false);
        return;
      }

      if (!appointmentForm.reason) {
        setAppointmentError('Please provide a reason for consultation');
        setAppointmentLoading(false);
        return;
      }

      await api.post('/api/appointments', appointmentForm);
      
      setAppointmentSuccess('Appointment request submitted successfully! The doctor will review and confirm.');
      setAppointmentDialog(false);
      setAppointmentForm({
        childId: '',
        appointmentDate: '',
        appointmentTime: '09:00',
        reason: '',
        appointmentType: 'onsite',
        isEmergency: false
      });
      
      fetchAppointments();
    } catch (error) {
      console.error('Error booking appointment:', error);
      setAppointmentError(error.response?.data?.message || 'Failed to book appointment');
    } finally {
      setAppointmentLoading(false);
    }
  };

  // Load appointments when tab changes
  useEffect(() => {
    if (tab === 7 && user?.role === 'parent') {
      fetchAppointments();
    }
  }, [tab, user?.role]);

  // Schedule display component (kept for future use)
  // const ScheduleCard = () => {
  //   if (!profile?.schedule) return null;
  //   const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  //   const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  //   return (
  //     <Card>
  //       <CardHeader title="Weekly Schedule" />
  //       <CardContent>
  //         <Grid container spacing={2}>
  //           {days.map((day, index) => {
  //             const daySchedule = profile.schedule[day];
  //             return (
  //               <Grid item xs={12} sm={6} md={4} key={day}>
  //                 <Box sx={{ 
  //                   p: 2, 
  //                   border: '1px solid', 
  //                   borderColor: daySchedule?.enrolled ? 'success.main' : 'grey.300',
  //                   borderRadius: 1,
  //                   bgcolor: daySchedule?.enrolled ? 'success.50' : 'grey.50'
  //                 }}>
  //                   <Typography variant="subtitle2" gutterBottom>
  //                     {dayNames[index]}
  //                   </Typography>
  //                   {daySchedule?.enrolled ? (
  //                     <Box>
  //                       <Typography variant="body2" color="success.main">
  //                         ✓ Enrolled
  //                       </Typography>
  //                       <Typography variant="body2">
  //                         {daySchedule.start} - {daySchedule.end}
  //                       </Typography>
  //                     </Box>
  //                   ) : (
  //                     <Typography variant="body2" color="text.secondary">
  //                       Not enrolled
  //                     </Typography>
  //                   )}
  //                 </Box>
  //               </Grid>
  //             );
  //           })}
  //         </Grid>
  //       </CardContent>
  //     </Card>
  //   );
  // };

  // StaffCard removed - moved to different location

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ px: 3, py: 2 }}>
          <Grid container alignItems="center" justifyContent="space-between">
            {/* Left: Branding and Welcome */}
            <Grid item>
              <Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    color: 'primary.main', 
                    fontWeight: 'bold',
                    mb: 0.5
                  }}
                >
                  TinyTots Parent Portal
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Welcome back, {user?.name || user?.firstName || 'Parent'}!
                </Typography>
              </Box>
            </Grid>

            {/* Right: Shopping Cart, Notifications, Logout */}
            <Grid item>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {/* Shopping Cart with Badge */}
                <IconButton 
                  color="inherit" 
                  sx={{ position: 'relative', color: 'text.secondary' }}
                  onClick={() => navigate('/shop')}
                >
                  <ShoppingCart />
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 5, 
                    right: 5, 
                    bgcolor: '#e91e63', 
                    color: 'white', 
                    borderRadius: '50%', 
                    width: 18, 
                    height: 18, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}>
                    3
                  </Box>
                </IconButton>

                {/* Notifications with Badge */}
                <IconButton 
                  color="inherit" 
                  sx={{ position: 'relative', color: 'text.secondary' }}
                  onClick={handleNotificationsOpen}
                >
                  <Badge 
                    badgeContent={notifications.filter(n => !n.read).length} 
                    color="error"
                    overlap="circular"
                  >
                    <Notifications />
                  </Badge>
                </IconButton>

                {/* Notifications Menu */}
                <Menu
                  anchorEl={notificationsAnchor}
                  open={Boolean(notificationsAnchor)}
                  onClose={handleNotificationsClose}
                  PaperProps={{
                    sx: {
                      width: 360,
                      maxHeight: 400,
                      mt: 1.5
                    }
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Notifications
                    </Typography>
                  </Box>
                  {notificationsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : notifications.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No notifications
                      </Typography>
                    </Box>
                  ) : (
                    <List sx={{ maxHeight: 300, overflow: 'auto', p: 0 }}>
                      {notifications.slice(0, 10).map((notification, index) => (
                        <React.Fragment key={notification.id || index}>
                          <ListItem
                            button
                            onClick={() => {
                              handleNotificationsClose();
                              setTab(10); // Navigate to notifications tab
                            }}
                            sx={{
                              bgcolor: notification.read ? 'transparent' : 'action.hover',
                              '&:hover': { bgcolor: 'action.selected' }
                            }}
                          >
                            <ListItemIcon>
                              <Notifications 
                                sx={{ 
                                  color: notification.read ? 'text.secondary' : '#e91e63' 
                                }} 
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={notification.subject || notification.title || 'New Notification'}
                              secondary={notification.notes || notification.message || notification.description}
                              primaryTypographyProps={{
                                sx: {
                                  fontWeight: notification.read ? 400 : 600,
                                  fontSize: '0.9rem'
                                }
                              }}
                              secondaryTypographyProps={{
                                sx: {
                                  fontSize: '0.8rem',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }
                              }}
                            />
                            {!notification.read && (
                              <Chip 
                                size="small" 
                                sx={{ 
                                  bgcolor: '#e91e63', 
                                  color: 'white',
                                  height: 16,
                                  fontSize: '0.65rem'
                                }} 
                                label="New"
                              />
                            )}
                          </ListItem>
                          {index < notifications.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                  {notifications.length > 10 && (
                    <Box sx={{ p: 1, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
                      <Button 
                        size="small" 
                        onClick={() => {
                          handleNotificationsClose();
                          setTab(10); // Navigate to notifications tab
                        }}
                      >
                        View All Notifications
                      </Button>
                    </Box>
                  )}
                </Menu>

                {/* Logout Button */}
                <Button 
                  startIcon={<LogoutIcon />} 
                  onClick={() => {
                    localStorage.clear();
                    window.location.href = '/login';
                  }}
                  sx={{ color: 'success.main', textTransform: 'none' }}
                >
                  Logout
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
        
        {/* Navigation Tabs */}
        <Box sx={{ px: 3 }}>
          <Tabs 
            value={tab} 
            onChange={(_, v) => setTab(v)} 
            variant="scrollable" 
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: '64px',
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: '#1abc9c'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#1abc9c',
                height: 3
              }
            }}
          >
            <Tab icon={<Home />} label="Home" iconPosition="start" />
            <Tab icon={<ChildCare />} label="Daycare" iconPosition="start" />
            <Tab icon={<Favorite />} label="Services" iconPosition="start" />
            <Tab icon={<ShoppingBag />} label="My Orders" iconPosition="start" />
            <Tab icon={<Receipt />} label="Billing" iconPosition="start" />
            <Tab icon={<Message />} label="Messages" iconPosition="start" />
            <Tab icon={<LocalHospital />} label="Doctor Appointments" iconPosition="start" />
            <Tab icon={<Assessment />} label="Feedback" iconPosition="start" />
          </Tabs>
        </Box>
      </Box>

      {/* Error Message */}
      {errorMsg && (
        <Box sx={{ m: 3, p: 1.5, borderRadius: 1, bgcolor: 'warning.light', color: 'warning.dark' }}>
          {errorMsg}
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ p: 3 }}>

        {/* Child Selector Bar */}
        {children.length > 0 && (
          <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#e91e63' }}><Person /></Avatar>
            <FormControl size="small" sx={{ minWidth: 250 }}>
              <InputLabel>Select Child</InputLabel>
              <Select
                value={activeChildId}
                onChange={(e) => setActiveChildId(e.target.value)}
                label="Select Child"
              >
                {children.map((c) => (
                  <MenuItem key={c._id} value={c._id}>{c.firstName} {c.lastName}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton onClick={() => activeChildId && fetchChildData(activeChildId)} color="primary">
              <Refresh />
            </IconButton>
          </Paper>
        )}

        {/* No Children State */}
        {user?.role === 'parent' && children.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <ChildCare sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Child Profiles Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your child profile has not been created yet. Please contact the administration.
            </Typography>
            <Button variant="contained" sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}>
              Contact Admin
            </Button>
          </Paper>
        )}

        {/* Content Sections */}
        {user?.role === 'parent' && activeChildId && children.length > 0 && (
          <Box>
            {/* Tab 0: Home - Overview with Profile Card, Activities, and Meal Plan */}
            {tab === 0 && (
              <Box>
                {/* Child Profile Card - Teal Theme */}
                <Paper 
                  sx={{ 
                    p: 4, 
                    mb: 3, 
                    background: 'linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)',
                    color: 'white',
                    borderRadius: 3,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  <Grid container spacing={3} alignItems="center">
                    <Grid item>
                      <Avatar 
                        src={toAbsoluteUrl(profile?.profileImage || profile?.photo)}
                        sx={{ width: 100, height: 100, border: '4px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                      >
                        {!profile?.profileImage && !profile?.photo && <ChildCare sx={{ fontSize: 50 }} />}
                      </Avatar>
                    </Grid>
                    <Grid item xs>
                      <Grid container spacing={4} alignItems="center">
                        <Grid item xs={12} sm={3}>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                            {profile?.firstName || ''} {profile?.lastName || ''}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>Age</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {calculateAge(profile?.dateOfBirth) || 'N/A'} years
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>Group</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {profile?.program ? profile.program.charAt(0).toUpperCase() + profile.program.slice(1) : 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>Teacher</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {assignedStaff && assignedStaff.length > 0 
                              ? assignedStaff[0]?.name || assignedStaff[0]?.firstName 
                                ? `${assignedStaff[0].firstName || ''} ${assignedStaff[0].lastName || ''}`.trim() || `Ms. ${assignedStaff[0].name || 'Staff'}`
                                : `Ms. ${assignedStaff[0].name || 'Staff'}`
                              : profile?.assignedStaff && profile.assignedStaff.length > 0
                                ? profile.assignedStaff[0]
                                : 'Not Assigned'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>Attendance</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {reports?.attendance?.summary?.attendanceRate 
                              ? `${reports.attendance.summary.attendanceRate}%`
                              : attendance && Array.isArray(attendance) && attendance.length > 0 
                                ? `${Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)}%`
                                : '0%'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Today's Activities and Meal Plan */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                          <Event sx={{ color: '#e91e63', mr: 1, fontSize: 20 }} />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>Today's Activities</Typography>
                        </Box>
                        {activities?.recent && activities.recent.length > 0 ? (
                          <Box>
                            {activities.recent.slice(0, 6).map((activity, idx) => {
                              // Parse activity time
                              let activityTime;
                              let timeStr = '';
                              
                              if (activity.date) {
                                activityTime = new Date(activity.date);
                                if (!isNaN(activityTime.getTime())) {
                                  const hour = activityTime.getHours();
                                  const minute = activityTime.getMinutes();
                                  const hour12 = hour % 12 || 12;
                                  const ampm = hour >= 12 ? 'PM' : 'AM';
                                  timeStr = `${hour12}:${minute < 10 ? '0' : ''}${minute} ${ampm}`;
                                }
                              } else if (activity.time) {
                                timeStr = activity.time;
                              } else if (activity.scheduledTime) {
                                timeStr = activity.scheduledTime;
                              }
                              
                              // Determine status
                              let status = 'pending'; // grey
                              if (activityTime && !isNaN(activityTime.getTime())) {
                                const now = new Date();
                                const oneHourFromNow = new Date(now.getTime() + 3600000);
                                if (activityTime < now) {
                                  status = 'completed'; // green
                                } else if (activityTime <= oneHourFromNow) {
                                  status = 'current'; // blue
                                }
                              } else if (activity.status === 'completed' || activity.completed) {
                                status = 'completed';
                              } else if (activity.status === 'in-progress' || activity.inProgress) {
                                status = 'current';
                              }
                              
                              const dotColor = status === 'completed' ? '#4caf50' : status === 'current' ? '#2196f3' : '#9e9e9e';
                              
                              return (
                                <Box 
                                  key={activity._id || idx} 
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    mb: 2.5,
                                    pb: 2.5,
                                    borderBottom: idx < activities.recent.length - 1 && idx < 5 ? '1px solid #f0f0f0' : 'none'
                                  }}
                                >
                                  <Box 
                                    sx={{ 
                                      width: 12, 
                                      height: 12, 
                                      borderRadius: '50%', 
                                      bgcolor: dotColor,
                                      mr: 2,
                                      flexShrink: 0
                                    }} 
                                  />
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                      {activity.title || activity.activity || activity.name || 'Activity'}
                                    </Typography>
                                  </Box>
                                  {timeStr && (
                                    <Typography variant="body2" color="text.secondary" sx={{ ml: 2, flexShrink: 0 }}>
                                      {timeStr}
                                    </Typography>
                                  )}
                                </Box>
                              );
                            })}
                          </Box>
                        ) : (
                          <Typography color="text.secondary">No activities scheduled for today</Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                          <Favorite sx={{ color: '#e91e63', mr: 1, fontSize: 20 }} />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>Today's Meal Plan</Typography>
                        </Box>
                        {(() => {
                          // Get today's day name
                          const today = new Date();
                          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                          const todayDayName = dayNames[today.getDay()].toLowerCase();
                          
                          // Find today's meal plan
                          let todayMeals = [];
                          if (meals?.plan && Array.isArray(meals.plan)) {
                            const todayPlan = meals.plan.find(dayPlan => 
                              dayPlan.day && dayPlan.day.toLowerCase() === todayDayName
                            );
                            
                            if (todayPlan && todayPlan.menu) {
                              // Convert menu object to array of meals
                              if (todayPlan.menu.breakfast) {
                                todayMeals.push({
                                  type: 'Breakfast',
                                  description: todayPlan.menu.breakfast,
                                  consumption: todayPlan.consumption?.breakfast || todayPlan.menu.breakfastConsumption || 100
                                });
                              }
                              if (todayPlan.menu.morningSnack || todayPlan.menu.snack) {
                                todayMeals.push({
                                  type: 'Snack',
                                  description: todayPlan.menu.morningSnack || todayPlan.menu.snack,
                                  consumption: todayPlan.consumption?.snack || todayPlan.menu.snackConsumption || 80
                                });
                              }
                              if (todayPlan.menu.lunch) {
                                todayMeals.push({
                                  type: 'Lunch',
                                  description: todayPlan.menu.lunch,
                                  consumption: todayPlan.consumption?.lunch || todayPlan.menu.lunchConsumption || 0
                                });
                              }
                              if (todayPlan.menu.afternoonSnack && !todayPlan.menu.morningSnack) {
                                todayMeals.push({
                                  type: 'Snack',
                                  description: todayPlan.menu.afternoonSnack,
                                  consumption: todayPlan.consumption?.afternoonSnack || 0
                                });
                              }
                            } else {
                              // Fallback: if meals.plan is an array of meal objects (not day plans)
                              todayMeals = meals.plan.filter(meal => {
                                // Check if meal is for today
                                if (meal.date) {
                                  const mealDate = new Date(meal.date);
                                  return mealDate.toDateString() === today.toDateString();
                                }
                                return true; // If no date, assume it's for today
                              }).slice(0, 3).map(meal => ({
                                type: meal.mealType || meal.type || 'Meal',
                                description: meal.items 
                                  ? (Array.isArray(meal.items) ? meal.items.join(', ') : meal.items)
                                  : meal.description || meal.food || 'Nutritious meal',
                                consumption: meal.consumptionPercentage || meal.consumption || 0
                              }));
                            }
                          }
                          
                          if (todayMeals.length > 0) {
                            return (
                              <Box>
                                {todayMeals.slice(0, 3).map((meal, idx) => {
                                  // Determine color based on consumption
                                  let statusColor = '#9e9e9e'; // grey
                                  let statusText = 'Pending';
                                  
                                  if (meal.consumption === 100) {
                                    statusColor = '#4caf50'; // green
                                    statusText = '100%';
                                  } else if (meal.consumption >= 80) {
                                    statusColor = '#ffc107'; // yellow
                                    statusText = `${meal.consumption}%`;
                                  } else if (meal.consumption > 0) {
                                    statusColor = '#2196f3'; // blue
                                    statusText = 'In Progress';
                                  }
                                  
                                  return (
                                    <Box 
                                      key={idx}
                                      sx={{ 
                                        mb: 2.5,
                                        pb: 2.5,
                                        borderBottom: idx < todayMeals.length - 1 && idx < 2 ? '1px solid #f0f0f0' : 'none'
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                          {meal.type}
                                        </Typography>
                                        <Box
                                          sx={{
                                            bgcolor: statusColor,
                                            color: 'white',
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: 1,
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            minWidth: 80,
                                            textAlign: 'center'
                                          }}
                                        >
                                          {statusText}
                                        </Box>
                                      </Box>
                                      <Typography variant="body2" color="text.secondary">
                                        {meal.description}
                                      </Typography>
                                    </Box>
                                  );
                                })}
                              </Box>
                            );
                          } else {
                            return <Typography color="text.secondary">No meals scheduled for today</Typography>;
                          }
                        })()}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Tab 1: Daycare - All child management features */}
            {tab === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Tabs 
                      value={daycareTab} 
                      onChange={(_, v) => setDaycareTab(v)} 
                      variant="scrollable"
                      sx={{ mb: 2, borderBottom: '1px solid #e0e0e0' }}
                    >
                      <Tab label="Profile" />
                      <Tab label="Medical & Emergency" />
                      <Tab label="Gallery" />
                      <Tab label="Attendance" />
                      <Tab label="Activities" />
                      <Tab label="Meals" />
                      <Tab label="Staff" />
                    </Tabs>

                    {/* Daycare Sub-tabs Content */}
                    {daycareTab === 0 && (
                      <Box>
                        <ProfileCard />
                      </Box>
                    )}

                    {daycareTab === 1 && (
                      <Box sx={{ p: 2 }}>
                        <Grid container spacing={3}>
                          {/* Allergies Section */}
                          <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                                Allergies
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  placeholder="Add allergy"
                                  value={editFields.newAllergy || ''}
                                  onChange={(e) => setEditFields({ ...editFields, newAllergy: e.target.value })}
                                />
                                <Button 
                                  variant="contained"
                                  sx={{ bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0F766E' }, minWidth: '80px' }}
                                  onClick={async () => {
                                    if (editFields.newAllergy?.trim()) {
                                      const updatedAllergies = [...(profile.allergies || []), editFields.newAllergy.trim()];
                                      try {
                                        await api.put(`/api/children/${activeChildId}`, { allergies: updatedAllergies });
                                        setProfile({ ...profile, allergies: updatedAllergies });
                                        setEditFields({ ...editFields, newAllergy: '' });
                                      } catch (error) {
                                        console.error('Error adding allergy:', error);
                                      }
                                    }
                                  }}
                                >
                                  Add
                                </Button>
                              </Box>
                            </Paper>
                          </Grid>

                          {/* Medical Information Section */}
                          <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                                Medical Information
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  placeholder="Add medical note"
                                  value={editFields.newMedicalCondition || ''}
                                  onChange={(e) => setEditFields({ ...editFields, newMedicalCondition: e.target.value })}
                                />
                                <Button 
                                  variant="contained"
                                  sx={{ bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0F766E' }, minWidth: '80px' }}
                                  onClick={async () => {
                                    if (editFields.newMedicalCondition?.trim()) {
                                      const updatedConditions = [...(profile.medicalConditions || []), editFields.newMedicalCondition.trim()];
                                      try {
                                        await api.put(`/api/children/${activeChildId}`, { medicalConditions: updatedConditions });
                                        setProfile({ ...profile, medicalConditions: updatedConditions });
                                        setEditFields({ ...editFields, newMedicalCondition: '' });
                                      } catch (error) {
                                        console.error('Error adding medical condition:', error);
                                      }
                                    }
                                  }}
                                >
                                  Add
                                </Button>
                              </Box>
                            </Paper>
                          </Grid>

                          {/* Emergency Contacts Section */}
                          <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                                Emergency Contacts
                              </Typography>
                              <Grid container spacing={1}>
                                <Grid item xs={12} sm={4}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Name"
                                    value={editFields.emergencyName || ''}
                                    onChange={(e) => setEditFields({ ...editFields, emergencyName: e.target.value })}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Phone"
                                    value={editFields.emergencyPhone || ''}
                                    onChange={(e) => setEditFields({ ...editFields, emergencyPhone: e.target.value })}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      placeholder="Relationship"
                                      value={editFields.emergencyRelationship || 'Emergency'}
                                      onChange={(e) => setEditFields({ ...editFields, emergencyRelationship: e.target.value })}
                                    />
                                    <Button 
                                      variant="contained"
                                      sx={{ bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0F766E' }, minWidth: '60px' }}
                                      onClick={async () => {
                                        if (editFields.emergencyName && editFields.emergencyPhone) {
                                          const newContact = {
                                            name: editFields.emergencyName,
                                            phone: editFields.emergencyPhone,
                                            relationship: editFields.emergencyRelationship || 'Emergency'
                                          };
                                          const updatedContacts = [...(profile.emergencyContacts || []), newContact];
                                          try {
                                            await api.put(`/api/children/${activeChildId}`, { emergencyContacts: updatedContacts });
                                            setProfile({ ...profile, emergencyContacts: updatedContacts });
                                            setEditFields({ 
                                              ...editFields, 
                                              emergencyName: '', 
                                              emergencyPhone: '', 
                                              emergencyRelationship: 'Emergency' 
                                            });
                                          } catch (error) {
                                            console.error('Error adding emergency contact:', error);
                                          }
                                        }
                                      }}
                                    >
                                      Add
                                    </Button>
                                  </Box>
                                </Grid>
                              </Grid>
                            </Paper>
                          </Grid>

                          {/* Authorized Pickups Section */}
                          <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                                Authorized Pickups
                              </Typography>
                              <Grid container spacing={1}>
                                <Grid item xs={12} sm={4}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Name"
                                    value={editFields.pickupName || ''}
                                    onChange={(e) => setEditFields({ ...editFields, pickupName: e.target.value })}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Phone"
                                    value={editFields.pickupPhone || ''}
                                    onChange={(e) => setEditFields({ ...editFields, pickupPhone: e.target.value })}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      placeholder="Relationship"
                                      value={editFields.pickupRelationship || ''}
                                      onChange={(e) => setEditFields({ ...editFields, pickupRelationship: e.target.value })}
                                    />
                                    <Button 
                                      variant="contained"
                                      sx={{ bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0F766E' }, minWidth: '60px' }}
                                      onClick={async () => {
                                        if (editFields.pickupName && editFields.pickupPhone) {
                                          const newPickup = {
                                            name: editFields.pickupName,
                                            phone: editFields.pickupPhone,
                                            relationship: editFields.pickupRelationship || ''
                                          };
                                          const updatedPickups = [...(profile.authorizedPickups || []), newPickup];
                                          try {
                                            await api.put(`/api/children/${activeChildId}`, { authorizedPickups: updatedPickups });
                                            setProfile({ ...profile, authorizedPickups: updatedPickups });
                                            setEditFields({ 
                                              ...editFields, 
                                              pickupName: '', 
                                              pickupPhone: '', 
                                              pickupRelationship: '' 
                                            });
                                          } catch (error) {
                                            console.error('Error adding authorized pickup:', error);
                                          }
                                        }
                                      }}
                                    >
                                      Add
                                    </Button>
                                  </Box>
                                </Grid>
                              </Grid>
                            </Paper>
                          </Grid>

                          {/* Current Medical Information Display */}
                          <Grid item xs={12}>
                            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                                Current Medical Information
                              </Typography>
                              <Grid container spacing={3}>
                                {/* Allergies List */}
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                    Allergies
                                  </Typography>
                                  {profile.allergies && profile.allergies.length > 0 ? (
                                    <List>
                                      {profile.allergies.map((allergy, index) => (
                                        <ListItem 
                                          key={index}
                                          secondaryAction={
                                            <IconButton 
                                              edge="end" 
                                              color="error"
                                              onClick={async () => {
                                                const updatedAllergies = profile.allergies.filter((_, i) => i !== index);
                                                try {
                                                  await api.put(`/api/children/${activeChildId}`, { allergies: updatedAllergies });
                                                  setProfile({ ...profile, allergies: updatedAllergies });
                                                } catch (error) {
                                                  console.error('Error removing allergy:', error);
                                                }
                                              }}
                                            >
                                              <Delete />
                                            </IconButton>
                                          }
                                          sx={{ bgcolor: '#fff3cd', borderRadius: 1, mb: 1 }}
                                        >
                                          <ListItemText primary={allergy} />
                                        </ListItem>
                                      ))}
                                    </List>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      No allergies recorded
                                    </Typography>
                                  )}
                                </Grid>

                                {/* Medical Conditions List */}
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                    Medical Conditions
                                  </Typography>
                                  {profile.medicalConditions && profile.medicalConditions.length > 0 ? (
                                    <List>
                                      {profile.medicalConditions.map((condition, index) => (
                                        <ListItem 
                                          key={index}
                                          secondaryAction={
                                            <IconButton 
                                              edge="end" 
                                              color="error"
                                              onClick={async () => {
                                                const updatedConditions = profile.medicalConditions.filter((_, i) => i !== index);
                                                try {
                                                  await api.put(`/api/children/${activeChildId}`, { medicalConditions: updatedConditions });
                                                  setProfile({ ...profile, medicalConditions: updatedConditions });
                                                } catch (error) {
                                                  console.error('Error removing condition:', error);
                                                }
                                              }}
                                            >
                                              <Delete />
                                            </IconButton>
                                          }
                                          sx={{ bgcolor: '#f0f0f0', borderRadius: 1, mb: 1 }}
                                        >
                                          <ListItemText primary={condition} />
                                        </ListItem>
                                      ))}
                                    </List>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      No medical conditions recorded
                                    </Typography>
                                  )}
                                </Grid>

                                {/* Emergency Contacts List */}
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                    Emergency Contacts
                                  </Typography>
                                  {profile.emergencyContacts && profile.emergencyContacts.length > 0 ? (
                                    <List>
                                      {profile.emergencyContacts.map((contact, index) => (
                                        <ListItem 
                                          key={index}
                                          secondaryAction={
                                            <IconButton 
                                              edge="end" 
                                              color="error"
                                              onClick={async () => {
                                                const updatedContacts = profile.emergencyContacts.filter((_, i) => i !== index);
                                                try {
                                                  await api.put(`/api/children/${activeChildId}`, { emergencyContacts: updatedContacts });
                                                  setProfile({ ...profile, emergencyContacts: updatedContacts });
                                                } catch (error) {
                                                  console.error('Error removing contact:', error);
                                                }
                                              }}
                                            >
                                              <Delete />
                                            </IconButton>
                                          }
                                          sx={{ bgcolor: '#e8f5e9', borderRadius: 1, mb: 1 }}
                                        >
                                          <ListItemText 
                                            primary={contact.name}
                                            secondary={`${contact.phone} - ${contact.relationship}`}
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      No emergency contacts added
                                    </Typography>
                                  )}
                                </Grid>

                                {/* Authorized Pickups List */}
                                <Grid item xs={12} md={6}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                    Authorized Pickups
                                  </Typography>
                                  {profile.authorizedPickups && profile.authorizedPickups.length > 0 ? (
                                    <List>
                                      {profile.authorizedPickups.map((pickup, index) => (
                                        <ListItem 
                                          key={index}
                                          secondaryAction={
                                            <IconButton 
                                              edge="end" 
                                              color="error"
                                              onClick={async () => {
                                                const updatedPickups = profile.authorizedPickups.filter((_, i) => i !== index);
                                                try {
                                                  await api.put(`/api/children/${activeChildId}`, { authorizedPickups: updatedPickups });
                                                  setProfile({ ...profile, authorizedPickups: updatedPickups });
                                                } catch (error) {
                                                  console.error('Error removing pickup:', error);
                                                }
                                              }}
                                            >
                                              <Delete />
                                            </IconButton>
                                          }
                                          sx={{ bgcolor: '#e3f2fd', borderRadius: 1, mb: 1 }}
                                        >
                                          <ListItemText 
                                            primary={pickup.name}
                                            secondary={`${pickup.phone}${pickup.relationship ? ` - ${pickup.relationship}` : ''}`}
                                          />
                                        </ListItem>
                                      ))}
                                    </List>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      No authorized pickups added
                                    </Typography>
                                  )}
                                </Grid>
                              </Grid>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Box>
                    )}

                    {daycareTab === 2 && (
                      <Box sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Button variant="contained" component="label" startIcon={<PhotoCamera />} disabled={!activeChildId}>
                            Upload Photo
                            <input hidden type="file" accept="image/*" multiple onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload(file, '');
                            }} />
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
                                  onClick={() => {
                                    const fullUrl = toAbsoluteUrl(p.url || '');
                                    setPhotoPreview({ open: true, url: fullUrl });
                                  }}
                                />
                                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, mr: 1 }}>
                                    {p.caption || 'No caption'}
                                  </Typography>
                                  <IconButton 
                                    size="small" 
                                    color="error" 
                                    onClick={() => handleDeletePhoto(p._id)}
                                    title="Delete photo"
                                  >
                                    <Delete />
                                  </IconButton>
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
                        <Dialog open={photoPreview.open} onClose={() => setPhotoPreview({ open: false, url: '' })} maxWidth="md" fullWidth>
                          <DialogTitle>Photo</DialogTitle>
                          <DialogContent dividers>
                            {photoPreview.url && (
                              <Box sx={{ textAlign: 'center' }}>
                                <Box 
                                  component="img" 
                                  src={photoPreview.url} 
                                  alt="Preview" 
                                  sx={{ maxWidth: '100%', borderRadius: 1 }}
                                />
                              </Box>
                            )}
                          </DialogContent>
                          <DialogActions>
                            <Button onClick={() => setPhotoPreview({ open: false, url: '' })}>Close</Button>
                          </DialogActions>
                        </Dialog>
                      </Box>
                    )}

                    {daycareTab === 3 && (
                      <Box sx={{ p: 2 }}>
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
                      </Box>
                    )}

                    {daycareTab === 4 && (
                      <Box sx={{ p: 2 }}>
                        <Card>
                          <CardHeader 
                            title="Activities" 
                            avatar={<Event />}
                            action={<IconButton onClick={() => fetchChildData(activeChildId)}><Refresh /></IconButton>}
                          />
                          <CardContent>
                            {activities?.recent && activities.recent.length > 0 ? (
                              <List>
                                {activities.recent.map((activity, idx) => (
                                  <ListItem key={activity._id || idx}>
                                    <ListItemText
                                      primary={activity.title || activity.activity || activity.name || 'Activity'}
                                      secondary={activity.date ? new Date(activity.date).toLocaleString() : ''}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No activities available yet.
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Box>
                    )}

                    {daycareTab === 5 && (
                      <Box sx={{ p: 2 }}>
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
                                      {dayPlan.menu?.breakfast && (
                                        <Grid item xs={12} sm={6}>
                                          <Typography variant="body2" color="text.secondary">Breakfast:</Typography>
                                          <Typography variant="body2">{dayPlan.menu.breakfast || 'Not specified'}</Typography>
                                        </Grid>
                                      )}
                                      
                                      {dayPlan.menu?.morningSnack && (
                                        <Grid item xs={12} sm={6}>
                                          <Typography variant="body2" color="text.secondary">Morning Snack:</Typography>
                                          <Typography variant="body2">{dayPlan.menu.morningSnack || 'Not specified'}</Typography>
                                        </Grid>
                                      )}
                                      
                                      {dayPlan.menu?.lunch && (
                                        <Grid item xs={12} sm={6}>
                                          <Typography variant="body2" color="text.secondary">Lunch:</Typography>
                                          <Typography variant="body2">{dayPlan.menu.lunch || 'Not specified'}</Typography>
                                        </Grid>
                                      )}
                                      
                                      {dayPlan.menu?.afternoonSnack && (
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

                    {daycareTab === 6 && (
                      <Box sx={{ p: 2 }}>
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
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            )}

            {/* Tab 2: Services */}
            {tab === 2 && (
              <Box>
                {/* Nanny Services Section */}
                <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Favorite sx={{ color: '#e91e63' }} />
                  Nanny Services
                </Typography>

                <NannyServicesTab />
              </Box>
            )}

            {/* Tab 3: My Orders */}
            {tab === 3 && (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <ShoppingBag sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>My Orders</Typography>
                <Typography variant="body2" color="text.secondary">
                  View your order history here
                </Typography>
              </Paper>
            )}

            {/* Tab 4: Billing & Payments */}
            {tab === 4 && (
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

            {/* Tab 5: Messages */}
            {tab === 5 && (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Message sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>Messages Coming Soon</Typography>
                <Typography variant="body2" color="text.secondary">
                  Communicate with staff and teachers
                </Typography>
              </Paper>
            )}


            {/* Tab 7: Feedback & Complaints with AI Classification */}
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

            {/* Tab 6: Doctor Appointments */}
            {tab === 6 && (
              <Box>
                {/* Success/Error Messages */}
                {appointmentSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAppointmentSuccess('')}>
                    {appointmentSuccess}
                  </Alert>
                )}
                {appointmentError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAppointmentError('')}>
                    {appointmentError}
                  </Alert>
                )}

                <Card sx={{ mb: 3 }}>
                  <CardHeader 
                    title="Doctor Appointments" 
                    subheader="Book and manage doctor consultations for your children"
                    action={
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => {
                          setAppointmentForm({
                            ...appointmentForm,
                            childId: activeChildId || ''
                          });
                          setAppointmentDialog(true);
                        }}
                      >
                        Book Appointment
                      </Button>
                    }
                  />
                  <CardContent>
                    {/* Appointments List */}
                    <Grid container spacing={2}>
                      {appointments.length === 0 ? (
                        <Grid item xs={12}>
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <LocalHospital sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>
                              No Appointments Yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              Book your first doctor appointment for your child
                            </Typography>
                            <Button
                              variant="contained"
                              startIcon={<Add />}
                              onClick={() => {
                                setAppointmentForm({
                                  ...appointmentForm,
                                  childId: activeChildId || ''
                                });
                                setAppointmentDialog(true);
                              }}
                            >
                              Book Now
                            </Button>
                          </Box>
                        </Grid>
                      ) : (
                        appointments.map((appointment) => (
                          <Grid item xs={12} md={6} key={appointment._id}>
                            <Card variant="outlined">
                              <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                                      {appointment.child?.firstName?.[0]}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="h6">
                                        {appointment.child?.firstName} {appointment.child?.lastName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                                          weekday: 'long',
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <Chip
                                    label={appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                    size="small"
                                    color={
                                      appointment.status === 'confirmed' ? 'success' :
                                      appointment.status === 'completed' ? 'info' :
                                      appointment.status === 'cancelled' ? 'error' :
                                      'warning'
                                    }
                                  />
                                </Box>

                                <Divider sx={{ my: 2 }} />

                                <Grid container spacing={1}>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Time</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                      {appointment.appointmentTime}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Type</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                      {appointment.appointmentType === 'online' ? 'Online' : 'On-site'}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">Reason</Typography>
                                    <Typography variant="body2">{appointment.reason}</Typography>
                                  </Grid>

                                  {appointment.diagnosis && (
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary">Diagnosis</Typography>
                                      <Typography variant="body2">{appointment.diagnosis}</Typography>
                                    </Grid>
                                  )}

                                  {appointment.prescription && (
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary">Prescription</Typography>
                                      <Typography variant="body2">{appointment.prescription}</Typography>
                                    </Grid>
                                  )}

                                  {appointment.healthAdvice && (
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary">Health Advice</Typography>
                                      <Typography variant="body2">{appointment.healthAdvice}</Typography>
                                    </Grid>
                                  )}

                                  {appointment.isEmergency && (
                                    <Grid item xs={12}>
                                      <Chip label="Emergency" size="small" color="error" />
                                    </Grid>
                                  )}
                                </Grid>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            )}


          </Box>
        )}
      </Box>

      {/* Payment Processing Dialog */}

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

      {/* Book Appointment Dialog */}
      <Dialog 
        open={appointmentDialog} 
        onClose={() => !appointmentLoading && setAppointmentDialog(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Book Doctor Appointment
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Select Child</InputLabel>
                <Select
                  value={appointmentForm.childId}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, childId: e.target.value })}
                  label="Select Child"
                >
                  {children.map((child) => (
                    <MenuItem key={child._id} value={child._id}>
                      {child.firstName} {child.lastName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Appointment Date"
                value={appointmentForm.appointmentDate}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="time"
                label="Appointment Time"
                value={appointmentForm.appointmentTime}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentTime: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason for Consultation"
                placeholder="e.g., Fever, Allergy symptoms, Routine check-up..."
                value={appointmentForm.reason}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Appointment Type</InputLabel>
                <Select
                  value={appointmentForm.appointmentType}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, appointmentType: e.target.value })}
                  label="Appointment Type"
                >
                  <MenuItem value="onsite">On-site (Daycare Visit)</MenuItem>
                  <MenuItem value="online">Online Consultation</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={appointmentForm.isEmergency ? 'emergency' : 'normal'}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, isEmergency: e.target.value === 'emergency' })}
                  label="Priority"
                >
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="emergency">Emergency</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {appointmentForm.isEmergency && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  Emergency appointments will be prioritized and admin/staff will be notified immediately.
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setAppointmentDialog(false)}
            disabled={appointmentLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleBookAppointment}
            variant="contained"
            disabled={appointmentLoading}
            startIcon={appointmentLoading ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            {appointmentLoading ? 'Booking...' : 'Book Appointment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParentDashboard;