import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  CloudUpload,
  VideoLibrary,
  Delete,
  PlayArrow,
  Edit,
  Close,
  Refresh,
  Movie,
  ArrowBack
} from '@mui/icons-material';
import api from '../../config/api';

const AGE_GROUPS = ['All Ages', 'Infants (0-1)', 'Toddlers (1-3)', 'Preschool (3-5)', 'School Age (5+)'];
const CATEGORIES = ['General', 'Educational', 'Bedtime', 'Adventure', 'Nature', 'Animals', 'Music', 'Fairy Tale'];

const VideoStoryUpload = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [stories, setStories]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const fileInputRef                    = useRef(null);

  // Upload form
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl]     = useState('');
  const [form, setForm]                 = useState({
    title: '', description: '', ageGroup: 'All Ages', category: 'General'
  });

  // Preview dialog
  const [previewDialog, setPreviewDialog]   = useState(false);
  const [previewStory, setPreviewStory]     = useState(null);

  // Edit dialog
  const [editDialog, setEditDialog]     = useState(false);
  const [editStory, setEditStory]       = useState(null);
  const [editForm, setEditForm]         = useState({});

  // Delete confirm
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteId, setDeleteId]         = useState(null);

  useEffect(() => { fetchStories(); }, []);

  const fetchStories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/stories');
      if (res.data.success) setStories(res.data.stories);
    } catch (err) {
      setError('Failed to load stories');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    // Auto-fill title from filename
    if (!form.title) {
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setForm(f => ({ ...f, title: name }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) { setError('Please select a video file'); return; }
    if (!form.title.trim()) { setError('Please enter a title'); return; }

    try {
      setUploading(true);
      setError('');
      setUploadProgress(0);

      const data = new FormData();
      data.append('video', selectedFile);
      data.append('title', form.title.trim());
      data.append('description', form.description);
      data.append('ageGroup', form.ageGroup);
      data.append('category', form.category);

      const res = await api.post('/stories/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      });

      if (res.data.success) {
        setSuccess(`"${form.title}" uploaded successfully!`);
        setSelectedFile(null);
        setPreviewUrl('');
        setForm({ title: '', description: '', ageGroup: 'All Ages', category: 'General' });
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchStories();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/stories/${deleteId}`);
      setSuccess('Story deleted');
      setDeleteDialog(false);
      setDeleteId(null);
      fetchStories();
    } catch (err) {
      setError('Delete failed');
    }
  };

  const handleEditSave = async () => {
    try {
      await api.put(`/stories/${editStory._id}`, editForm);
      setSuccess('Story updated');
      setEditDialog(false);
      fetchStories();
    } catch (err) {
      setError('Update failed');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!embedded && (
            <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
              <ArrowBack />
            </IconButton>
          )}
          <Box>
            <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Movie sx={{ fontSize: 40, color: '#667eea' }} />
              Video Story Upload
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload video stories for children's storytelling sessions
            </Typography>
          </Box>
        </Box>
        <Button startIcon={<Refresh />} onClick={fetchStories} variant="outlined">
          Refresh
        </Button>
      </Box>

      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}
      {error   && <Alert severity="error"   onClose={() => setError('')}   sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* ── Upload Panel ── */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, position: 'sticky', top: 16 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              📤 Upload New Story
            </Typography>

            {/* Drop zone */}
            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed',
                borderColor: selectedFile ? 'success.main' : 'primary.main',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: selectedFile ? 'success.50' : 'action.hover',
                mb: 2,
                transition: 'all 0.2s',
                '&:hover': { bgcolor: 'action.selected' }
              }}
            >
              {previewUrl ? (
                <video
                  src={previewUrl}
                  style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8 }}
                  controls
                />
              ) : (
                <>
                  <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="body1" fontWeight="bold">Click to select video</Typography>
                  <Typography variant="caption" color="text.secondary">
                    MP4, WebM, MOV, AVI, MKV — up to 500 MB
                  </Typography>
                </>
              )}
              {selectedFile && (
                <Typography variant="caption" display="block" color="success.main" sx={{ mt: 1 }}>
                  ✅ {selectedFile.name} ({formatBytes(selectedFile.size)})
                </Typography>
              )}
            </Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            <Stack spacing={2}>
              <TextField
                label="Story Title *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                fullWidth
                size="small"
              />
              <TextField
                label="Description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                fullWidth
                size="small"
                multiline
                rows={2}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Age Group</InputLabel>
                <Select
                  value={form.ageGroup}
                  label="Age Group"
                  onChange={e => setForm(f => ({ ...f, ageGroup: e.target.value }))}
                >
                  {AGE_GROUPS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={form.category}
                  label="Category"
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>

              {uploading && (
                <Box>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                  <Typography variant="caption" color="text.secondary">
                    Uploading… {uploadProgress}%
                  </Typography>
                </Box>
              )}

              <Button
                variant="contained"
                startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <CloudUpload />}
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                size="large"
                sx={{ bgcolor: '#667eea', '&:hover': { bgcolor: '#5a6fd6' } }}
              >
                {uploading ? `Uploading ${uploadProgress}%…` : 'Upload Video Story'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* ── Story Library ── */}
        <Grid item xs={12} md={7}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            📚 Story Library ({stories.length} videos)
          </Typography>

          {loading ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : stories.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <VideoLibrary sx={{ fontSize: 60, opacity: 0.3, mb: 1 }} />
              <Typography color="text.secondary">
                No video stories uploaded yet. Upload your first story!
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {stories.map(story => (
                <Grid item xs={12} sm={6} key={story._id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Thumbnail using HTML video poster frame */}
                    <Box
                      sx={{
                        bgcolor: 'grey.900',
                        height: 130,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                      onClick={() => { setPreviewStory(story); setPreviewDialog(true); }}
                    >
                      <video
                        src={`http://localhost:5000${story.videoUrl}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        preload="metadata"
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'rgba(0,0,0,0.4)',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
                          transition: 'background 0.2s'
                        }}
                      >
                        <PlayArrow sx={{ fontSize: 48, color: 'white' }} />
                      </Box>
                    </Box>

                    <CardContent sx={{ flex: 1, pb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold" noWrap>
                        {story.title}
                      </Typography>
                      {story.description && (
                        <Typography variant="caption" color="text.secondary" sx={{
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden'
                        }}>
                          {story.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1, gap: 0.5 }}>
                        <Chip label={story.ageGroup}  size="small" color="primary" variant="outlined" />
                        <Chip label={story.category}  size="small" color="secondary" variant="outlined" />
                        <Chip label={`${story.views} views`} size="small" variant="outlined" />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        {formatBytes(story.fileSize)} · {new Date(story.createdAt).toLocaleDateString()}
                      </Typography>
                    </CardContent>

                    <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                      <Tooltip title="Preview">
                        <IconButton size="small" color="primary"
                          onClick={() => { setPreviewStory(story); setPreviewDialog(true); }}>
                          <PlayArrow />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" color="info"
                          onClick={() => {
                            setEditStory(story);
                            setEditForm({ title: story.title, description: story.description,
                              ageGroup: story.ageGroup, category: story.category });
                            setEditDialog(true);
                          }}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error"
                          onClick={() => { setDeleteId(story._id); setDeleteDialog(true); }}>
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>
      </Grid>

      {/* Preview Dialog */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          🎬 {previewStory?.title}
          <IconButton onClick={() => setPreviewDialog(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {previewStory && (
            <video
              src={`http://localhost:5000${previewStory.videoUrl}`}
              controls
              autoPlay
              style={{ width: '100%', maxHeight: '70vh', background: '#000' }}
            />
          )}
          {previewStory?.description && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">{previewStory.description}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip label={previewStory.ageGroup} size="small" color="primary" />
                <Chip label={previewStory.category} size="small" color="secondary" />
              </Stack>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Story Details</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title *" value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} fullWidth />
            <TextField label="Description" value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} fullWidth multiline rows={3} />
            <FormControl fullWidth>
              <InputLabel>Age Group</InputLabel>
              <Select value={editForm.ageGroup || 'All Ages'} label="Age Group" onChange={e => setEditForm(f => ({ ...f, ageGroup: e.target.value }))}>
                {AGE_GROUPS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select value={editForm.category || 'General'} label="Category" onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Story?</DialogTitle>
        <DialogContent>
          <Typography>This will permanently delete the video file. This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VideoStoryUpload;
