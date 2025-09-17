import React, { useMemo, useState } from 'react';
import { Typography, Box, Paper, Grid, Button, TextField, MenuItem, Alert, Divider } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../../config/api';

// Simple CSV export from array of objects
function exportCsv(filename, rows) {
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

const Attendance = () => {
  const [entityType, setEntityType] = useState('child');
  const [entityId, setEntityId] = useState('');
  const [when, setWhen] = useState(new Date());
  const [reportFrom, setReportFrom] = useState(() => new Date());
  const [reportTo, setReportTo] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [records, setRecords] = useState([]);

  // Demo: entity list could be fetched; for now, manual input of entityId is supported.

  async function handleCheckIn() {
    try {
      setLoading(true); setError(''); setMessage('');
      const payload = { entityType, entityId, when };
      const res = await api.post('/api/attendance/check-in', payload);
      setMessage(res.data.message || 'Checked in');
    } catch (e) {
      setError(e.response?.data?.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOut() {
    try {
      setLoading(true); setError(''); setMessage('');
      const payload = { entityType, entityId, when };
      const res = await api.post('/api/attendance/check-out', payload);
      setMessage(res.data.message || 'Checked out');
    } catch (e) {
      setError(e.response?.data?.message || 'Check-out failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAbsent() {
    try {
      setLoading(true); setError(''); setMessage('');
      const payload = { entityType, entityId, date: when };
      const res = await api.post('/api/attendance/mark-absence', payload);
      setMessage(res.data.message || 'Marked absent');
    } catch (e) {
      setError(e.response?.data?.message || 'Mark absent failed');
    } finally {
      setLoading(false);
    }
  }

  async function loadReport() {
    try {
      setLoading(true); setError('');
      const params = new URLSearchParams();
      if (entityType) params.append('entityType', entityType);
      if (entityId) params.append('entityId', entityId);
      if (statusFilter) params.append('status', statusFilter);
      if (reportFrom) params.append('from', reportFrom.toISOString());
      if (reportTo) params.append('to', reportTo.toISOString());
      const res = await api.get(`/api/attendance/report?${params.toString()}`);
      setRecords(res.data.records || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => records.map(r => ({
    date: new Date(r.date).toLocaleDateString(),
    entityType: r.entityType,
    checkInAt: r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : '',
    checkOutAt: r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString() : '',
    status: r.status,
    notes: r.notes || ''
  })), [records]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Attendance Tracking
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Daily Actions</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField select label="Entity Type" fullWidth value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <MenuItem value="child">Child</MenuItem>
              <MenuItem value="staff">Staff</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Entity ID" fullWidth value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="Paste Child/Staff ID" />
          </Grid>
          <Grid item xs={12} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker label="Date" value={when} onChange={(v) => setWhen(v || new Date())} renderInput={(params) => <TextField fullWidth {...params} />} />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={2} sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={handleCheckIn} disabled={loading || !entityId}>Check In</Button>
            <Button variant="outlined" onClick={handleCheckOut} disabled={loading || !entityId}>Check Out</Button>
          </Grid>
          <Grid item xs={12}>
            <Button color="warning" variant="text" onClick={handleMarkAbsent} disabled={loading || !entityId}>Mark Absent</Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Attendance Reports</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <TextField select label="Entity Type" fullWidth value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <MenuItem value="child">Child</MenuItem>
              <MenuItem value="staff">Staff</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="Entity ID (optional)" fullWidth value={entityId} onChange={(e) => setEntityId(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField select label="Status" fullWidth value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="present">Present</MenuItem>
              <MenuItem value="absent">Absent</MenuItem>
              <MenuItem value="late">Late</MenuItem>
              <MenuItem value="left-early">Left Early</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker label="From" value={reportFrom} onChange={(v) => setReportFrom(v || new Date())} renderInput={(params) => <TextField fullWidth {...params} />} />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={2}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker label="To" value={reportTo} onChange={(v) => setReportTo(v || new Date())} renderInput={(params) => <TextField fullWidth {...params} />} />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} md={1}>
            <Button fullWidth variant="contained" onClick={loadReport} disabled={loading}>Load</Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date','Type','Check In','Check Out','Status','Notes'].map(h => (
                  <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.date}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.entityType}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.checkInAt}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.checkOutAt}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.status}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.notes}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} style={{ padding: '12px', textAlign: 'center', color: '#888' }}>
                    {loading ? 'Loading...' : 'No records'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>

        <Box sx={{ textAlign: 'right', mt: 2 }}>
          <Button variant="outlined" onClick={() => exportCsv('attendance.csv', rows)} disabled={!rows.length}>Export CSV</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Attendance;