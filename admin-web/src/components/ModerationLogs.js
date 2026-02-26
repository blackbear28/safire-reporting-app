// admin-web/src/components/ModerationLogs.js â€” AI Triage Center
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Alert, Grid, TextField, Select, MenuItem,
  FormControl, InputLabel, LinearProgress, Tooltip, Snackbar, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  Shield as ShieldIcon,
  CheckCircle as ClearedIcon,
  Warning as ReviewIcon,
  Error as FlagIcon,
  HourglassEmpty as PendingIcon,
  PlayArrow as RunIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Flag as FlagActionIcon,
} from '@mui/icons-material';
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import ModerationService from '../services/moderationService';

const VERDICT_CONFIG = {
  high:    { label: 'High Risk',     color: 'error',   icon: <FlagIcon fontSize="small" />,    bg: '#fce8e6' },
  medium:  { label: 'Needs Review',  color: 'warning', icon: <ReviewIcon fontSize="small" />,  bg: '#fef9e7' },
  low:     { label: 'Cleared',       color: 'success', icon: <ClearedIcon fontSize="small" />, bg: '#e6f4ea' },
  pending: { label: 'Not Analyzed',  color: 'default', icon: <PendingIcon fontSize="small" />, bg: '#f8f9fa' },
};

export default function ModerationLogs() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triaging, setTriaging] = useState({}); // reportId -> true when running
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [verdictFilter, setVerdictFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [detailReport, setDetailReport] = useState(null);
  const [aiStatus] = useState(ModerationService.getStatus());

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const showSnackbar = (message, severity = 'info') => setSnackbar({ open: true, message, severity });

  // Run AI triage on a single report and persist results to Firestore
  const runTriage = useCallback(async (report) => {
    setTriaging(prev => ({ ...prev, [report.id]: true }));
    try {
      let userReportCount = 0;
      let userFalseReportsCount = 0;
      if (report.userId) {
        try {
          const snap = await getDocs(query(collection(db, 'reports'), where('userId', '==', report.userId)));
          userReportCount = snap.size;
          userFalseReportsCount = snap.docs.filter(d => d.data().isFalsePositive).length;
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

      if (!result.success) throw new Error(result.error);

      const triage = result.triage;
      await updateDoc(doc(db, 'reports', report.id), {
        aiTriage: triage,
        aiTriagedAt: new Date(),
        aiRiskLevel: triage.riskLevel,
        aiVerdict: triage.verdictLabel,
        aiRecommendedAction: triage.recommendedAction,
        // Auto-flag high risk to pending-review
        ...(triage.shouldFlag && report.status === 'pending'
          ? { status: 'in_progress', aiAutoFlagged: true }
          : {}),
      });

      showSnackbar(`Triage complete: ${triage.verdictLabel} (${triage.riskLevel} risk)`,
        triage.riskLevel === 'high' ? 'warning' : 'success');
    } catch (err) {
      showSnackbar('Triage failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setTriaging(prev => { const n = { ...prev }; delete n[report.id]; return n; });
    }
  }, []);

  // Bulk triage all un-analyzed reports
  const runBulkTriage = async () => {
    const untriaged = reports.filter(r => !r.aiTriage && r.status !== 'resolved' && r.status !== 'rejected');
    if (!untriaged.length) { showSnackbar('All active reports are already analyzed', 'info'); return; }
    setBulkRunning(true);
    setBulkProgress(0);
    for (let i = 0; i < untriaged.length; i++) {
      await runTriage(untriaged[i]);
      setBulkProgress(Math.round(((i + 1) / untriaged.length) * 100));
    }
    setBulkRunning(false);
    setBulkProgress(0);
    showSnackbar(`Bulk triage complete â€” ${untriaged.length} reports analyzed`, 'success');
  };

  // Compute verdict level for a report
  const getVerdictKey = (report) => {
    if (!report.aiTriage) return 'pending';
    const r = (report.aiRiskLevel || report.aiTriage?.riskLevel || 'low').toLowerCase();
    return r === 'high' ? 'high' : r === 'medium' ? 'medium' : 'low';
  };

  // Filter reports
  const filtered = reports.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (verdictFilter !== 'all' && getVerdictKey(r) !== verdictFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(r.title || '').toLowerCase().includes(s) && !(r.description || '').toLowerCase().includes(s)) return false;
    }
    return true;
  });

  // Stats
  const stats = {
    total: reports.length,
    highRisk: reports.filter(r => getVerdictKey(r) === 'high').length,
    needsReview: reports.filter(r => getVerdictKey(r) === 'medium').length,
    cleared: reports.filter(r => getVerdictKey(r) === 'low').length,
    pending: reports.filter(r => getVerdictKey(r) === 'pending' && r.status !== 'resolved' && r.status !== 'rejected').length,
  };

  const untriagedActive = reports.filter(r => !r.aiTriage && r.status !== 'resolved' && r.status !== 'rejected').length;

  return (
    <Box maxWidth={1400} mx="auto" p={3}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ShieldIcon sx={{ fontSize: 36, color: '#1a73e8' }} />
          <Box>
            <Typography variant="h4" fontWeight={700} color="#202124">AI Triage Center</Typography>
            <Typography variant="body2" color="#5f6368">
              Automated risk assessment &amp; report prioritization
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            label={aiStatus.message}
            color={aiStatus.configured ? 'success' : 'default'}
            size="small"
            icon={<ShieldIcon />}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={runBulkTriage}
            disabled={bulkRunning || untriagedActive === 0}
          >
            {bulkRunning ? `Analyzing... ${bulkProgress}%` : `Triage All Untriaged (${untriagedActive})`}
          </Button>
        </Box>
      </Box>

      {bulkRunning && <LinearProgress variant="determinate" value={bulkProgress} sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Stats Strip */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Reports', value: stats.total, color: '#1a73e8', bg: '#e8f0fe' },
          { label: 'High Risk', value: stats.highRisk, color: '#ea4335', bg: '#fce8e6' },
          { label: 'Needs Review', value: stats.needsReview, color: '#f9ab00', bg: '#fef9e7' },
          { label: 'Cleared', value: stats.cleared, color: '#34a853', bg: '#e6f4ea' },
          { label: 'Not Analyzed', value: stats.pending, color: '#5f6368', bg: '#f1f3f4' },
        ].map(s => (
          <Grid item xs={6} sm={4} md key={s.label}>
            <Card elevation={0} sx={{ border: `1px solid ${s.color}30`, borderRadius: 2, bgcolor: s.bg, cursor: 'pointer' }}
              onClick={() => setVerdictFilter(
                s.label === 'High Risk' ? 'high' :
                s.label === 'Needs Review' ? 'medium' :
                s.label === 'Cleared' ? 'low' :
                s.label === 'Not Analyzed' ? 'pending' : 'all'
              )}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h4" fontWeight={700} color={s.color}>{s.value}</Typography>
                <Typography variant="caption" color={s.color} fontWeight={600}>{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #e8eaed', borderRadius: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search reports..." value={search}
          onChange={e => setSearch(e.target.value)} sx={{ minWidth: 220 }} />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="resolved">Resolved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>AI Verdict</InputLabel>
          <Select value={verdictFilter} label="AI Verdict" onChange={e => setVerdictFilter(e.target.value)}>
            <MenuItem value="all">All Verdicts</MenuItem>
            <MenuItem value="high">High Risk</MenuItem>
            <MenuItem value="medium">Needs Review</MenuItem>
            <MenuItem value="low">Cleared</MenuItem>
            <MenuItem value="pending">Not Analyzed</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', alignSelf: 'center' }}>
          Showing {filtered.length} of {reports.length}
        </Typography>
      </Paper>

      {/* Reports Table */}
      {loading ? (
        <LinearProgress />
      ) : filtered.length === 0 ? (
        <Alert severity="info">No reports match current filters.</Alert>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e8eaed', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                <TableCell><strong>Title</strong></TableCell>
                <TableCell><strong>Category</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>AI Verdict</strong></TableCell>
                <TableCell><strong>Legitimacy</strong></TableCell>
                <TableCell><strong>Recommendations</strong></TableCell>
                <TableCell><strong>Submitted</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((report) => {
                const vKey = getVerdictKey(report);
                const vc = VERDICT_CONFIG[vKey];
                const triage = report.aiTriage;
                const isRunning = !!triaging[report.id];
                return (
                  <TableRow key={report.id} sx={{ bgcolor: vc.bg, '&:hover': { filter: 'brightness(0.97)' } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 180 }}>
                        {report.title || 'Untitled'}
                      </Typography>
                      {report.aiAutoFlagged && (
                        <Chip label="Auto-flagged" size="small" color="error" sx={{ mt: 0.25, height: 16, fontSize: '0.6rem' }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{report.category || 'â€”'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={report.status || 'pending'} size="small"
                        color={report.status === 'resolved' ? 'success' : report.status === 'in_progress' ? 'info' : report.status === 'rejected' ? 'error' : 'default'} />
                    </TableCell>
                    <TableCell>
                      <Chip icon={vc.icon} label={vc.label} color={vc.color} size="small" />
                    </TableCell>
                    <TableCell>
                      {triage ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LinearProgress
                            variant="determinate"
                            value={triage.legitimacyConfidence || 0}
                            color={vKey === 'high' ? 'error' : vKey === 'medium' ? 'warning' : 'success'}
                            sx={{ width: 60, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption">{triage.legitimacyConfidence}%</Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">â€”</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      {triage?.recommendations?.length > 0 ? (
                        <Typography variant="caption" noWrap>{triage.recommendations[0]}</Typography>
                      ) : triage?.reasoning ? (
                        <Typography variant="caption" noWrap>{triage.reasoning}</Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">Run triage to see</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleDateString() : 'â€”'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title={triage ? 'Re-run Triage' : 'Run AI Triage'}>
                          <span>
                            <IconButton size="small" color="primary" onClick={() => runTriage(report)} disabled={isRunning || bulkRunning}>
                              {isRunning ? <LinearProgress sx={{ width: 16 }} /> : <RunIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => setDetailReport(report)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {triage?.shouldFlag && report.status !== 'resolved' && (
                          <Tooltip title="Flag as False Positive">
                            <IconButton size="small" color="error"
                              onClick={async () => {
                                await updateDoc(doc(db, 'reports', report.id), {
                                  isFalsePositive: true, status: 'flagged_false',
                                  flaggedAt: new Date(), flaggedBy: 'ai_triage',
                                });
                                showSnackbar('Report flagged as false positive', 'success');
                              }}>
                              <FlagActionIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailReport} onClose={() => setDetailReport(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldIcon color="primary" />
          AI Triage Detail
        </DialogTitle>
        <DialogContent>
          {detailReport && (
            <>
              <Typography variant="h6" gutterBottom>{detailReport.title || 'Untitled'}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{detailReport.description || 'No description'}</Typography>
              {detailReport.aiTriage ? (
                <>
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Card elevation={0} sx={{ p: 1.5, border: '1px solid #e8eaed', textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={700}>{detailReport.aiTriage.legitimacyConfidence}%</Typography>
                        <Typography variant="caption">Legitimacy Score</Typography>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card elevation={0} sx={{ p: 1.5, border: '1px solid #e8eaed', textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={700}>{(detailReport.aiTriage.riskLevel || '').toUpperCase()}</Typography>
                        <Typography variant="caption">Risk Level</Typography>
                      </Card>
                    </Grid>
                  </Grid>
                  <Alert severity={detailReport.aiTriage.riskLevel === 'high' ? 'error' : detailReport.aiTriage.riskLevel === 'medium' ? 'warning' : 'success'} sx={{ mb: 2 }}>
                    {detailReport.aiTriage.reasoning}
                  </Alert>
                  {detailReport.aiTriage.suspiciousFactors?.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>Suspicious Factors:</Typography>
                      {detailReport.aiTriage.suspiciousFactors.map((f, i) => (
                        <Chip key={i} label={f} size="small" color="error" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </Box>
                  )}
                  {detailReport.aiTriage.recommendations?.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>Recommendations:</Typography>
                      {detailReport.aiTriage.recommendations.map((r, i) => (
                        <Typography key={i} variant="body2">&bull; {r}</Typography>
                      ))}
                    </Box>
                  )}
                </>
              ) : (
                <Alert severity="info">
                  This report has not been triaged yet. Click the triage button in the table to analyze it.
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailReport(null)}>Close</Button>
          {detailReport && !detailReport.aiTriage && (
            <Button variant="contained" startIcon={<RunIcon />}
              onClick={() => { runTriage(detailReport); setDetailReport(null); }}>
              Run Triage Now
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

