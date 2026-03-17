// Add this to your doctor dashboard to see pending escrow payments

const [pendingPayments, setPendingPayments] = useState([]);

const fetchPendingPayments = async () => {
  try {
    const response = await api.get('/doctor/payments/pending');
    setPendingPayments(response.data);
  } catch (error) {
    console.error('Error fetching pending payments:', error);
  }
};

// In your doctor dashboard JSX:
<Box sx={{ mb: 3 }}>
  <Typography variant="h6" gutterBottom>
    ⏳ Pending Payments (Waiting for Completion)
  </Typography>
  <TableContainer>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Child</TableCell>
          <TableCell>Parent</TableCell>
          <TableCell>Appointment Date</TableCell>
          <TableCell>Amount</TableCell>
          <TableCell>Your Share (70%)</TableCell>
          <TableCell>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {pendingPayments.map((payment) => (
          <TableRow key={payment._id}>
            <TableCell>{payment.appointment?.child?.firstName} {payment.appointment?.child?.lastName}</TableCell>
            <TableCell>{payment.parent?.firstName} {payment.parent?.lastName}</TableCell>
            <TableCell>{new Date(payment.appointment?.appointmentDate).toLocaleDateString()}</TableCell>
            <TableCell>₹{payment.totalAmount}</TableCell>
            <TableCell sx={{ color: 'green', fontWeight: 'bold' }}>
              ₹{payment.payoutAmount}
            </TableCell>
            <TableCell>
              <Chip label="Payment Held" color="warning" size="small" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
</Box>
