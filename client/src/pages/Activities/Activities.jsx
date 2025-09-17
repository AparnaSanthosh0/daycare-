import React, { useEffect, useState, useCallback } from 'react';
import { Typography, Box, Paper, Grid, Button, TextField, MenuItem, Divider } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../../config/api';

function toCsv(filename, rows) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const Activities = () => {
  const [date, setDate] = useState(new Date());
  const [program, setProgram] = useState('general');
  const [child, setChild] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('education');
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState([]);
  const [from, setFrom] = useState(new Date());
  const [to, setTo] = useState(new Date());

  const [mChild, setMChild] = useState('');
  const [mTitle, setMTitle] = useState('');
  const [mDate, setMDate] = useState(new Date());
  const [mCategory, setMCategory] = useState('other');
  const [milestones, setMilestones] = useState([]);

  async function createActivity() {
    setLoading(true);
    try {
      await api.post('/api/activities/activities', { child: child || undefined, program, date, title, description, category });
      setTitle(''); setDescription('');
      await listActivities();
    } finally { setLoading(false); }
  }

  async function uploadActivityPhoto(id, file) {
    const formData = new FormData();
    formData.append('photo', file);
    await api.post(`/api/activities/activities/${id}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    await listActivities();
  }

  const listActivities = useCallback(async () => {
    const params = new URLSearchParams();
    if (child) params.append('child', child);
    if (program) params.append('program', program);
    params.append('from', from.toISOString());
    params.append('to', to.toISOString());
    const res = await api.get(`/api/activities/activities?${params.toString()}`);
    setItems(res.data.items || []);
  }, [child, program, from, to]);

  async function createMilestone() {
    setLoading(true);
    try {
      await api.post('/api/activities/milestones', { child: mChild, date: mDate, category: mCategory, title: mTitle });
      setMTitle('');
      await listMilestones();
    } finally { setLoading(false); }
  }

  const listMilestones = useCallback(async () => {
    const params = new URLSearchParams();
    if (mChild) params.append('child', mChild);
    params.append('from', from.toISOString());
    params.append('to', to.toISOString());
    const res = await api.get(`/api/activities/milestones?${params.toString()}`);
    setMilestones(res.data.items || []);
  }, [mChild, from, to]);

  useEffect(() => { listActivities(); }, [listActivities]);
  useEffect(() => { listMilestones(); }, [listMilestones]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Activities & Programs</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Daily Activity Planning</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker label="Date" value={date} onChange={(v) => setDate(v || new Date())} renderInput={(params) => <TextField fullWidth {...params} />} />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField select label="Program" fullWidth value={program} onChange={(e) => setProgram(e.target.value)}>
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="infant">Infant</MenuItem>
              <MenuItem value="toddler">Toddler</MenuItem>
              <MenuItem value="preschool">Preschool</MenuItem>
              <MenuItem value="prekindergarten">Pre-K</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField label="Child ID (optional)" fullWidth value={child} onChange={(e) => setChild(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="Title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="Description" fullWidth value={description} onChange={(e) => setDescription(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField select label="Category" fullWidth value={category} onChange={(e) => setCategory(e.target.value)}>
              <MenuItem value="education">Education</MenuItem>
              <MenuItem value="play">Play</MenuItem>
              <MenuItem value="meal">Meal</MenuItem>
              <MenuItem value="nap">Nap</MenuItem>
              <MenuItem value="outdoor">Outdoor</MenuItem>
              <MenuItem value="event">Event</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="contained" onClick={createActivity} disabled={loading || !title}>Create</Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">Activity Reports for Parents</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker label="From" value={from} onChange={(v) => setFrom(v || new Date())} renderInput={(params) => <TextField fullWidth {...params} />} />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker label="To" value={to} onChange={(v) => setTo(v || new Date())} renderInput={(params) => <TextField fullWidth {...params} />} />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="Child ID (optional)" fullWidth value={child} onChange={(e) => setChild(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField select label="Program" fullWidth value={program} onChange={(e) => setProgram(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="infant">Infant</MenuItem>
              <MenuItem value="toddler">Toddler</MenuItem>
              <MenuItem value="preschool">Preschool</MenuItem>
              <MenuItem value="prekindergarten">Pre-K</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button fullWidth variant="contained" onClick={listActivities}>Load</Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date','Program','Child','Title','Category','Photos'].map(h => (
                  <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r._id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{new Date(r.date).toLocaleDateString()}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.program}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.child || '-'}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.title}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.category}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadActivityPhoto(r._id, e.target.files[0])} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {(r.photos || []).map((p, i) => (
                        // eslint-disable-next-line
                        <img key={i} src={p} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={6} style={{ padding: '12px', textAlign: 'center', color: '#888' }}>No activities</td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
        <Box sx={{ textAlign: 'right', mt: 2 }}>
          <Button variant="outlined" onClick={() => toCsv('activities.csv', items)} disabled={!items.length}>Export CSV</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">Milestone Tracking</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField label="Child ID" fullWidth value={mChild} onChange={(e) => setMChild(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker label="Date" value={mDate} onChange={(v) => setMDate(v || new Date())} renderInput={(params) => <TextField fullWidth {...params} />} />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField select label="Category" fullWidth value={mCategory} onChange={(e) => setMCategory(e.target.value)}>
              <MenuItem value="motor">Motor</MenuItem>
              <MenuItem value="language">Language</MenuItem>
              <MenuItem value="social">Social</MenuItem>
              <MenuItem value="cognitive">Cognitive</MenuItem>
              <MenuItem value="emotional">Emotional</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="Title" fullWidth value={mTitle} onChange={(e) => setMTitle(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="contained" onClick={createMilestone} disabled={loading || !mChild || !mTitle}>Add</Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date','Child','Category','Title','Photos'].map(h => (
                  <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {milestones.map((m) => (
                <tr key={m._id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{new Date(m.date).toLocaleDateString()}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{m.child}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{m.category}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{m.title}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                    <input type="file" accept="image/*" onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        const formData = new FormData();
                        formData.append('photo', e.target.files[0]);
                        await api.post(`/api/activities/milestones/${m._id}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                        await listMilestones();
                      }
                    }} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {(m.photos || []).map((p, i) => (
                        // eslint-disable-next-line
                        <img key={i} src={p} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {!milestones.length && (
                <tr>
                  <td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#888' }}>No milestones</td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
        <Box sx={{ textAlign: 'right', mt: 2 }}>
          <Button variant="outlined" onClick={() => toCsv('milestones.csv', milestones)} disabled={!milestones.length}>Export CSV</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Activities;