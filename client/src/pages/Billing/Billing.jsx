import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import {
  Receipt,
  Payment,
  Calculate,
  Assessment,
  Add,
  Edit,
  Visibility
} from '@mui/icons-material';
import api from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

const Billing = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Billing states
  const [billingStats, setBillingStats] = useState({
    totalRevenue: 0,
    paidInvoices: 0,
    pendingPayments: 0,
    overdueAmount: 0
  });
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [parentsList, setParentsList] = useState([]);
  const [childrenList, setChildrenList] = useState([]);
  
  // Tuition management states
  const [tuitionRates, setTuitionRates] = useState([]);
  const [tuitionDialog, setTuitionDialog] = useState({ open: false, mode: 'create', child: null });
  const [tuitionForm, setTuitionForm] = useState({
    childId: '',
    monthlyRate: '',
    program: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  // Dialog states
  const [invoiceDialog, setInvoiceDialog] = useState({ open: false });
  const [paymentDialog, setPaymentDialog] = useState({ open: false });
  const [invoiceForm, setInvoiceForm] = useState({
    parentId: '',
    childId: '',
    amount: '',
    dueDate: '',
    description: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: '',
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchBillingData();
    }
  }, [user]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [statsRes, invoicesRes, paymentsRes, parentsRes, childrenRes, tuitionRes] = await Promise.all([
        api.get('/billing/stats').catch(() => ({ data: { totalRevenue: 0, paidInvoices: 0, pendingPayments: 0, overdueAmount: 0 } })),
        api.get('/billing/invoices').catch(() => ({ data: [] })),
        api.get('/billing/payments').catch(() => ({ data: [] })),
        api.get('/admin/parents').catch(() => ({ data: [] })),
        api.get('/children').catch(() => ({ data: [] })),
        api.get('/billing/tuition-rates').catch(() => ({ data: [] }))
      ]);
      
      setBillingStats(statsRes.data || { totalRevenue: 0, paidInvoices: 0, pendingPayments: 0, overdueAmount: 0 });
      setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
      setTuitionRates(Array.isArray(tuitionRes.data) ? tuitionRes.data : []);
      setParentsList(Array.isArray(parentsRes.data) ? parentsRes.data : []);
      setChildrenList(Array.isArray(childrenRes.data) ? childrenRes.data : []);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      setError('Failed to load billing data');
      // Ensure all arrays are properly initialized even on error
      setInvoices([]);
      setPayments([]);
      setTuitionRates([]);
      setParentsList([]);
      setChildrenList([]);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async () => {
    try {
      const response = await api.post('/billing/invoices', invoiceForm);
      setInvoices(prevInvoices => [...(Array.isArray(prevInvoices) ? prevInvoices : []), response.data]);
      setInvoiceDialog({ open: false });
      setInvoiceForm({
        parentId: '',
        childId: '',
        amount: '',
        dueDate: '',
        description: ''
      });
      fetchBillingData();
      setSuccess('Invoice generated successfully');
    } catch (error) {
      console.error('Generate invoice error:', error);
      setError('Failed to generate invoice');
    }
  };

  const recordPayment = async () => {
    try {
      const response = await api.post('/billing/payments', paymentForm);
      setPayments([...payments, response.data]);
      setPaymentDialog({ open: false });
      setPaymentForm({
        invoiceId: '',
        amount: '',
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchBillingData();
      setSuccess('Payment recorded successfully');
    } catch (error) {
      console.error('Record payment error:', error);
      setError('Failed to record payment');
    }
  };

  const calculateLateFees = async () => {
    try {
      await api.post('/billing/calculate-late-fees');
      fetchBillingData();
      setSuccess('Late fees calculated successfully');
    } catch (error) {
      console.error('Calculate late fees error:', error);
      setError('Failed to calculate late fees');
    }
  };

  const generateFinancialReport = async () => {
    try {
      const response = await api.get('/billing/reports/financial');
      console.log('Financial report:', response.data);
      setSuccess('Financial report generated successfully');
    } catch (error) {
      console.error('Generate report error:', error);
      setError('Failed to generate financial report');
    }
  };

  // Tuition management functions
  const handleTuitionSubmit = async () => {
    try {
      const endpoint = tuitionDialog.mode === 'create' ? '/api/billing/tuition-rates' : `/api/billing/tuition-rates/${tuitionForm.childId}`;
      const method = tuitionDialog.mode === 'create' ? 'post' : 'put';
      
      await api[method](endpoint, tuitionForm);
      
      setSuccess(`Tuition rate ${tuitionDialog.mode === 'create' ? 'created' : 'updated'} successfully`);
      setTuitionDialog({ open: false, mode: 'create', child: null });
      setTuitionForm({
        childId: '',
        monthlyRate: '',
        program: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchBillingData();
    } catch (error) {
      console.error('Error managing tuition rate:', error);
      setError('Failed to manage tuition rate');
    }
  };

  const openTuitionDialog = (mode = 'create', child = null) => {
    if (mode === 'edit' && child) {
      const existingRate = tuitionRates.find(rate => rate.childId === child._id);
      setTuitionForm({
        childId: child._id,
        monthlyRate: existingRate?.monthlyRate || child.tuitionRate || '',
        program: child.program || '',
        effectiveDate: existingRate?.effectiveDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        notes: existingRate?.notes || ''
      });
    } else {
      setTuitionForm({
        childId: '',
        monthlyRate: '',
        program: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
    setTuitionDialog({ open: true, mode, child });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading billing data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Billing & Payment Management
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      
      {/* Billing Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h4">${billingStats.totalRevenue.toFixed(2)}</Typography>
              <Typography variant="body2">Total Revenue</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h4">${billingStats.paidInvoices.toFixed(2)}</Typography>
              <Typography variant="body2">Paid Invoices</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h4">${billingStats.pendingPayments.toFixed(2)}</Typography>
              <Typography variant="body2">Pending Payments</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'error.main', color: 'white' }}>
            <CardContent>
              <Typography variant="h4">${billingStats.overdueAmount.toFixed(2)}</Typography>
              <Typography variant="body2">Overdue Amount</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Billing Actions */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Button 
            variant="contained" 
            fullWidth 
            startIcon={<Receipt />}
            onClick={() => setInvoiceDialog({ open: true })}
          >
            Generate Invoice
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<Payment />}
            onClick={() => setPaymentDialog({ open: true })}
          >
            Record Payment
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<Calculate />}
            onClick={calculateLateFees}
          >
            Calculate Late Fees
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button 
            variant="outlined" 
            fullWidth 
            startIcon={<Assessment />}
            onClick={generateFinancialReport}
          >
            Financial Reports
          </Button>
        </Grid>
      </Grid>

      {/* Recent Invoices */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Invoices
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Parent/Child</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(invoices) && invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <TableRow key={invoice._id}>
                      <TableCell>#{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        {invoice.parent?.firstName} {invoice.parent?.lastName}
                        {invoice.child && ` - ${invoice.child.firstName}`}
                      </TableCell>
                      <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                      <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.status}
                          color={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'error' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No invoices generated yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Payment History
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Payment ID</TableCell>
                  <TableCell>Parent/Child</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Payment Date</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(payments) && payments.length > 0 ? (
                  payments.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell>#{payment.paymentNumber}</TableCell>
                      <TableCell>
                        {payment.invoice?.parent?.firstName} {payment.invoice?.parent?.lastName}
                        {payment.invoice?.child && ` - ${payment.invoice.child.firstName}`}
                      </TableCell>
                      <TableCell>${payment.amount.toFixed(2)}</TableCell>
                      <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell>
                        <Chip
                          label={payment.status}
                          color={payment.status === 'completed' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No payment history available
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Tuition Management */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Tuition Management
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<Add />}
                onClick={() => openTuitionDialog('create')}
              >
                Set Tuition Rates
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<Edit />}
                onClick={() => {
                  if (Array.isArray(childrenList) && childrenList.length > 0) {
                    openTuitionDialog('edit', childrenList[0]);
                  } else {
                    setError('No children found to update rates for');
                  }
                }}
              >
                Update Rates
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<Visibility />}
                onClick={() => {
                  // Scroll to the tuition rates table below
                  document.getElementById('tuition-rates-table')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                View Current Rates
              </Button>
            </Grid>
          </Grid>

          {/* Current Tuition Rates Table */}
          <Box sx={{ mt: 4 }} id="tuition-rates-table">
            <Typography variant="h6" gutterBottom>
              Current Tuition Rates
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Child Name</TableCell>
                    <TableCell>Program</TableCell>
                    <TableCell>Monthly Rate</TableCell>
                    <TableCell>Parent</TableCell>
                    <TableCell>Effective Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(childrenList) ? childrenList.map((child) => {
                    const tuitionRate = Array.isArray(tuitionRates) ? tuitionRates.find(rate => rate.childId === child._id) || {} : {};
                    const parent = Array.isArray(parentsList) ? parentsList.find(p => child.parents?.includes(p._id)) : null;
                    
                    return (
                      <TableRow key={child._id}>
                        <TableCell>
                          <Typography variant="body1" fontWeight="bold">
                            {child.firstName} {child.lastName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={child.program || 'N/A'} size="small" color="primary" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="h6" color="success.main">
                            ${tuitionRate.monthlyRate || child.tuitionRate || 0}/month
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {parent ? `${parent.firstName} ${parent.lastName}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {tuitionRate.effectiveDate ? 
                            new Date(tuitionRate.effectiveDate).toLocaleDateString() : 
                            'Not Set'
                          }
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={tuitionRate.monthlyRate || child.tuitionRate ? 'Active' : 'Not Set'}
                            color={tuitionRate.monthlyRate || child.tuitionRate ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Edit />}
                            onClick={() => openTuitionDialog('edit', child)}
                            sx={{ mr: 1 }}
                          >
                            Edit Rate
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }) : []}
                  {(!Array.isArray(childrenList) || childrenList.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary">No children found</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Financial Reports */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Financial Reports
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<Assessment />}
                onClick={() => {/* Monthly report */}}
              >
                Monthly Report
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<Assessment />}
                onClick={() => {/* Quarterly report */}}
              >
                Quarterly Report
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<Assessment />}
                onClick={() => {/* Annual report */}}
              >
                Annual Report
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button 
                variant="outlined" 
                fullWidth 
                startIcon={<Assessment />}
                onClick={() => {/* Custom report */}}
              >
                Custom Report
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Invoice Generation Dialog */}
      <Dialog open={invoiceDialog.open} onClose={() => setInvoiceDialog({ open: false })} maxWidth="md" fullWidth>
        <DialogTitle>Generate Invoice</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Parent</InputLabel>
                <Select
                  value={invoiceForm.parentId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, parentId: e.target.value })}
                >
                  {Array.isArray(parentsList) ? parentsList.map((parent) => (
                    <MenuItem key={parent._id} value={parent._id}>
                      {parent.firstName} {parent.lastName}
                    </MenuItem>
                  )) : []}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Child</InputLabel>
                <Select
                  value={invoiceForm.childId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, childId: e.target.value })}
                >
                  {Array.isArray(childrenList) ? childrenList.map((child) => (
                    <MenuItem key={child._id} value={child._id}>
                      {child.firstName} {child.lastName}
                    </MenuItem>
                  )) : []}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={invoiceForm.amount}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={invoiceForm.description}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceDialog({ open: false })}>
            Cancel
          </Button>
          <Button onClick={generateInvoice} variant="contained">
            Generate Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Recording Dialog */}
      <Dialog open={paymentDialog.open} onClose={() => setPaymentDialog({ open: false })} maxWidth="md" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Invoice</InputLabel>
                <Select
                  value={paymentForm.invoiceId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, invoiceId: e.target.value })}
                >
                  {Array.isArray(invoices) ? invoices.filter(inv => inv.status !== 'paid').map((invoice) => (
                    <MenuItem key={invoice._id} value={invoice._id}>
                      #{invoice.invoiceNumber} - ${invoice.amount}
                    </MenuItem>
                  )) : []}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="check">Check</MenuItem>
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payment Date"
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog({ open: false })}>
            Cancel
          </Button>
          <Button onClick={recordPayment} variant="contained">
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tuition Rate Management Dialog */}
      <Dialog open={tuitionDialog.open} onClose={() => setTuitionDialog({ open: false, mode: 'create', child: null })} maxWidth="md" fullWidth>
        <DialogTitle>
          {tuitionDialog.mode === 'create' ? 'Set Tuition Rate' : 'Update Tuition Rate'}
          {tuitionDialog.child && ` - ${tuitionDialog.child.firstName} ${tuitionDialog.child.lastName}`}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Child</InputLabel>
                <Select
                  value={tuitionForm.childId}
                  onChange={(e) => {
                    const selectedChild = childrenList.find(child => child._id === e.target.value);
                    setTuitionForm({ 
                      ...tuitionForm, 
                      childId: e.target.value,
                      program: selectedChild?.program || ''
                    });
                  }}
                  disabled={tuitionDialog.mode === 'edit'}
                >
                  {Array.isArray(childrenList) ? childrenList.map((child) => (
                    <MenuItem key={child._id} value={child._id}>
                      {child.firstName} {child.lastName} ({child.program})
                    </MenuItem>
                  )) : []}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Monthly Rate ($)"
                type="number"
                value={tuitionForm.monthlyRate}
                onChange={(e) => setTuitionForm({ ...tuitionForm, monthlyRate: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Program"
                value={tuitionForm.program}
                onChange={(e) => setTuitionForm({ ...tuitionForm, program: e.target.value })}
                disabled
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Effective Date"
                type="date"
                value={tuitionForm.effectiveDate}
                onChange={(e) => setTuitionForm({ ...tuitionForm, effectiveDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes (Optional)"
                value={tuitionForm.notes}
                onChange={(e) => setTuitionForm({ ...tuitionForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTuitionDialog({ open: false, mode: 'create', child: null })}>
            Cancel
          </Button>
          <Button onClick={handleTuitionSubmit} variant="contained">
            {tuitionDialog.mode === 'create' ? 'Set Rate' : 'Update Rate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Billing;