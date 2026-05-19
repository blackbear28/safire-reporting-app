import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Person,
  Edit,
  Delete,
  Block,
  SaveAlt,
  PlayArrow,
  Email,
  CalendarToday,
  CheckCircle,
  AdminPanelSettings,
  Assessment
} from '@mui/icons-material';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../firebase';

export default function UsersManagement({ userRole }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userReportCounts, setUserReportCounts] = useState({});
  const [selectionModel, setSelectionModel] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(arr);
      setLoading(false);
    }, (err) => {
      console.error('Users onSnapshot error', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Count total reports submitted per user
    getDocs(collection(db, 'reports'))
      .then((snap) => {
        const counts = {};
        snap.docs.forEach(d => {
          const uid = d.data().userId;
          if (uid) counts[uid] = (counts[uid] || 0) + 1;
        });
        setUserReportCounts(counts);
      })
      .catch(err => console.warn('Could not fetch report counts:', err));
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
      setSnackbar({ open: true, message: 'User updated', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to update user', severity: 'error' });
    }
  };

  const handleSuspendUser = (user) => {
    setUserToSuspend(user);
    setSuspensionReason('');
    setSuspendDialogOpen(true);
  };

  const submitSuspension = async () => {
    if (!userToSuspend || !suspensionReason.trim()) {
      setSnackbar({ open: true, message: 'Please provide a reason for suspension', severity: 'error' });
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userToSuspend.id), {
        accountStatus: 'suspended',
        suspendedAt: new Date(),
        suspensionReason,
        status: 'suspended'
      });
      setSuspendDialogOpen(false);
      setSnackbar({ open: true, message: 'User suspended', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to suspend user', severity: 'error' });
    }
  };

  const handleReactivateUser = async (user) => {
    try {
      await updateDoc(doc(db, 'users', user.id), {
        accountStatus: 'active',
        reactivatedAt: new Date(),
        status: 'active',
        suspensionReason: null,
        suspendedAt: null
      });
      setSnackbar({ open: true, message: 'User reactivated', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to reactivate user', severity: 'error' });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Permanently delete this user? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      setSnackbar({ open: true, message: 'User deleted (Firestore)', severity: 'success' });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: 'Failed to delete user', severity: 'error' });
    }
  };

  const exportUsersCSV = (rows) => {
    const data = rows && rows.length ? rows : users;
    if (!data || data.length === 0) return setSnackbar({ open: true, message: 'No users to export', severity: 'info' });
    const cols = ['id','name','email','role','status','createdAt'];
    const csvRows = data.map(r => {
      const created = r.createdAt && r.createdAt.toDate ? r.createdAt.toDate().toISOString() : '';
      return cols.map(c => `"${(c==='createdAt'?created:(r[c]||'')).toString().replace(/"/g,'""')}"`).join(',');
    });
    const csv = [cols.join(',')].concat(csvRows).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `users_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'Users exported', severity: 'success' });
  };

  const filtered = users.filter(u => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (u.name||'').toLowerCase().includes(s) || (u.email||'').toLowerCase().includes(s) || (u.role||'').toLowerCase().includes(s);
  });

  const columns = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180, renderCell: (p) => (
      <Box display="flex" alignItems="center" gap={1}>
        <Avatar src={p.row.profilePic}>{(p.value||'U')[0]}</Avatar>
        <Box>
          <Typography variant="subtitle2">{p.value || p.row.email}</Typography>
          <Typography variant="caption" color="text.secondary">{p.row.department || ''}</Typography>
        </Box>
      </Box>
    )},
    { field: 'email', headerName: 'Email', width: 220 },
    { field: 'role', headerName: 'Role', width: 120 },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => <Chip label={p.value} size="small" /> },
    { field: 'createdAt', headerName: 'Joined', width: 160, valueGetter: (p) => p.row.createdAt ? (p.row.createdAt.toDate ? p.row.createdAt.toDate().toLocaleDateString() : p.row.createdAt) : '' },
    { field: 'totalReports', headerName: 'Total Reports', width: 130, valueGetter: (p) => userReportCounts[p.row.id] || 0, renderCell: (p) => (
      <Chip
        icon={<Assessment fontSize="small" />}
        label={userReportCounts[p.row.id] || 0}
        size="small"
        color={(userReportCounts[p.row.id] || 0) > 0 ? 'primary' : 'default'}
        variant="outlined"
      />
    )},
    { field: 'actions', headerName: 'Actions', width: 220, sortable: false, filterable: false, renderCell: (p) => (
      <Box>
        <Tooltip title="View"><IconButton size="small" onClick={() => handleViewUser(p.row)}><Person /></IconButton></Tooltip>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => handleEditUser(p.row)}><Edit /></IconButton></Tooltip>
        {p.row.status === 'active' ? (
          <Tooltip title="Suspend"><IconButton size="small" onClick={() => handleSuspendUser(p.row)} color="error"><Block /></IconButton></Tooltip>
        ) : (
          <Tooltip title="Reactivate"><IconButton size="small" onClick={() => handleReactivateUser(p.row)} color="success"><PlayArrow /></IconButton></Tooltip>
        )}
        {userRole === 'super_admin' && (
          <Tooltip title="Delete"><IconButton size="small" onClick={() => handleDeleteUser(p.row.id)} color="error"><Delete /></IconButton></Tooltip>
        )}
      </Box>
    )}
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Users Management</Typography>

      {/* Summary cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Person sx={{ color: 'primary.main', mr: 1 }} />
                <Box>
                  <Typography variant="h6">{users.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Users</Typography>
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
                  <Typography variant="h6">{users.filter(u => u.status === 'active').length}</Typography>
                  <Typography variant="body2" color="text.secondary">Active Users</Typography>
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
                  <Typography variant="h6">{users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}</Typography>
                  <Typography variant="body2" color="text.secondary">Administrators</Typography>
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
                  <Typography variant="h6">{users.filter(u => u.status === 'suspended').length}</Typography>
                  <Typography variant="body2" color="text.secondary">Suspended</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Assessment sx={{ color: 'info.main', mr: 1 }} />
                <Box>
                  <Typography variant="h6">{Object.values(userReportCounts).reduce((a, b) => a + b, 0)}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Reports Filed</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField size="small" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        <Button size="small" variant="outlined" startIcon={<SaveAlt />} onClick={() => exportUsersCSV(filtered)}>Export CSV</Button>
      </Box>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filtered.map(u => ({ ...u, id: u.id }))}
          columns={columns}
          loading={loading}
          pageSize={10}
          rowsPerPageOptions={[10,25,50]}
          checkboxSelection
          selectionModel={selectionModel}
          onSelectionModelChange={(newSel) => setSelectionModel(newSel)}
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedUser && (
          <>
            <DialogTitle>{editMode ? 'Edit User' : 'User Details'}</DialogTitle>
            <DialogContent>
              {editMode ? (
                <Grid container spacing={2} sx={{ pt: 1 }}>
                  <Grid item xs={12}><TextField fullWidth label="Name" value={selectedUser.name || ''} onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })} /></Grid>
                  <Grid item xs={12}><TextField fullWidth label="Email" value={selectedUser.email || ''} onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })} /></Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Role</InputLabel>
                      <Select value={selectedUser.role || 'user'} label="Role" onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}>
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="moderator">Moderator</MenuItem>
                        {userRole === 'super_admin' && (<><MenuItem value="admin">Admin</MenuItem><MenuItem value="super_admin">Super Admin</MenuItem></>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select value={selectedUser.status || 'active'} label="Status" onChange={(e) => setSelectedUser({ ...selectedUser, status: e.target.value })}>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="suspended">Suspended</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              ) : (
                <Box sx={{ pt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ width: 60, height: 60, mr: 2 }}>{selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : 'U'}</Avatar>
                    <Box>
                      <Typography variant="h6">{selectedUser.name || 'Unknown User'}</Typography>
                      <Chip label={selectedUser.role || 'user'} size="small" />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}><Email sx={{ mr: 1, color: 'text.secondary' }} /><Typography>{selectedUser.email || 'No email'}</Typography></Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}><CalendarToday sx={{ mr: 1, color: 'text.secondary' }} /><Typography>Joined: {selectedUser.createdAt?.toDate?.()?.toLocaleDateString ? selectedUser.createdAt.toDate().toLocaleDateString() : ''}</Typography></Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Assessment sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography>
                      Total Reports Submitted: <strong>{userReportCounts[selectedUser.id] || 0}</strong>
                    </Typography>
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>{editMode ? 'Cancel' : 'Close'}</Button>
              {editMode ? (<Button variant="contained" onClick={handleUpdateUser}>Save Changes</Button>) : (userRole && <Button variant="contained" onClick={() => setEditMode(true)}>Edit User</Button>)}
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={suspendDialogOpen} onClose={() => setSuspendDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Suspend User Account</DialogTitle>
        <DialogContent>
          {userToSuspend && (
            <Box>
              <Typography variant="subtitle2">User: {userToSuspend.name || userToSuspend.email}</Typography>
              <TextField fullWidth label="Reason for suspension" multiline rows={4} value={suspensionReason} onChange={(e) => setSuspensionReason(e.target.value)} sx={{ mt: 2 }} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={submitSuspension}>Suspend User</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
