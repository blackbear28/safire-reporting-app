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
  CardContent
} from '@mui/material';
import {
  Person,
  Edit,
  Delete,
  Block,
  CheckCircle,
  Email,
  Phone,
  CalendarToday,
  AdminPanelSettings
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc,
  deleteDoc,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';

export default function UsersManagement({ userRole }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

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

  const handleToggleUserStatus = async (userId, currentStatus) => {
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

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (error) {
        console.error('Error deleting user:', error);
      }
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
                        
                        <Tooltip title={user.status === 'active' ? 'Suspend User' : 'Activate User'}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleToggleUserStatus(user.id, user.status)}
                            color={user.status === 'active' ? 'error' : 'success'}
                          >
                            {user.status === 'active' ? <Block /> : <CheckCircle />}
                          </IconButton>
                        </Tooltip>
                        
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
    </Box>
  );
}
