import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Person,
  Edit,
  Delete,
  Block,
  CheckCircle,
  Email,
  CalendarToday,
  AdminPanelSettings,
  Warning,
  PlayArrow
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc,
  deleteDoc,
  orderBy,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

// Supabase configuration for deleting profile images
const SUPABASE_URL = 'https://ghxhfyjjjdtyzxiwwehg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoeGhmeWpqamR0eXp4aXd3ZWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NjgwMjYsImV4cCI6MjA4NDI0NDAyNn0.xqZnryQb9ShZHTPdBHzQGyID6PsQeHiAfn2CEc4rKg0';
const STORAGE_BUCKET = 'report-images';

export default function UsersManagement({ userRole }) {
  const [users, setUsers] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [_loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [userToSuspend, setUserToSuspend] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setEditMode(false);
    setDialogOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role,
        status: selectedUser.status,
        updatedAt: new Date()
      });
      setDialogOpen(false);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const _handleToggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleSuspendUser = (user) => {
    setUserToSuspend(user);
    setSuspensionReason('');
    setSuspendDialogOpen(true);
  };

  const submitSuspension = async () => {
    if (!userToSuspend || !suspensionReason.trim()) {
      showSnackbar('Please provide a reason for suspension', 'error');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userToSuspend.id), {
        accountStatus: 'suspended',
        suspendedAt: new Date(),
        suspensionReason: suspensionReason,
        suspendedBy: 'admin', // You can get actual admin ID from auth
        status: 'suspended'
      });

      showSnackbar(`User ${userToSuspend.name || userToSuspend.email} has been suspended`, 'success');
      setSuspendDialogOpen(false);
      setUserToSuspend(null);
      setSuspensionReason('');
    } catch (error) {
      console.error('Error suspending user:', error);
      showSnackbar('Failed to suspend user', 'error');
    }
  };

  const handleReactivateUser = async (user) => {
    try {
      await updateDoc(doc(db, 'users', user.id), {
        accountStatus: 'active',
        reactivatedAt: new Date(),
        reactivatedBy: 'admin',
        status: 'active',
        suspensionReason: null,
        suspendedAt: null
      });

      showSnackbar(`User ${user.name || user.email} has been reactivated`, 'success');
    } catch (error) {
      console.error('Error reactivating user:', error);
      showSnackbar('Failed to reactivate user', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  // eslint-disable-next-line no-unused-vars
  const _getUserStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const handleDeleteUser = async (userId) => {
    const userToDelete = users.find(u => u.id === userId);
    
    if (!window.confirm(
      `Are you sure you want to permanently delete ${userToDelete?.name || 'this user'}?\n\n` +
      `This will delete:\n` +
      `• User account from Firebase Authentication\n` +
      `• User profile from Firestore\n` +
      `• All user reports\n` +
      `• Profile pictures from Supabase\n\n` +
      `This action CANNOT be undone!`
    )) {
      return;
    }

    try {
      setSnackbar({ open: true, message: 'Deleting user...', severity: 'info' });

      // 1. Delete user's profile pictures from Supabase
      if (userToDelete?.profilePic || userToDelete?.coverPhoto) {
        try {
          const deletePromises = [];
          
          if (userToDelete.profilePic && userToDelete.profilePic.includes('supabase.co')) {
            const profilePath = userToDelete.profilePic.split(`${STORAGE_BUCKET}/`)[1];
            if (profilePath) {
              deletePromises.push(
                fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${profilePath}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY
                  }
                })
              );
            }
          }
          
          if (userToDelete.coverPhoto && userToDelete.coverPhoto.includes('supabase.co')) {
            const coverPath = userToDelete.coverPhoto.split(`${STORAGE_BUCKET}/`)[1];
            if (coverPath) {
              deletePromises.push(
                fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${coverPath}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY
                  }
                })
              );
            }
          }
          
          if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
            console.log('Profile images deleted from Supabase');
          }
        } catch (error) {
          console.error('Error deleting Supabase images:', error);
          // Continue even if image deletion fails
        }
      }

      // 2. Delete user's reports from Firestore
      try {
        const reportsQuery = query(collection(db, 'reports'), where('authorId', '==', userId));
        const reportsSnapshot = await getDocs(reportsQuery);
        const deleteReportsPromises = reportsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deleteReportsPromises);
        console.log(`Deleted ${reportsSnapshot.docs.length} reports`);
      } catch (error) {
        console.error('Error deleting user reports:', error);
      }

      // 3. Delete user document from Firestore
      await deleteDoc(doc(db, 'users', userId));
      console.log('User document deleted from Firestore');

      // 4. Delete from Firebase Authentication
      // Note: This requires Firebase Admin SDK on backend OR the Cloud Functions approach
      // For now, we'll make a note that admin needs to manually delete from Auth
      // OR you can set up a Cloud Function triggered by Firestore delete
      
      setSnackbar({ 
        open: true, 
        message: `User deleted successfully! Note: Please also delete this user from Firebase Authentication Console.`, 
        severity: 'success' 
      });
      
    } catch (error) {
      console.error('Error deleting user:', error);
      setSnackbar({ 
        open: true, 
        message: `Error deleting user: ${error.message}`, 
        severity: 'error' 
      });
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'error';
      case 'admin': return 'warning';
      case 'moderator': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const canEditUser = (user) => {
    if (userRole === 'super_admin') return true;
    if (userRole === 'admin' && user.role !== 'super_admin' && user.role !== 'admin') return true;
    return false;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Users Management
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Person sx={{ color: 'primary.main', mr: 1 }} />
                <Box>
                  <Typography variant="h6">
                    {users.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
                <Box>
                  <Typography variant="h6">
                    {users.filter(u => u.status === 'active').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Users
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AdminPanelSettings sx={{ color: 'warning.main', mr: 1 }} />
                <Box>
                  <Typography variant="h6">
                    {users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Administrators
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Block sx={{ color: 'error.main', mr: 1 }} />
                <Box>
                  <Typography variant="h6">
                    {users.filter(u => u.status === 'suspended').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Suspended
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Users Table */}
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {user.name || 'Unknown User'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {user.id.substring(0, 8)}...
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email || 'No email'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role || 'user'} 
                      color={getRoleColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.status || 'active'} 
                      color={getStatusColor(user.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {user.createdAt?.toDate()?.toLocaleDateString() || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small" 
                        onClick={() => handleViewUser(user)}
                      >
                        <Person />
                      </IconButton>
                    </Tooltip>
                    
                    {canEditUser(user) && (
                      <>
                        <Tooltip title="Edit User">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        
                        {user.status === 'active' || user.accountStatus === 'active' ? (
                          <Tooltip title="Suspend User">
                            <IconButton 
                              size="small" 
                              onClick={() => handleSuspendUser(user)}
                              color="error"
                            >
                              <Block />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Reactivate User">
                            <IconButton 
                              size="small" 
                              onClick={() => handleReactivateUser(user)}
                              color="success"
                            >
                              <PlayArrow />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {userRole === 'super_admin' && (
                          <Tooltip title="Delete User">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteUser(user.id)}
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* User Details/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedUser && (
          <>
            <DialogTitle>
              {editMode ? 'Edit User' : 'User Details'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                {editMode ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Name"
                        value={selectedUser.name || ''}
                        onChange={(e) => setSelectedUser({
                          ...selectedUser,
                          name: e.target.value
                        })}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        value={selectedUser.email || ''}
                        onChange={(e) => setSelectedUser({
                          ...selectedUser,
                          email: e.target.value
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Role</InputLabel>
                        <Select
                          value={selectedUser.role || 'user'}
                          label="Role"
                          onChange={(e) => setSelectedUser({
                            ...selectedUser,
                            role: e.target.value
                          })}
                        >
                          <MenuItem value="user">User</MenuItem>
                          <MenuItem value="moderator">Moderator</MenuItem>
                          {userRole === 'super_admin' && (
                            <>
                              <MenuItem value="admin">Admin</MenuItem>
                              <MenuItem value="super_admin">Super Admin</MenuItem>
                            </>
                          )}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={selectedUser.status || 'active'}
                          label="Status"
                          onChange={(e) => setSelectedUser({
                            ...selectedUser,
                            status: e.target.value
                          })}
                        >
                          <MenuItem value="active">Active</MenuItem>
                          <MenuItem value="suspended">Suspended</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                ) : (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ width: 60, height: 60, mr: 2, bgcolor: 'primary.main' }}>
                          {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {selectedUser.name || 'Unknown User'}
                          </Typography>
                          <Chip 
                            label={selectedUser.role || 'user'} 
                            color={getRoleColor(selectedUser.role)}
                            size="small"
                          />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Email sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography>{selectedUser.email || 'No email provided'}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CalendarToday sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography>
                          Joined: {selectedUser.createdAt?.toDate()?.toLocaleDateString() || 'Unknown'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>Status</Typography>
                      <Chip 
                        label={selectedUser.status || 'active'} 
                        color={getStatusColor(selectedUser.status)}
                      />
                      {selectedUser.accountStatus === 'suspended' && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
                          <Typography variant="body2" color="error.dark">
                            <strong>Suspended:</strong> {selectedUser.suspensionReason}
                          </Typography>
                          <Typography variant="caption" color="error.dark">
                            Suspended at: {selectedUser.suspendedAt?.toDate()?.toLocaleString()}
                          </Typography>
                        </Box>
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom>Report History</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip 
                          label={`False Reports: ${selectedUser.falseReportsCount || 0}`}
                          color={selectedUser.falseReportsCount > 2 ? 'error' : selectedUser.falseReportsCount > 0 ? 'warning' : 'success'}
                          size="small"
                          icon={selectedUser.falseReportsCount > 0 ? <Warning /> : <CheckCircle />}
                        />
                        {selectedUser.autoSuspended && (
                          <Chip 
                            label="Auto-Suspended" 
                            color="error" 
                            size="small"
                            icon={<Block />}
                          />
                        )}
                      </Box>
                      {selectedUser.falseReportsCount > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Last false report: {selectedUser.lastFalseReport?.toDate()?.toLocaleDateString() || 'Unknown'}
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>
                {editMode ? 'Cancel' : 'Close'}
              </Button>
              {editMode ? (
                <Button variant="contained" onClick={handleUpdateUser}>
                  Save Changes
                </Button>
              ) : (
                canEditUser(selectedUser) && (
                  <Button variant="contained" onClick={() => setEditMode(true)}>
                    Edit User
                  </Button>
                )
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Suspension Dialog */}
      <Dialog open={suspendDialogOpen} onClose={() => setSuspendDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Block sx={{ mr: 1, color: 'error.main' }} />
            Suspend User Account
          </Box>
        </DialogTitle>
        <DialogContent>
          {userToSuspend && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                You are about to suspend this user account. This will:
                <ul>
                  <li>Prevent the user from logging into the app</li>
                  <li>Block all user activity and report submissions</li>
                  <li>Require manual reactivation by an administrator</li>
                </ul>
              </Alert>
              
              <Typography variant="subtitle2" gutterBottom>
                User: {userToSuspend.name || userToSuspend.email}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current false reports: {userToSuspend.falseReportsCount || 0}
              </Typography>
              
              <TextField
                fullWidth
                label="Reason for suspension"
                placeholder="Please explain why this user is being suspended..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                multiline
                rows={4}
                required
                error={!suspensionReason.trim()}
                helperText={!suspensionReason.trim() ? "A reason is required" : ""}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={submitSuspension}
            variant="contained" 
            color="error"
            disabled={!suspensionReason.trim()}
            startIcon={<Block />}
          >
            Suspend User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
