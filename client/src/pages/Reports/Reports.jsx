import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Typography, Box, Paper, Grid, Button, TextField, MenuItem, Divider, Chip, LinearProgress, Alert } from '@mui/material';
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

const Reports = () => {
  const [from, setFrom] = useState(new Date());
  const [to, setTo] = useState(new Date());
  const [entityType, setEntityType] = useState('child');
  const [entityId, setEntityId] = useState('');
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [perf, setPerf] = useState(null);
  const [customType, setCustomType] = useState('attendance');
  // Simple filters instead of raw JSON
  const [attStatus, setAttStatus] = useState(''); // present | absent | '' (all)
  const [keyword, setKeyword] = useState(''); // generic free-text for other types
  const [customData, setCustomData] = useState([]);
  const [selected, setSelected] = useState('attendance');
  const [errorMsg, setErrorMsg] = useState('');

  // Section refs for smooth scrolling
  const attendanceRef = useRef(null);
  const enrollmentRef = useRef(null);
  const financialRef = useRef(null);
  const staffRef = useRef(null);

  async function loadAttendance() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('from', from.toISOString());
      params.append('to', to.toISOString());
      if (entityType) params.append('entityType', entityType);
      if (entityId) params.append('entityId', entityId);
      const res = await api.get(`/api/reports/attendance?${params.toString()}`);
      setAttendance(res.data);
      setErrorMsg('');
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || 'Failed to load attendance report');
    } finally {
      setLoading(false);
    }
  }

  async function loadEnrollment() {
    setLoading(true);
    try {
      const res = await api.get('/api/reports/enrollment');
      setEnrollment(res.data);
      setErrorMsg('');
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || 'Failed to load enrollment report');
    } finally { setLoading(false); }
  }

  async function loadFinancial() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('from', from.toISOString());
      params.append('to', to.toISOString());
      const res = await api.get(`/api/reports/financial?${params.toString()}`);
      setFinancial(res.data);
      setErrorMsg('');
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || 'Failed to load financial report');
    } finally { setLoading(false); }
  }

  async function loadPerf() {
    setLoading(true);
    try {
      const res = await api.get('/api/reports/staff-performance');
      setPerf(res.data);
      setErrorMsg('');
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || 'Failed to load staff performance');
    } finally { setLoading(false); }
  }

  async function runCustom() {
    setLoading(true);
    try {
      const filter = {};
      // Always pass date range when provided
      if (from) filter.from = from.toISOString();
      if (to) filter.to = to.toISOString();
      if (customType === 'attendance') {
        if (attStatus) filter.status = attStatus;
      } else if (customType === 'children' || customType === 'users') {
        if (keyword) filter.q = keyword; // name/email contains
      } else if (customType === 'payroll') {
        if (keyword) filter.status = keyword.toLowerCase();
      } else if (customType === 'staffPerformance') {
        if (keyword) filter.minRating = Number(keyword) || undefined;
      }
      const res = await api.post('/api/reports/custom', { type: customType, filter });
      setCustomData(res.data.data || []);
      setErrorMsg('');
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || 'Failed to run quick report');
    } finally { setLoading(false); }
  }

  // Auto-run quick report when filters change (no Run button)
  useEffect(() => {
    const t = setTimeout(() => { runCustom(); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customType, attStatus, keyword, from, to]);

  // Load all sections initially so the page is populated
  useEffect(() => {
    (async () => {
      await Promise.all([loadAttendance(), loadEnrollment(), loadFinancial(), loadPerf()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attendanceRows = useMemo(() => (attendance?.records || []).map(r => ({
    date: new Date(r.date).toLocaleDateString(),
    entityType: r.entityType,
    checkInAt: r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : '',
    checkOutAt: r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString() : '',
    status: r.status,
    notes: r.notes || ''
  })), [attendance]);

  // Enrollment rows for CSV/table reuse
  const enrollmentRows = useMemo(() => (enrollment?.monthly || []).map(m => ({
    month: m._id?.m,
    year: m._id?.y,
    enrollments: m.count
  })), [enrollment]);

  // Financial payroll rows for CSV
  const payrollRows = useMemo(() => (financial?.payrolls || []).map(p => ({
    staff: p.staff?.firstName ? `${p.staff.firstName} ${p.staff.lastName}` : (p.staff || '-'),
    period: `${new Date(p.periodStart).toLocaleDateString()} - ${new Date(p.periodEnd).toLocaleDateString()}`,
    base: (p.baseRate || 0).toFixed(2),
    earnings: (p.earnings || []).reduce((s,e)=>s+e.amount,0).toFixed(2),
    deductions: (p.deductions || []).reduce((s,d)=>s+d.amount,0).toFixed(2),
    net: (p.netPay || 0).toFixed(2),
    status: p.status || '-'
  })), [financial]);

  // Staff performance rows for CSV
  const perfRows = useMemo(() => (perf?.reviews || []).map(r => ({
    staff: r.staff?.firstName ? `${r.staff.firstName} ${r.staff.lastName}` : (r.staff || '-'),
    period: `${new Date(r.periodStart).toLocaleDateString()} - ${new Date(r.periodEnd).toLocaleDateString()}`,
    overall: r.overallRating ?? '-',
    notes: r.notes || '-'
  })), [perf]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Reports & Insights</Typography>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Filters</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <TextField select label="Entity Type" fullWidth value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="child">Child</MenuItem>
              <MenuItem value="staff">Staff</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="Entity ID (optional)" fullWidth value={entityId} onChange={(e) => setEntityId(e.target.value)} />
          </Grid>
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
          <Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
            <Button variant={selected==='attendance'?'contained':'outlined'} onClick={async()=>{setSelected('attendance'); await loadAttendance(); attendanceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });}} disabled={loading}>Attendance</Button>
            <Button variant={selected==='enrollment'?'contained':'outlined'} onClick={async()=>{setSelected('enrollment'); await loadEnrollment(); enrollmentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });}} disabled={loading}>Enrollment</Button>
            <Button variant={selected==='financial'?'contained':'outlined'} onClick={async()=>{setSelected('financial'); await loadFinancial(); financialRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });}} disabled={loading}>Financial</Button>
            <Button variant={selected==='staff'?'contained':'outlined'} onClick={async()=>{setSelected('staff'); await loadPerf(); staffRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });}} disabled={loading}>Staff</Button>
          </Grid>
          <Grid item xs={12} md={'auto'}>
            <Button variant="text" onClick={async()=>{
              try { setLoading(true); await api.post('/api/reports/seed-demo'); setErrorMsg(''); }
              catch(e){ setErrorMsg(e?.response?.data?.message || 'Failed to seed demo data'); }
              finally { setLoading(false); }
              // Reload all sections
              await Promise.all([loadAttendance(), loadEnrollment(), loadFinancial(), loadPerf()]);
            }}>Load Demo Data</Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }} ref={attendanceRef}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Attendance</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`Records: ${(attendanceRows||[]).length}`} color="primary" variant="outlined" />
        <Button size="small" variant="outlined" onClick={() => toCsv('attendance-report.csv', attendanceRows)} disabled={!attendanceRows.length}>Export CSV</Button>
          </Box>
        </Box>
        <Divider sx={{ my: 1 }} />
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
              {(attendanceRows || []).map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.date}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.entityType}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.checkInAt}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.checkOutAt}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.status}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.notes}</td>
                </tr>
              ))}
              {!attendanceRows.length && (
                <tr>
                  <td colSpan={6} style={{ padding: '12px', textAlign: 'center', color: '#888' }}>No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }} ref={enrollmentRef}>
            <Typography variant="h6">Enrollment</Typography>
            <Divider sx={{ my: 1 }} />
            {/* Summary chips */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {(enrollment?.byProgram || []).map((p) => (
                <Box key={p.program} sx={{ px: 1.5, py: 0.5, borderRadius: 2, bgcolor: 'primary.light', color: 'white', fontSize: 12 }}>
                  {p.program || 'N/A'}: <strong>{p.count}</strong>
                </Box>
              ))}
            </Box>
            {/* Monthly trend table */}
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Month','Year','Enrollments'].map(h => (
                      <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(enrollment?.monthly || []).map((m, i) => (
                    <tr key={i}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{m._id?.m}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{m._id?.y}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{m.count}</td>
                    </tr>
                  ))}
                  {!(enrollment?.monthly || []).length && (
                    <tr>
                      <td colSpan={3} style={{ padding: '12px', textAlign: 'center', color: '#888' }}>No data</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
            <Box sx={{ textAlign: 'right', mt: 2 }}>
              <Button variant="outlined" onClick={() => toCsv('enrollment-report.csv', enrollmentRows)} disabled={!enrollmentRows.length}>Export CSV</Button>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }} ref={financialRef}>
            <Typography variant="h6">Financial</Typography>
            <Divider sx={{ my: 1 }} />
            {/* Totals summary */}
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
                  <Typography variant="caption">Gross</Typography>
                  <Typography variant="h6">${(financial?.totals?.gross || 0).toFixed(2)}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
                  <Typography variant="caption">Deductions</Typography>
                  <Typography variant="h6">${(financial?.totals?.deductions || 0).toFixed(2)}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
                  <Typography variant="caption">Net</Typography>
                  <Typography variant="h6">${(financial?.totals?.net || 0).toFixed(2)}</Typography>
                </Paper>
              </Grid>
            </Grid>
            {/* Payroll table */}
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Staff','Period','Base','Earnings','Deductions','Net','Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(financial?.payrolls || []).map((p) => (
                    <tr key={p._id}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{p.staff?.firstName ? `${p.staff.firstName} ${p.staff.lastName}` : (p.staff || '-')}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{new Date(p.periodStart).toLocaleDateString()} - {new Date(p.periodEnd).toLocaleDateString()}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>${(p.baseRate || 0).toFixed(2)}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>${(p.earnings || []).reduce((s,e)=>s+e.amount,0).toFixed(2)}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>${(p.deductions || []).reduce((s,d)=>s+d.amount,0).toFixed(2)}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>${(p.netPay || 0).toFixed(2)}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{p.status || '-'}</td>
                    </tr>
                  ))}
                  {!(financial?.payrolls || []).length && (
                    <tr>
                      <td colSpan={7} style={{ padding: '12px', textAlign: 'center', color: '#888' }}>No data</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
            <Box sx={{ textAlign: 'right', mt: 2 }}>
              <Button variant="outlined" onClick={() => toCsv('financial-payrolls.csv', payrollRows)} disabled={!payrollRows.length}>Export CSV</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mb: 3 }} ref={staffRef}>
        <Typography variant="h6">Staff Performance</Typography>
        <Divider sx={{ my: 1 }} />
        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.light', color: 'white' }}>
              <Typography variant="caption">Average Rating</Typography>
              <Typography variant="h6">{(perf?.averageRating || 0).toFixed(1)} / 5</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'white' }}>
              <Typography variant="caption">Reviews</Typography>
              <Typography variant="h6">{perf?.count || 0}</Typography>
            </Paper>
          </Grid>
        </Grid>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Staff','Period','Overall','Notes'].map(h => (
                  <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(perf?.reviews || []).map((r) => (
                <tr key={r._id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.staff?.firstName ? `${r.staff.firstName} ${r.staff.lastName}` : (r.staff || '-')}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{new Date(r.periodStart).toLocaleDateString()} - {new Date(r.periodEnd).toLocaleDateString()}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.overallRating ?? '-'}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>{r.notes || '-'}</td>
                </tr>
              ))}
              {!(perf?.reviews || []).length && (
                <tr>
                  <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#888' }}>No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
        <Box sx={{ textAlign: 'right', mt: 2 }}>
          <Button variant="outlined" onClick={() => toCsv('staff-performance.csv', perfRows)} disabled={!perfRows.length}>Export CSV</Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">Quick Report</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField select label="Type" fullWidth value={customType} onChange={(e) => setCustomType(e.target.value)}>
              <MenuItem value="attendance">Attendance</MenuItem>
              <MenuItem value="children">Children</MenuItem>
              <MenuItem value="users">Users</MenuItem>
              <MenuItem value="payroll">Payroll</MenuItem>
              <MenuItem value="staffPerformance">Staff Performance</MenuItem>
            </TextField>
          </Grid>
          {customType === 'attendance' ? (
            <Grid item xs={12} md={7}>
              <TextField select fullWidth label="Status" value={attStatus} onChange={(e)=>setAttStatus(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="present">Present</MenuItem>
                <MenuItem value="absent">Absent</MenuItem>
              </TextField>
            </Grid>
          ) : (
            <Grid item xs={12} md={7}>
              <TextField fullWidth label={customType==='payroll' ? 'Status (e.g., paid, pending)' : customType==='staffPerformance' ? 'Min rating (e.g., 4)' : 'Search keyword'} value={keyword} onChange={(e)=>setKeyword(e.target.value)} />
            </Grid>
          )}
          {/* No Run button — results update automatically */}
        </Grid>
        <Divider sx={{ my: 2 }} />
        {/* Dynamic table instead of raw JSON */}
        <Box sx={{ overflowX: 'auto' }}>
          {customData && customData.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {Object.keys(customData[0]).map((h) => (
                    <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customData.map((row, idx) => (
                  <tr key={idx}>
                    {Object.keys(customData[0]).map((h) => (
                      <td key={h} style={{ padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                        {typeof row[h] === 'object' && row[h] !== null ? JSON.stringify(row[h]) : String(row[h] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Typography color="text.secondary">No data</Typography>
          )}
        </Box>
        <Box sx={{ textAlign: 'right', mt: 2 }}>
          <Button variant="outlined" onClick={() => toCsv('quick-report.csv', (customData || []).map(r => {
            const headers = Object.keys(customData?.[0] || {});
            const flat = {};
            headers.forEach(h => {
              const v = r[h];
              flat[h] = typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
            });
            return flat;
          }))} disabled={!customData?.length}>Export CSV</Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Reports;