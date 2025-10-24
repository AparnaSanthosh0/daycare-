import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  ToggleOn,
  ToggleOff,
  Visibility,
  Refresh,
  Search,
  Delete
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../config/api';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  // Note: totalPages is available from API but not used elsewhere; removed to avoid unused var warning
  
  // Filters
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [viewDialog, setViewDialog] = useState({ open: false, user: null });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, user: null, action: '' });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        role: roleFilter,
        status: statusFilter
      };

      const response = await api.get('/api/admin/users', { params });
      setUsers(response.data.users);
      setTotalUsers(response.data.total);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, roleFilter, statusFilter]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/api/admin/users/${userId}/toggle-status`);
      fetchUsers();
      setConfirmDialog({ open: false, user: null, action: '' });
    } catch (error) {
      console.error('Error toggling user status:', error);
      setError('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await api.delete(`/api/admin/users/${userId}`);
      fetchUsers();
      setConfirmDialog({ open: false, user: null, action: '' });
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(u => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        u.firstName.toLowerCase().includes(searchLower) ||
        u.lastName.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'staff': return 'primary';
      case 'parent': return 'success';
      case 'vendor': return 'warning';
      case 'customer': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'success' : 'error';
  };

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Admin privileges required.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          User Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchUsers}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Total Users
              </Typography>
              <Typography variant="h4">
                {totalUsers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Active Users
              </Typography>
              <Typography variant="h4">
                {users.filter(u => u.isActive).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Staff Members
              </Typography>
              <Typography variant="h4">
                {users.filter(u => u.role === 'staff').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Parents
              </Typography>
              <Typography variant="h4">
                {users.filter(u => u.role === 'parent').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Search Users"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={roleFilter}
                label="Role"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="staff">Staff</MenuItem>
                <MenuItem value="parent">Parent</MenuItem>
                <MenuItem value="vendor">Vendor</MenuItem>
                <MenuItem value="customer">Customer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Users Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell>
                      {u.firstName} {u.lastName}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={u.role.toUpperCase()}
                        color={getRoleColor(u.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={u.isActive ? 'Active' : 'Inactive'}
                        color={getStatusColor(u.isActive)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{u.phone || 'N/A'}</TableCell>
                    <TableCell>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          onClick={() => setViewDialog({ open: true, user: u })}
                          size="small"
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      {u._id !== user.userId && (
                        <>
                          <Tooltip title={u.isActive ? 'Deactivate' : 'Activate'}>
                            <IconButton
                              onClick={() => setConfirmDialog({
                                open: true,
                                user: u,
                                action: u.isActive ? 'deactivate' : 'activate'
                              })}
                              size="small"
                              color={u.isActive ? 'error' : 'success'}
                            >
                              {u.isActive ? <ToggleOff /> : <ToggleOn />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User">
                            <IconButton
                              onClick={() => setConfirmDialog({
                                open: true,
                                user: u,
                                action: 'delete'
                              })}
                              size="small"
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalUsers}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* View User Dialog */}
      <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false, user: null })} maxWidth="md" fullWidth>
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {viewDialog.user && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Name:</Typography>
                <Typography>{viewDialog.user.firstName} {viewDialog.user.lastName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Email:</Typography>
                <Typography>{viewDialog.user.email}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Role:</Typography>
                <Chip
                  label={viewDialog.user.role.toUpperCase()}
                  color={getRoleColor(viewDialog.user.role)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Status:</Typography>
                <Chip
                  label={viewDialog.user.isActive ? 'Active' : 'Inactive'}
                  color={getStatusColor(viewDialog.user.isActive)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Phone:</Typography>
                <Typography>{viewDialog.user.phone || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Joined:</Typography>
                <Typography>{new Date(viewDialog.user.createdAt).toLocaleString()}</Typography>
              </Grid>
              {viewDialog.user.address && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Address:</Typography>
                  <Typography>
                    {[
                      viewDialog.user.address.street,
                      viewDialog.user.address.city,
                      viewDialog.user.address.state,
                      viewDialog.user.address.zipCode
                    ].filter(Boolean).join(', ') || 'N/A'}
                  </Typography>
                </Grid>
              )}
              {viewDialog.user.staff && (
                <>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Experience:</Typography>
                    <Typography>{viewDialog.user.staff.yearsOfExperience} years</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Qualification:</Typography>
                    <Typography>{viewDialog.user.staff.qualification || 'N/A'}</Typography>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, user: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, user: null, action: '' })}>
        <DialogTitle>
          {confirmDialog.action === 'delete' ? 'Delete' : confirmDialog.action === 'activate' ? 'Activate' : 'Deactivate'} User
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.action === 'delete' ? (
              <>
                Are you sure you want to permanently delete {confirmDialog.user?.firstName} {confirmDialog.user?.lastName}?
                <br />
                <strong>This action cannot be undone and will also delete:</strong>
                <br />
                • All associated children (if parent)
                <br />
                • All vendor records (if vendor)
                <br />
                • All user data and history
              </>
            ) : (
              `Are you sure you want to ${confirmDialog.action} ${confirmDialog.user?.firstName} ${confirmDialog.user?.lastName}?`
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, user: null, action: '' })}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (confirmDialog.action === 'delete') {
                handleDeleteUser(confirmDialog.user?._id);
              } else {
                handleToggleUserStatus(confirmDialog.user?._id, confirmDialog.user?.isActive);
              }
            }}
            color={confirmDialog.action === 'delete' ? 'error' : confirmDialog.action === 'activate' ? 'success' : 'error'}
            variant="contained"
          >
            {confirmDialog.action === 'delete' ? 'Delete' : confirmDialog.action === 'activate' ? 'Activate' : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;