// Add this to your admin dashboard to see escrow payments

const [escrowPayments, setEscrowPayments] = useState([]);

const fetchEscrowPayments = async () => {
  try {
    const response = await api.get('/admin/payments/escrow');
    setEscrowPayments(response.data);
  } catch (error) {
    console.error('Error fetching escrow payments:', error);
  }
};

// In your admin dashboard JSX:
<Box sx={{ mb: 3 }}>
  <Typography variant="h6" gutterBottom>
    💰 Money Held in Escrow
  </Typography>
  <TableContainer>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Parent</TableCell>
          <TableCell>Doctor</TableCell>
          <TableCell>Child</TableCell>
          <TableCell>Amount</TableCell>
          <TableCell>Held Since</TableCell>
          <TableCell>Status</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {escrowPayments.map((payment) => (
          <TableRow key={payment._id}>
            <TableCell>{payment.parent?.firstName} {payment.parent?.lastName}</TableCell>
            <TableCell>{payment.doctor?.firstName} {payment.doctor?.lastName}</TableCell>
            <TableCell>{payment.child?.firstName} {payment.child?.lastName}</TableCell>
            <TableCell>₹{payment.totalAmount}</TableCell>
            <TableCell>{new Date(payment.paymentHeldAt).toLocaleDateString()}</TableCell>
            <TableCell>
              <Chip label={payment.status} color="warning" size="small" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
</Box>
