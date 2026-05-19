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
  Alert,
  Snackbar,
  InputAdornment,
  IconButton,
  Card,
  Divider,
  Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Block,
  Flag,
  Visibility,
  Print,
  Search,
  
  ReportProblem,
  Delete,
  SaveAlt,
  Lock,
  VisibilityOff
} from '@mui/icons-material';
import { Assignment } from '@mui/icons-material';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  getDoc,
  updateDoc, 
  deleteDoc,
  orderBy,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import PrintReport from './PrintReport';
import ModerationService from '../services/moderationService';

export default function ReportsManagement({ userRole }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [search, setSearch] = useState('');
  const [selectionModel, setSelectionModel] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [reportToFlag, setReportToFlag] = useState(null);
  const [aiAnalysisDialogOpen, setAiAnalysisDialogOpen] = useState(false);
  const [reportToAnalyze, setReportToAnalyze] = useState(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [reportToPrint, setReportToPrint] = useState(null);
  const [reporterInfo, setReporterInfo] = useState(null);
  const [reporterLoading, setReporterLoading] = useState(false);

  useEffect(() => {
    let q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    if (statusFilter !== 'all') {
      q = query(collection(db, 'reports'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let reportsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Apply priority filter on client side
      if (priorityFilter !== 'all') {
        reportsData = reportsData.filter(report => report.priority === priorityFilter);
      }
      // Apply date range filter
      if (startDate) {
        const sDate = new Date(startDate);
        reportsData = reportsData.filter(r => r.createdAt && r.createdAt.toDate && r.createdAt.toDate() >= sDate);
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23,59,59,999);
        reportsData = reportsData.filter(r => r.createdAt && r.createdAt.toDate && r.createdAt.toDate() <= eDate);
      }

      // Apply search filter
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        reportsData = reportsData.filter(r =>
          (r.title && r.title.toLowerCase().includes(s)) ||
          (r.description && r.description.toLowerCase().includes(s)) ||
          (r.category && r.category.toLowerCase().includes(s))
        );
      }
      setReports(reportsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [statusFilter, priorityFilter, search, endDate, startDate]);

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
      setAnalysisResult(null);
      setAiAnalysisDialogOpen(true);
      showSnackbar('Running AI triage...', 'info');

      // Fetch user report history for context
      let userReportCount = 0;
      let userFalseReportsCount = 0;
      if (report.userId) {
        try {
          const userReportsSnapshot = await getDocs(
            query(collection(db, 'reports'), where('userId', '==', report.userId))
          );
          userReportCount = userReportsSnapshot.size;
          const falseReports = userReportsSnapshot.docs.filter(d => d.data().isFalsePositive);
          userFalseReportsCount = falseReports.length;
        } catch (_) {}
      }

      const result = await ModerationService.autoTriageReport({
        title: report.title,
        description: report.description,
        category: report.category,
        priority: report.priority,
        anonymous: report.anonymous,
        images: report.media || report.images || [],
        userReportCount,
        userFalseReportsCount,
      });

      if (!result.success) throw new Error(result.error || 'Triage failed');

      const t = result.triage;
      setAnalysisResult({
        suspicionScore: 100 - t.legitimacyConfidence,
        riskLevel: (t.riskLevel || 'low').toUpperCase(),
        isSuspicious: t.shouldFlag,
        legitimacyConfidence: t.legitimacyConfidence,
        confidencePercentage: t.legitimacyConfidence,
        credibilityScore: t.legitimacyConfidence,
        verdictLabel: t.verdictLabel,
        verdictColor: t.verdictColor,
        recommendedAction: t.recommendedAction,
        suggestedPriority: t.suggestedPriority,
        suspiciousFactors: t.suspiciousFactors || [],
        recommendations: t.recommendations || [],
        reasoning: t.reasoning,
        analysisMethod: t.analysisMethod,
        usedFallback: result.usedFallback,
        analyzedAt: new Date(),
        detectedLanguage: t.detectedLanguage || null,
        reportType: t.reportType || null,
        tokensUsed: t.tokensUsed || 0,
      });

      if (t.shouldFlag) {
        showSnackbar('AI flagged this report as high risk — review recommended', 'warning');
      } else if (t.recommendedAction === 'review') {
        showSnackbar('AI suggests manual review for this report', 'info');
      } else {
        showSnackbar('AI triage complete — report appears legitimate', 'success');
      }
    } catch (error) {
      console.error('AI triage error:', error);
      showSnackbar('AI triage failed: ' + (error?.message || 'Unknown error'), 'error');
      setAiAnalysisDialogOpen(false);
    }
  };

  const handleViewDetails = async (report) => {
    setSelectedReport(report);
    setDialogOpen(true);
    setReporterInfo(null);
    if (report.userId && !report.anonymous) {
      try {
        setReporterLoading(true);
        const userSnap = await getDoc(doc(db, 'users', report.userId));
        if (userSnap.exists()) {
          setReporterInfo(userSnap.data());
        }
      } catch (e) {
        console.warn('Could not fetch reporter:', e);
      } finally {
        setReporterLoading(false);
      }
    }
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

  const exportCSV = (rows) => {
    if (!rows || rows.length === 0) return showSnackbar('No data to export', 'info');
    const cols = ['id','title','status','priority','category','reporterName','createdAt'];
    const csvRows = rows.map(r => {
      const created = r.createdAt && r.createdAt.toDate ? r.createdAt.toDate().toISOString() : '';
      // Never expose identity for anonymous reports in exports
      const reporterName = r.anonymous ? 'Anonymous' : (r.reporterName || '');
      return [r.id, (r.title||''), (r.status||''), (r.priority||''), (r.category||''), reporterName, created]
        .map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [cols.join(',')].concat(csvRows).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSnackbar('CSV exported', 'success');
  };

  const handleBulkUpdateStatus = async (newStatus) => {
    if (!selectionModel || selectionModel.length === 0) return showSnackbar('No rows selected', 'info');
    try {
      for (const id of selectionModel) {
        await updateDoc(doc(db, 'reports', id), { status: newStatus, updatedAt: new Date(), updatedBy: 'admin' });
      }
      showSnackbar(`Updated ${selectionModel.length} reports to ${newStatus}`, 'success');
      setSelectionModel([]);
    } catch (error) {
      console.error('Bulk update failed', error);
      showSnackbar('Bulk update failed', 'error');
    }
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


  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports Management
      </Typography>

      {/* Sticky Filter/Search Bar */}
      <Paper elevation={2} sx={{
        p: 2,
        mb: 3,
        position: 'sticky',
        top: 80,
        zIndex: 10,
        borderRadius: 3,
        boxShadow: '0 2px 8px 0 rgba(60,64,67,.08)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center',
      }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
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
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Priority</InputLabel>
          <Select
            value={priorityFilter}
            label="Priority"
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <MenuItem value="all">All Priorities</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Start"
          type="date"
          size="small"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="End"
          type="date"
          size="small"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="outlined" size="small" startIcon={<SaveAlt />} onClick={() => exportCSV(reports)} sx={{ ml: 'auto' }}>
          Export CSV
        </Button>
        <Button variant="contained" color="primary" size="small" sx={{ ml: 1 }} disabled={selectionModel.length===0} onClick={() => handleBulkUpdateStatus('resolved')}>
          Mark Resolved ({selectionModel.length})
        </Button>
        <TextField
          size="small"
          placeholder="Search reports..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: search && (
              <IconButton size="small" onClick={() => setSearch('')}>
                <Delete fontSize="small" />
              </IconButton>
            )
          }}
        />
        <Divider orientation="vertical" flexItem sx={{ mx: 2, display: { xs: 'none', sm: 'block' } }} />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
          Total: {reports.length}
        </Typography>
      </Paper>

      {/* Reports Table */}
      <Box sx={{ height: 600, width: '100%', background: '#fff', borderRadius: 3, boxShadow: 1, mb: 3 }}>
        <DataGrid
          rows={reports.map(r => ({ ...r, id: r.id }))}
          columns={[
            { field: 'title', headerName: 'Title', flex: 1, minWidth: 160, renderCell: (params) => params.value || 'Untitled Report' },
            { field: 'status', headerName: 'Status', minWidth: 120, renderCell: (params) => <Chip label={params.value} color={getStatusColor(params.value)} size="small" /> },
            { field: 'priority', headerName: 'Priority', minWidth: 110, renderCell: (params) => <Chip label={params.value} color={getPriorityColor(params.value)} size="small" /> },
            { field: 'category', headerName: 'Category', minWidth: 120 },
            { field: 'reporterName', headerName: 'Reporter', minWidth: 120, renderCell: (params) => params.row.anonymous ? 'Anonymous' : (params.value || 'Unknown') },
            { field: 'createdAt', headerName: 'Date', minWidth: 140, valueGetter: (params) => params.value?.toDate ? params.value.toDate().toLocaleDateString() : '', },
            { field: 'actions', headerName: 'Actions', minWidth: 220, sortable: false, filterable: false, renderCell: (params) => (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="View Details"><IconButton size="small" onClick={() => handleViewDetails(params.row)}><Visibility fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="AI Check"><IconButton size="small" color="info" onClick={() => handleAIAnalysis(params.row)}><Assignment fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Print"><IconButton size="small" color="primary" onClick={() => { setReportToPrint(params.row); setPrintDialogOpen(true); }}><Print fontSize="small" /></IconButton></Tooltip>
                {!params.row.isFalsePositive && params.row.status !== 'resolved' && (
                  <Tooltip title="Flag as False"><IconButton size="small" color="error" onClick={() => handleFlagAsFalse(params.row)}><Flag fontSize="small" /></IconButton></Tooltip>
                )}
                {params.row.isFalsePositive && (
                  <Tooltip title="False Report"><ReportProblem color="error" fontSize="small" /></Tooltip>
                )}
              </Box>
            ) },
          ]}
          loading={loading}
          checkboxSelection
          selectionModel={selectionModel}
          onSelectionModelChange={(newSelection) => setSelectionModel(newSelection)}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          sx={{
            border: 0,
            fontSize: '0.95rem',
            '& .MuiDataGrid-columnHeaders': { background: '#f8f9fa', fontWeight: 700 },
            '& .MuiDataGrid-row:hover': { background: '#f1f3f4' },
            '& .MuiDataGrid-footerContainer': { background: '#f8f9fa' },
          }}
          getRowHeight={() => 48}
          autoHeight={false}
        />
      </Box>

      {/* Report Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        {selectedReport && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Assignment color="primary" />
                <Box>
                  <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                    {selectedReport.title || 'Untitled Report'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID: {selectedReport.id}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2.5 }}>
              {/* Status + Priority row */}
              <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="overline" color="text.secondary" display="block">Status</Typography>
                  <Chip label={selectedReport.status || 'pending'} color={getStatusColor(selectedReport.status)}
                    sx={{ fontWeight: 600, textTransform: 'capitalize' }} />
                </Box>
                <Box>
                  <Typography variant="overline" color="text.secondary" display="block">Priority</Typography>
                  <Chip label={selectedReport.priority || 'medium'} color={getPriorityColor(selectedReport.priority)}
                    sx={{ fontWeight: 600, textTransform: 'capitalize' }} />
                </Box>
                <Box>
                  <Typography variant="overline" color="text.secondary" display="block">Category</Typography>
                  <Chip label={selectedReport.category || 'general'} variant="outlined"
                    sx={{ fontWeight: 500, textTransform: 'capitalize' }} />
                </Box>
                {selectedReport.anonymous && (
                  <Box>
                    <Typography variant="overline" color="text.secondary" display="block">Reporter</Typography>
                    <Chip icon={<VisibilityOff fontSize="small" />} label="Anonymous" variant="outlined" color="warning" sx={{ fontWeight: 600 }} />
                  </Box>
                )}
              </Box>

              {/* Description */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Description</Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {selectedReport.description || 'No description provided.'}
                  </Typography>
                </Paper>
              </Box>

              {/* Reporter info */}
              {selectedReport.anonymous ? (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>Reporter</Typography>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50', borderColor: 'warning.light', borderStyle: 'dashed' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Lock sx={{ color: 'text.disabled', fontSize: 28 }} />
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="text.secondary">
                          Anonymous Submission — Reporter identity is protected
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          This report was submitted anonymously. No personal information can be viewed by administrators.
                          Identity records are not stored for anonymous submissions.
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Box>
              ) : (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>Reporter</Typography>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    {reporterLoading ? (
                      <Typography variant="body2" color="text.secondary">Loading reporter info…</Typography>
                    ) : reporterInfo ? (
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary" display="block">Full Name</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {reporterInfo.displayName || reporterInfo.fullName || reporterInfo.name || '—'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary" display="block">Email</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {reporterInfo.email || '—'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary" display="block">Role</Typography>
                          <Typography variant="body2">{reporterInfo.role || '—'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary" display="block">Department</Typography>
                          <Typography variant="body2">{reporterInfo.department || reporterInfo.course || '—'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary" display="block">Student / Staff ID</Typography>
                          <Typography variant="body2">{reporterInfo.studentId || reporterInfo.employeeId || reporterInfo.idNumber || '—'}</Typography>
                        </Grid>
                      </Grid>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {selectedReport.reporterName || selectedReport.userEmail || 'Reporter information not available'}
                      </Typography>
                    )}
                  </Paper>
                </Box>
              )}

              {/* Location */}
              {selectedReport.location && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>Location</Typography>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="body2">
                      {typeof selectedReport.location === 'string'
                        ? selectedReport.location
                        : [selectedReport.location.building, selectedReport.location.room,
                           selectedReport.location.floor, selectedReport.location.description]
                            .filter(Boolean).join(' — ') || '—'}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {/* Submitted date */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Submitted</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedReport.createdAt?.toDate?.()?.toLocaleString('en-PH', {
                    dateStyle: 'long', timeStyle: 'short'
                  }) || 'Unknown date'}
                </Typography>
              </Box>

              {/* Images / Evidence */}
              {(() => {
                const imgs = selectedReport.images || selectedReport.media || [];
                if (!imgs.length) return null;
                return (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Evidence / Attachments ({imgs.length})
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5 }}>
                      {imgs.map((url, i) => (
                        <Box key={i} component="a" href={url} target="_blank" rel="noopener noreferrer"
                          sx={{
                            display: 'block', borderRadius: 2, overflow: 'hidden',
                            border: '1.5px solid', borderColor: 'divider',
                            aspectRatio: '4/3',
                            transition: 'transform .15s, box-shadow .15s',
                            '&:hover': { transform: 'scale(1.03)', boxShadow: 4 },
                          }}>
                          <Box component="img" src={url} alt={`Evidence ${i + 1}`}
                            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={e => {
                              e.target.style.display = 'none';
                              e.target.parentElement.style.background = '#f1f5f9';
                              e.target.parentElement.innerHTML +=
                                '<div style="text-align:center;padding:12px;font-size:12px;color:#94a3b8">Image unavailable</div>';
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                );
              })()}
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
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

      {/* AI Triage Dialog */}
      <Dialog open={aiAnalysisDialogOpen} onClose={() => setAiAnalysisDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Assignment sx={{ color: 'info.main' }} />
            AI Triage Report
            {analysisResult && (
              <Chip
                label={analysisResult.verdictLabel || (analysisResult.isSuspicious ? 'High Risk' : 'Cleared')}
                color={analysisResult.verdictColor || (analysisResult.isSuspicious ? 'error' : 'success')}
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {reportToAnalyze && (
            <>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {reportToAnalyze.title || 'Untitled Report'} &middot; {reportToAnalyze.category || 'General'}
              </Typography>

              {!analysisResult && (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Running AI analysis...</Typography>
                </Box>
              )}

              {analysisResult && (
                <>
                  <Grid container spacing={2} sx={{ mt: 1, mb: 3 }}>
                    <Grid item xs={6} sm={3}>
                      <Card sx={{ p: 2, textAlign: 'center', bgcolor:
                        analysisResult.riskLevel === 'HIGH' ? '#fce8e6' :
                        analysisResult.riskLevel === 'MEDIUM' ? '#fef9e7' : '#e6f4ea' }}>
                        <Typography variant="h4" fontWeight={700} color={
                          analysisResult.riskLevel === 'HIGH' ? 'error.main' :
                          analysisResult.riskLevel === 'MEDIUM' ? 'warning.main' : 'success.main'}>
                          {analysisResult.legitimacyConfidence}%
                        </Typography>
                        <Typography variant="caption">Legitimacy</Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={700}>{analysisResult.riskLevel}</Typography>
                        <Typography variant="caption">Risk Level</Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={700}
                          color={analysisResult.recommendedAction === 'flag' ? 'error.main' :
                                 analysisResult.recommendedAction === 'review' ? 'warning.main' : 'success.main'}>
                          {(analysisResult.recommendedAction || 'review').toUpperCase()}
                        </Typography>
                        <Typography variant="caption">Recommended</Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Card sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" fontWeight={600}>
                          {analysisResult.analysisMethod?.includes('gpt') ? 'GPT-4o' :
                           analysisResult.analysisMethod === 'gpt-4o-mini + perspective' ? 'GPT + Perspective' :
                           analysisResult.analysisMethod === 'perspective_api' ? 'Perspective API' :
                           analysisResult.analysisMethod === 'keyword_precheck' ? 'Keyword Check' : 'Heuristic'}
                        </Typography>
                        <Typography variant="caption">AI Method</Typography>
                      </Card>
                    </Grid>
                  </Grid>

                  <Alert
                    severity={analysisResult.riskLevel === 'HIGH' ? 'error' : analysisResult.riskLevel === 'MEDIUM' ? 'warning' : 'success'}
                    sx={{ mb: 2 }}
                  >
                    <strong>AI Reasoning:</strong> {analysisResult.reasoning || 'Analysis complete'}
                    {analysisResult.usedFallback && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.7 }}>
                        (Heuristic fallback — AI API unavailable)
                      </Typography>
                    )}
                  </Alert>

                  {(analysisResult.detectedLanguage || analysisResult.reportType) && (
                    <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {analysisResult.detectedLanguage && (
                        <Chip icon={<span>🌐</span>} label={`Language: ${analysisResult.detectedLanguage}`} size="small" variant="outlined" color="info" />
                      )}
                      {analysisResult.reportType && (
                        <Chip icon={<span>🏷️</span>} label={`Type: ${analysisResult.reportType}`} size="small" variant="outlined" color="default" />
                      )}
                      {analysisResult.tokensUsed > 0 && (
                        <Chip label={`${analysisResult.tokensUsed} tokens`} size="small" variant="outlined" sx={{ opacity: 0.6 }} />
                      )}
                    </Box>
                  )}

                  {analysisResult.suspiciousFactors.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Suspicious Factors:</Typography>
                      {analysisResult.suspiciousFactors.map((f, i) => (
                        <Chip key={i} label={f} color="error" size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </Box>
                  )}

                  {analysisResult.recommendations.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Recommendations:</Typography>
                      {analysisResult.recommendations.map((r, i) => (
                        <Typography key={i} variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          &bull; {r}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      <strong>Content:</strong> {reportToAnalyze.description || 'No description'}
                    </Typography>
                  </Box>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiAnalysisDialogOpen(false)}>Close</Button>
          {analysisResult && analysisResult.suggestedPriority && analysisResult.suggestedPriority !== reportToAnalyze?.priority && (
            <Button
              variant="outlined"
              color="warning"
              onClick={async () => {
                await updateDoc(doc(db, 'reports', reportToAnalyze.id), { priority: analysisResult.suggestedPriority, updatedAt: new Date() });
                showSnackbar(`Priority updated to ${analysisResult.suggestedPriority}`, 'success');
                setAiAnalysisDialogOpen(false);
              }}
            >
              Apply Priority: {analysisResult.suggestedPriority}
            </Button>
          )}
          {analysisResult && analysisResult.isSuspicious && (
            <Button variant="contained" color="error"
              onClick={() => { setAiAnalysisDialogOpen(false); handleFlagAsFalse(reportToAnalyze); }}
              startIcon={<Flag />}>
              Flag as False
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar?.open || false}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar?.severity || 'info'}
          sx={{ width: '100%' }}
        >
          {snackbar?.message || ''}
        </Alert>
      </Snackbar>

      {/* Print Report Dialog */}
      <PrintReport 
        report={reportToPrint}
        open={printDialogOpen}
        onClose={() => {
          setPrintDialogOpen(false);
          setReportToPrint(null);
        }}
      />
    </Box>
  );
}
