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
  CalendarToday,
  Warning,
  Block,
  Flag,
  Visibility
} from '@mui/icons-material';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  analyzePotentialFalseReport, 
  shouldAutoFlag
} from '../utils/falseReportDetection';

export default function ReportsManagement({ userRole }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [reportToFlag, setReportToFlag] = useState(null);
  const [aiAnalysisDialogOpen, setAiAnalysisDialogOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [reportToAnalyze, setReportToAnalyze] = useState(null);

  useEffect(() => {
    let q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    
    // Apply filters
    if (statusFilter !== 'all') {
      q = query(collection(db, 'reports'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Run automatic AI analysis on new reports
      for (const report of reportsData) {
        if (!report.aiAnalyzed && report.status === 'pending') {
          try {
            // Fetch user history for analysis
            const userReportsQuery = query(
              collection(db, 'reports'), 
              where('userId', '==', report.userId || ''),
              orderBy('createdAt', 'desc')
            );
            
            const userReportsSnapshot = await getDocs(userReportsQuery);
            const userHistory = userReportsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            const analysis = analyzePotentialFalseReport(report, userHistory);
            
            // Update report with AI analysis
            await updateDoc(doc(db, 'reports', report.id), {
              aiAnalyzed: true,
              aiAnalysis: {
                suspicionScore: analysis.suspicionScore,
                riskLevel: analysis.riskLevel,
                isSuspicious: analysis.isSuspicious,
                confidencePercentage: analysis.confidencePercentage,
                analyzedAt: new Date()
              }
            });

            // Auto-flag highly suspicious reports
            if (shouldAutoFlag(analysis)) {
              await updateDoc(doc(db, 'reports', report.id), {
                aiAutoFlagged: true,
                status: 'flagged_false',
                isFalsePositive: true,
                falsePositiveReason: 'Automatically flagged by AI: ' + analysis.suspiciousFactors.join(', '),
                flaggedAt: new Date(),
                flaggedBy: 'AI_System'
              });

              console.log(`Report ${report.id} auto-flagged by AI`);
            }

          } catch (error) {
            console.error('Error running automatic AI analysis:', error);
          }
        }
      }
      
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

  const handleFlagAsFalse = (report) => {
    setReportToFlag(report);
    setFlagReason('');
    setFlagDialogOpen(true);
  };

  const submitFalseReport = async () => {
    if (!reportToFlag || !flagReason.trim()) {
      showSnackbar('Please provide a reason for flagging this report', 'error');
      return;
    }

    try {
      // Update the report as false positive
      await updateDoc(doc(db, 'reports', reportToFlag.id), {
        isFalsePositive: true,
        falsePositiveReason: flagReason,
        flaggedAt: new Date(),
        flaggedBy: 'admin',
        status: 'flagged_false'
      });

      // Track false reporting by user
      if (reportToFlag.userId) {
        const userRef = doc(db, 'users', reportToFlag.userId);
        await updateDoc(userRef, {
          falseReportsCount: (reportToFlag.userFalseReportsCount || 0) + 1,
          lastFalseReport: new Date()
        });

        // Auto-suspend if user has too many false reports
        const falseReportsCount = (reportToFlag.userFalseReportsCount || 0) + 1;
        if (falseReportsCount >= 3) {
          await updateDoc(userRef, {
            accountStatus: 'suspended',
            suspendedAt: new Date(),
            suspensionReason: 'Multiple false reports detected',
            autoSuspended: true
          });
          showSnackbar(`User suspended automatically after ${falseReportsCount} false reports`, 'warning');
        }
      }

      showSnackbar('Report flagged as false positive', 'success');
      setFlagDialogOpen(false);
      setReportToFlag(null);
      setFlagReason('');
    } catch (error) {
      console.error('Error flagging report:', error);
      showSnackbar('Failed to flag report as false', 'error');
    }
  };

  const handleAIAnalysis = async (report) => {
    try {
      setReportToAnalyze(report);
      
      // Fetch user's report history for analysis
      const userReportsQuery = query(
        collection(db, 'reports'), 
        where('userId', '==', report.userId || ''),
        orderBy('createdAt', 'desc')
      );
      
      const userReportsSnapshot = await getDocs(userReportsQuery);
      const userHistory = userReportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Run AI analysis
      const analysis = analyzePotentialFalseReport(report, userHistory);
      setAnalysisResult(analysis);
      setAiAnalysisDialogOpen(true);

      // If analysis suggests auto-flagging, show recommendation
      if (shouldAutoFlag(analysis)) {
        showSnackbar('AI analysis suggests this report may be false - review recommended', 'warning');
      }

    } catch (error) {
      console.error('Error running AI analysis:', error);
      showSnackbar('Failed to run AI analysis', 'error');
    }
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setDialogOpen(true);
  };

  const handleDeleteReport = async (reportId) => {
    if (window.confirm('Are you sure you want to permanently delete this report? This action cannot be undone.')) {
      try {
        const reportRef = doc(db, 'reports', reportId);
        await deleteDoc(reportRef);
        showSnackbar('Report deleted successfully', 'success');
        setDialogOpen(false);
        setSelectedReport(null);
      } catch (error) {
        console.error('Error deleting report:', error);
        showSnackbar(`Failed to delete report: ${error.message}`, 'error');
      }
    }
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
                <MenuItem value="flagged_false">Flagged as False</MenuItem>
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

                {/* Display media images if available */}
                {report.media && report.media.length > 0 && (
                  <Box sx={{ mb: 2, display: 'flex', gap: 1, overflow: 'auto' }}>
                    {report.media.slice(0, 3).map((imageUrl, index) => (
                      <Box
                        key={index}
                        component="img"
                        src={imageUrl}
                        alt={`Report media ${index + 1}`}
                        sx={{
                          width: 80,
                          height: 80,
                          objectFit: 'cover',
                          borderRadius: 1,
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.8 }
                        }}
                        onClick={() => window.open(imageUrl, '_blank')}
                      />
                    ))}
                    {report.media.length > 3 && (
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: 1,
                          bgcolor: 'grey.200',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Typography variant="caption">
                          +{report.media.length - 3}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}

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
                    sx={{ mr: 1, mb: 1 }}
                  />
                  {report.aiAnalysis && (
                    <Chip 
                      label={`AI: ${report.aiAnalysis.riskLevel}`}
                      color={report.aiAnalysis.riskLevel === 'HIGH' ? 'error' : report.aiAnalysis.riskLevel === 'MEDIUM' ? 'warning' : 'success'}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  )}
                  {report.aiAutoFlagged && (
                    <Chip 
                      label="Auto-Flagged"
                      color="error"
                      size="small"
                      icon={<Warning />}
                      sx={{ mb: 1 }}
                    />
                  )}
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
                  startIcon={<Visibility />}
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
                <Button 
                  size="small" 
                  color="info"
                  onClick={() => handleAIAnalysis(report)}
                  startIcon={<Assignment />}
                >
                  AI Check
                </Button>
                {!report.isFalsePositive && report.status !== 'resolved' && (
                  <Button 
                    size="small" 
                    color="error"
                    onClick={() => handleFlagAsFalse(report)}
                    startIcon={<Flag />}
                  >
                    Flag False
                  </Button>
                )}
                {report.isFalsePositive && (
                  <Chip 
                    label="False Report" 
                    color="error" 
                    size="small"
                    icon={<Warning />}
                  />
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
              <Button 
                variant="outlined" 
                color="error"
                onClick={() => handleDeleteReport(selectedReport.id)}
                startIcon={<Block />}
              >
                Delete Report
              </Button>
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
                  color="warning"
                  onClick={() => handleUpdateStatus(selectedReport.id, 'rejected')}
                >
                  Reject Report
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Flag as False Dialog */}
      <Dialog open={flagDialogOpen} onClose={() => setFlagDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Flag sx={{ mr: 1 }} />
            Flag Report as False Positive
          </Box>
        </DialogTitle>
        <DialogContent>
          {reportToFlag && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                You are about to flag this report as a false positive. This action will:
                <ul>
                  <li>Mark the report as invalid</li>
                  <li>Count towards the user's false report history</li>
                  <li>Potentially suspend the user if they have multiple false reports</li>
                </ul>
              </Alert>
              
              <Typography variant="subtitle2" gutterBottom>
                Report: {reportToFlag.title || 'Untitled Report'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {reportToFlag.description}
              </Typography>
              
              <TextField
                fullWidth
                label="Reason for flagging as false"
                placeholder="Please explain why this report is considered false or misleading..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                multiline
                rows={4}
                required
                error={!flagReason.trim()}
                helperText={!flagReason.trim() ? "A reason is required" : ""}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFlagDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={submitFalseReport}
            variant="contained" 
            color="error"
            disabled={!flagReason.trim()}
            startIcon={<Flag />}
          >
            Flag as False
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Analysis Dialog */}
      <Dialog open={aiAnalysisDialogOpen} onClose={() => setAiAnalysisDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Assignment sx={{ mr: 1, color: 'info.main' }} />
            AI Report Analysis
          </Box>
        </DialogTitle>
        <DialogContent>
          {reportToAnalyze && analysisResult && (
            <>
              <Typography variant="h6" gutterBottom>
                Report: {reportToAnalyze.title || 'Untitled Report'}
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ p: 2, textAlign: 'center', bgcolor: analysisResult.riskLevel === 'HIGH' ? 'error.light' : analysisResult.riskLevel === 'MEDIUM' ? 'warning.light' : 'success.light' }}>
                      <Typography variant="h4" color={analysisResult.riskLevel === 'HIGH' ? 'error.dark' : analysisResult.riskLevel === 'MEDIUM' ? 'warning.dark' : 'success.dark'}>
                        {analysisResult.confidencePercentage}%
                      </Typography>
                      <Typography variant="body2">
                        Suspicion Level
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5">
                        {analysisResult.riskLevel}
                      </Typography>
                      <Typography variant="body2">
                        Risk Level
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h5">
                        {analysisResult.isSuspicious ? 'SUSPICIOUS' : 'NORMAL'}
                      </Typography>
                      <Typography variant="body2">
                        AI Verdict
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>
              </Box>

              <Alert 
                severity={analysisResult.riskLevel === 'HIGH' ? 'error' : analysisResult.riskLevel === 'MEDIUM' ? 'warning' : 'info'} 
                sx={{ mb: 2 }}
              >
                <strong>Recommendation:</strong> {analysisResult.recommendation.message}
              </Alert>

              {analysisResult.suspiciousFactors.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Suspicious Factors Detected:
                  </Typography>
                  <ul>
                    {analysisResult.suspiciousFactors.map((factor, index) => (
                      <li key={index}>
                        <Typography variant="body2">{factor}</Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
              )}

              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Report Content:
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Description:</strong> {reportToAnalyze.description || 'No description'}
                </Typography>
                <Typography variant="body2">
                  <strong>Category:</strong> {reportToAnalyze.category || 'General'}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiAnalysisDialogOpen(false)}>Close</Button>
          {analysisResult && analysisResult.isSuspicious && (
            <Button 
              variant="contained" 
              color="error"
              onClick={() => {
                setAiAnalysisDialogOpen(false);
                handleFlagAsFalse(reportToAnalyze);
              }}
              startIcon={<Flag />}
            >
              Flag as False
            </Button>
          )}
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
