// Add this to your parent dashboard to see payment status

const [paymentStatus, setPaymentStatus] = useState([]);

const fetchPaymentStatus = async () => {
  try {
    const response = await api.get('/appointments/payments/status');
    setPaymentStatus(response.data);
  } catch (error) {
    console.error('Error fetching payment status:', error);
  }
};

// In your parent dashboard JSX:
<Box sx={{ mb: 3 }}>
  <Typography variant="h6" gutterBottom>
    💳 Payment Status
  </Typography>
  <TableContainer>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Child</TableCell>
          <TableCell>Doctor</TableCell>
          <TableCell>Appointment Date</TableCell>
          <TableCell>Amount</TableCell>
          <TableCell>Payment Status</TableCell>
          <TableCell>Action</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {paymentStatus.map((payment) => (
          <TableRow key={payment._id}>
            <TableCell>{payment.appointment?.child?.firstName} {payment.appointment?.child?.lastName}</TableCell>
            <TableCell>{payment.doctor?.firstName} {payment.doctor?.lastName}</TableCell>
            <TableCell>{new Date(payment.appointment?.appointmentDate).toLocaleDateString()}</TableCell>
            <TableCell>₹{payment.totalAmount}</TableCell>
            <TableCell>
              <Chip 
                label={payment.status.replace('_', ' ').toUpperCase()} 
                color={
                  payment.status === 'payment_held' ? 'warning' :
                  payment.status === 'admin_approved' ? 'success' :
                  payment.status === 'paid' ? 'success' : 'default'
                } 
                size="small" 
              />
            </TableCell>
            <TableCell>
              {payment.status === 'payment_held' && (
                <Typography variant="caption" color="text.secondary">
                  ⏳ Waiting for completion
                </Typography>
              )}
              {payment.status === 'admin_approved' && (
                <Typography variant="caption" color="success.main">
                  ✅ Paid to doctor
                </Typography>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
</Box>
