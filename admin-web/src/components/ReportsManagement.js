import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
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
  Grid,
  Card,
  CardContent,
  CardActions,
  Alert,
  Snackbar,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle,
  Pending,
  Assignment,
  LocationOn,
  Person,
  CalendarToday
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  orderBy,
  where 
} from 'firebase/firestore';
import { db } from '../firebase';

export default function ReportsManagement({ userRole }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    let q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    
    // Apply filters
    if (statusFilter !== 'all') {
      q = query(collection(db, 'reports'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Apply priority filter on client side (Firestore compound queries can be complex)
      const filteredReports = priorityFilter === 'all' 
        ? reportsData 
        : reportsData.filter(report => report.priority === priorityFilter);
      
      setReports(filteredReports);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [statusFilter, priorityFilter]);

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: newStatus,
        updatedAt: new Date(),
        updatedBy: 'admin' // You can get actual admin ID from auth
      });
      
      showSnackbar(`Report status updated to ${newStatus}`, 'success');
      setDialogOpen(false);
    } catch (error) {
      console.error('Error updating report:', error);
      showSnackbar('Failed to update report status', 'error');
    }
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setDialogOpen(true);
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'success';
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return <CheckCircle />;
      case 'pending': return <Pending />;
      case 'in_progress': return <Assignment />;
      default: return <Pending />;
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports Management
      </Typography>
      
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Filters */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                label="Status Filter"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Priority Filter</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority Filter"
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <MenuItem value="all">All Priorities</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" color="text.secondary">
              Total Reports: {reports.length}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Reports Grid */}
      <Grid container spacing={2}>
        {reports.map((report) => (
          <Grid item xs={12} md={6} lg={4} key={report.id}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {getStatusIcon(report.status)}
                  <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }} noWrap>
                    {report.title || 'Untitled Report'}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip 
                    label={report.status || 'pending'} 
                    color={getStatusColor(report.status)}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip 
                    label={report.priority || 'medium'} 
                    color={getPriorityColor(report.priority)}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip 
                    label={report.category || 'General'} 
                    variant="outlined"
                    size="small"
                    sx={{ mb: 1 }}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} noWrap>
                  {report.description || 'No description provided'}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Person sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="caption">
                    {report.anonymous ? 'Anonymous' : (report.reporterName || 'Unknown')}
                  </Typography>
                </Box>

                {report.location && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOn sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="caption">
                      {report.location.building} - {report.location.room}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarToday sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="caption">
                    {report.createdAt?.toDate()?.toLocaleDateString() || 'Unknown date'}
                  </Typography>
                </Box>
              </CardContent>

              <CardActions>
                <Button 
                  size="small" 
                  onClick={() => handleViewDetails(report)}
                >
                  View Details
                </Button>
                {report.status === 'pending' && (
                  <Button 
                    size="small" 
                    color="primary"
                    onClick={() => handleUpdateStatus(report.id, 'in_progress')}
                  >
                    Start Review
                  </Button>
                )}
                {report.status === 'in_progress' && (
                  <Button 
                    size="small" 
                    color="success"
                    onClick={() => handleUpdateStatus(report.id, 'resolved')}
                  >
                    Mark Resolved
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {reports.length === 0 && !loading && (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No reports found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {statusFilter !== 'all' || priorityFilter !== 'all' 
              ? 'Try adjusting your filters'
              : 'Reports will appear here when submitted'
            }
          </Typography>
        </Paper>
      )}

      {/* Report Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedReport && (
          <>
            <DialogTitle>
              Report Details: {selectedReport.title || 'Untitled Report'}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Status</Typography>
                  <Chip 
                    label={selectedReport.status || 'pending'} 
                    color={getStatusColor(selectedReport.status)}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Priority</Typography>
                  <Chip 
                    label={selectedReport.priority || 'medium'} 
                    color={getPriorityColor(selectedReport.priority)}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Description</Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {selectedReport.description || 'No description provided'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Reporter</Typography>
                  <Typography variant="body2">
                    {selectedReport.anonymous ? 'Anonymous' : (selectedReport.reporterName || 'Unknown')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>Category</Typography>
                  <Typography variant="body2">
                    {selectedReport.category || 'General'}
                  </Typography>
                </Grid>
                {selectedReport.location && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Location</Typography>
                    <Typography variant="body2">
                      {selectedReport.location.building} - {selectedReport.location.room}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Submitted</Typography>
                  <Typography variant="body2">
                    {selectedReport.createdAt?.toDate()?.toLocaleString() || 'Unknown date'}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
              {selectedReport.status === 'pending' && (
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => handleUpdateStatus(selectedReport.id, 'in_progress')}
                >
                  Start Review
                </Button>
              )}
              {selectedReport.status === 'in_progress' && (
                <Button 
                  variant="contained" 
                  color="success"
                  onClick={() => handleUpdateStatus(selectedReport.id, 'resolved')}
                >
                  Mark as Resolved
                </Button>
              )}
              {selectedReport.status !== 'rejected' && (
                <Button 
                  variant="outlined" 
                  color="error"
                  onClick={() => handleUpdateStatus(selectedReport.id, 'rejected')}
                >
                  Reject Report
                </Button>
              )}
            </DialogActions>
          </>
        )}
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
