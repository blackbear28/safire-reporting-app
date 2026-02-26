import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy as fsOrderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination,
  TableSortLabel, Chip, IconButton, Tooltip, TextField, InputAdornment,
  MenuItem, Select, FormControl, InputLabel, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, DialogContentText, Snackbar, Alert,
  CircularProgress, Divider, Stack, LinearProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterListIcon from '@mui/icons-material/FilterList';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fmtDate = (ts) => {
  if (!ts) return 'â€”';
  try { return new Date(ts).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return ts; }
};

const fmtDuration = (mins) => {
  if (mins === null || mins === undefined || mins === '') return '—';
  const m = Math.round(Number(mins) * 100) / 100; // keep up to 2 decimal places
  if (isNaN(m)) return '—';
  if (m < 60) return `${+m.toFixed(2)}m`;
  return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
};

// Safely converts any value (including Firestore objects) to a display string
const safeStr = (val) => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'string') return val || '—';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    if (val.toDate) return fmtDate(val.toDate());
    return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join(', ');
  }
  return String(val);
};

// Flexible success detection — handles booleans, strings, numbers, and inferred states
const isTaskSuccess = (task) => {
  const s = task.success;
  // Explicit boolean
  if (s === true)  return true;
  if (s === false) return false;
  // String variants
  if (typeof s === 'string') {
    const lower = s.trim().toLowerCase();
    if (['true', 'yes', '1', 'success', 'completed', 'done', 'passed'].includes(lower)) return true;
    if (['false', 'no', '0', 'failed', 'fail', 'error', 'incomplete'].includes(lower)) return false;
  }
  // Numeric: 1 = success, 0 = failure
  if (s === 1) return true;
  if (s === 0) return false;
  // Infer from absence of problem/issues text
  if (s === null || s === undefined) {
    const issues = task.problemIssues;
    if (!issues) return true;
    if (typeof issues === 'string' && issues.trim() === '') return true;
    if (typeof issues === 'object' && Object.keys(issues).length === 0) return true;
    return false; // has issues → treat as failed
  }
  return false;
};

const ROLE_CONFIG = {
  student:  { label: 'Student',  color: 'primary' },
  faculty:  { label: 'Faculty',  color: 'warning' },
  admin:    { label: 'Admin',    color: 'error'   },
};

const getRoleChip = (role) => {
  const cfg = ROLE_CONFIG[(role || '').toLowerCase()] || { label: role || 'Unknown', color: 'default' };
  return <Chip label={cfg.label} color={cfg.color} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />;
};

// â”€â”€â”€ TXT export helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const buildTxtContent = (log) => {
  let txt = `TEST USER CODE NAME: ${log.testUserCode}\n`;
  txt += `User Email: ${log.userEmail}\n`;
  txt += `User Role: ${log.userRole}\n`;
  txt += `Session Start: ${fmtDate(log.sessionStartTime)}\n`;
  txt += `Session End: ${fmtDate(log.sessionEndTime)}\n`;
  txt += `Total Duration: ${log.totalDurationMinutes} minutes\n`;
  txt += log.autoCompleted
    ? `Session Type: Auto-completed\nCompletion Reason: ${log.completionReason}\n`
    : `Session Type: Manual logout\n`;
  txt += `\n${'='.repeat(44)}\nTask Completion Data Collection Instrument\n${'='.repeat(44)}\n\n`;
  (log.logs || []).forEach((task, i) => {
    txt += `${i + 1}. ${safeStr(task.task)}\n`;
    txt += `   Start time: ${safeStr(task.startTime)}\n`;
    txt += `   End time: ${safeStr(task.endTime)}\n`;
    txt += `   Time (minutes): ${task.durationMinutes}\n`;
    txt += `   Success: ${isTaskSuccess(task) ? 'Yes' : 'No'}\n`;
    txt += `   Problem/Issues: ${safeStr(task.problemIssues)}\n\n`;
  });
  txt += `${'='.repeat(44)}\n`;
  txt += `Total Time Logged: ${log.totalDurationMinutes} minutes\n`;
  txt += `Number of Features Used: ${(log.logs || []).length}\n`;
  txt += `${'='.repeat(44)}\n`;
  return txt;
};

const downloadTxt = (log) => {
  const blob = new Blob([buildTxtContent(log)], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `usage_log_${log.testUserCode}_${new Date(log.sessionStartTime).toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// â”€â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const StatCard = ({ icon, label, value, sub, color = 'primary.main' }) => (
  <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
    <CardContent sx={{ p: 2.5 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={700} color={color} sx={{ mt: 0.5, lineHeight: 1 }}>
            {value}
          </Typography>
          {sub && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{sub}</Typography>}
        </Box>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}18`, color, display: 'flex', alignItems: 'center' }}>
          {icon}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

// â”€â”€â”€ Sorting helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const descendingComparator = (a, b, key) => {
  const va = a[key] ?? ''; const vb = b[key] ?? '';
  if (vb < va) return -1;
  if (vb > va) return 1;
  return 0;
};
const getComparator = (order, key) =>
  order === 'desc' ? (a, b) => descendingComparator(a, b, key) : (a, b) => -descendingComparator(a, b, key);

const COLUMNS = [
  { id: 'testUserCode',        label: 'Test Code',     sortable: true  },
  { id: 'userEmail',           label: 'Email',         sortable: true  },
  { id: 'userRole',            label: 'Role',          sortable: true  },
  { id: 'sessionStartTime',    label: 'Session Start', sortable: true  },
  { id: 'totalDurationMinutes',label: 'Duration',      sortable: true  },
  { id: 'taskCount',           label: 'Tasks',         sortable: true  },
  { id: 'status',              label: 'Status',        sortable: false },
  { id: 'actions',             label: 'Actions',       sortable: false },
];

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const UsageLogs = () => {
  const [logs, setLogs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Table state
  const [order, setOrder]           = useState('desc');
  const [orderBy, setOrderBy]       = useState('sessionStartTime');
  const [page, setPage]             = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filters
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Dialogs
  const [detailLog, setDetailLog]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Snackbar
  const [snack, setSnack]           = useState({ open: false, message: '', severity: 'success' });
  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true); setFetchError(null);
      const snap = await getDocs(query(collection(db, 'usageLogs'), fsOrderBy('timestamp', 'desc')));
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setFetchError(e.message || 'Failed to load usage logs');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      await deleteDoc(doc(db, 'usageLogs', deleteTarget.id));
      setLogs(prev => prev.filter(l => l.id !== deleteTarget.id));
      showSnack(`Log for "${deleteTarget.testUserCode}" deleted`);
    } catch (e) {
      showSnack('Failed to delete: ' + e.message, 'error');
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const copyLog = async (log) => {
    try {
      await navigator.clipboard.writeText(buildTxtContent(log));
      showSnack('Log copied to clipboard');
    } catch { showSnack('Failed to copy', 'error'); }
  };

  // Stats
  const stats = useMemo(() => {
    const total = logs.length;
    const totalMins = logs.reduce((s, l) => s + (l.totalDurationMinutes || 0), 0);
    const auto = logs.filter(l => l.autoCompleted).length;
    const avgMins = total ? Math.round(totalMins / total) : 0;
    return { total, totalMins, auto, avgMins, manual: total - auto };
  }, [logs]);

  // Filtered + sorted rows
  const visibleRows = useMemo(() => {
    const q = search.toLowerCase();
    let filtered = logs.filter(l => {
      const matchSearch = !q ||
        (l.testUserCode || '').toLowerCase().includes(q) ||
        (l.userEmail   || '').toLowerCase().includes(q);
      const matchRole = roleFilter === 'all' || (l.userRole || '').toLowerCase() === roleFilter;
      return matchSearch && matchRole;
    }).map(l => ({ ...l, taskCount: (l.logs || []).length }));

    filtered.sort(getComparator(order, orderBy));
    return filtered;
  }, [logs, search, roleFilter, order, orderBy]);

  const paginatedRows = visibleRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleSort = (col) => {
    setOrder(orderBy === col && order === 'asc' ? 'desc' : 'asc');
    setOrderBy(col);
    setPage(0);
  };

  // â”€â”€ Render â”€â”€
  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>Usage Logs</Typography>
          <Typography variant="body2" color="text.secondary">
            Task completion data collection â€” session-level activity tracking
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={fetchLogs}
          disabled={loading}
          size="small"
        >
          Refresh
        </Button>
      </Stack>

      {/* Stat cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <StatCard icon={<PeopleIcon />}       label="Total Sessions"  value={stats.total}              color="primary.main" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard icon={<AccessTimeIcon />}   label="Total Duration"  value={fmtDuration(stats.totalMins)} sub={`Avg ${fmtDuration(stats.avgMins)} / session`} color="info.main" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard icon={<AssignmentIcon />}   label="Manual Logout"   value={stats.manual}             color="success.main" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard icon={<AutoAwesomeIcon />}  label="Auto-completed"  value={stats.auto}               color="warning.main" />
        </Grid>
      </Grid>

      {/* Error state */}
      {fetchError && (
        <Alert severity="error" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={fetchLogs}>Retry</Button>
        }>
          <strong>Failed to load logs:</strong> {fetchError}
        </Alert>
      )}

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <FilterListIcon color="action" fontSize="small" />
          <TextField
            size="small"
            placeholder="Search by test code or emailâ€¦"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ flex: 1, minWidth: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Role</InputLabel>
            <Select value={roleFilter} label="Role" onChange={e => { setRoleFilter(e.target.value); setPage(0); }}>
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="student">Student</MenuItem>
              <MenuItem value="faculty">Faculty</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          {(search || roleFilter !== 'all') && (
            <Button size="small" onClick={() => { setSearch(''); setRoleFilter('all'); }}>
              Clear filters
            </Button>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', whiteSpace: 'nowrap' }}>
            {visibleRows.length} of {logs.length} sessions
          </Typography>
        </Stack>
      </Paper>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: 'grey.50', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.6 } }}>
                {COLUMNS.map(col => (
                  <TableCell key={col.id} align={col.id === 'actions' ? 'center' : 'left'}>
                    {col.sortable ? (
                      <TableSortLabel
                        active={orderBy === col.id}
                        direction={orderBy === col.id ? order : 'asc'}
                        onClick={() => handleSort(col.id)}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && paginatedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {logs.length === 0 ? 'No usage logs collected yet.' : 'No sessions match the current filters.'}
                  </TableCell>
                </TableRow>
              )}
              {paginatedRows.map(log => (
                <TableRow
                  key={log.id}
                  hover
                  sx={{ '&:last-child td': { border: 0 }, opacity: deletingId === log.id ? 0.4 : 1, transition: 'opacity .2s' }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {log.testUserCode || 'â€”'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.userEmail || 'â€”'}
                    </Typography>
                  </TableCell>
                  <TableCell>{getRoleChip(log.userRole)}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{fmtDate(log.sessionStartTime)}</Typography>
                    <Typography variant="caption" color="text.secondary">â†’ {fmtDate(log.sessionEndTime)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{fmtDuration(log.totalDurationMinutes)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={log.taskCount} size="small" variant="filled" color="default" sx={{ fontWeight: 700, minWidth: 32 }} />
                  </TableCell>
                  <TableCell>
                    {log.autoCompleted
                      ? <Chip icon={<AutoAwesomeIcon sx={{ fontSize: '0.85rem !important' }} />} label="Auto" color="warning" size="small" />
                      : <Chip icon={<CheckCircleIcon sx={{ fontSize: '0.85rem !important' }} />} label="Manual" color="success" size="small" variant="outlined" />
                    }
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="View full log">
                        <IconButton size="small" onClick={() => setDetailLog(log)} color="primary">
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download .txt">
                        <IconButton size="small" onClick={() => downloadTxt(log)} color="success">
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Copy to clipboard">
                        <IconButton size="small" onClick={() => copyLog(log)} color="info">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete log">
                        <IconButton size="small" onClick={() => setDeleteTarget(log)} color="error" disabled={deletingId === log.id}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
        <TablePagination
          component="div"
          count={visibleRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Rows:"
          sx={{ '& .MuiTablePagination-toolbar': { minHeight: 48 } }}
        />
      </Paper>

      {/* â”€â”€ Detail Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={!!detailLog} onClose={() => setDetailLog(null)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}>
        {detailLog && (<>
          <DialogTitle sx={{ pb: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h6" fontWeight={700}>{detailLog.testUserCode}</Typography>
                <Typography variant="caption" color="text.secondary">{detailLog.userEmail}</Typography>
              </Box>
              {getRoleChip(detailLog.userRole)}
            </Stack>
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            {/* Session summary */}
            <Grid container spacing={2} mb={3}>
              {[
                { label: 'Session Start',  value: fmtDate(detailLog.sessionStartTime)  },
                { label: 'Session End',    value: fmtDate(detailLog.sessionEndTime)    },
                { label: 'Total Duration', value: fmtDuration(detailLog.totalDurationMinutes) },
                { label: 'Tasks Completed',value: (detailLog.logs || []).length        },
              ].map(({ label, value }) => (
                <Grid item xs={6} sm={3} key={label}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                    <Typography variant="body1" fontWeight={700}>{value}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {detailLog.autoCompleted && (
              <Alert severity="info" icon={<AutoAwesomeIcon />} sx={{ mb: 2 }}>
                Auto-completed â€” {detailLog.completionReason || 'session ended automatically'}
              </Alert>
            )}

            {/* Task table */}
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Task Breakdown</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: 'grey.50', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' } }}>
                    <TableCell>#</TableCell>
                    <TableCell>Task</TableCell>
                    <TableCell>Start</TableCell>
                    <TableCell>End</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Issues</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(detailLog.logs || []).map((task, i) => (
                    <TableRow key={i} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell><Typography variant="caption" color="text.secondary">{i + 1}</Typography></TableCell>
                      <TableCell><Typography variant="body2" fontWeight={500}>{safeStr(task.task)}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{safeStr(task.startTime)}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{safeStr(task.endTime)}</Typography></TableCell>
                      <TableCell>
                        <Chip label={task.durationMinutes != null ? `${safeStr(task.durationMinutes)}m` : "—"} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {isTaskSuccess(task)
                          ? <Chip icon={<CheckCircleIcon sx={{ fontSize: '0.85rem !important' }}/>} label="Success" color="success" size="small" />
                          : <Chip icon={<CancelIcon sx={{ fontSize: '0.85rem !important' }}/>} label="Failed" color="error" size="small" />
                        }
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {safeStr(task.problemIssues)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Button startIcon={<ContentCopyIcon />} onClick={() => copyLog(detailLog)} size="small">Copy</Button>
            <Button startIcon={<DownloadIcon />} variant="outlined" onClick={() => downloadTxt(detailLog)} size="small">Download .txt</Button>
            <Button onClick={() => setDetailLog(null)} variant="contained" size="small">Close</Button>
          </DialogActions>
        </>)}
      </Dialog>

      {/* â”€â”€ Delete Confirm Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle>Delete Usage Log?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete the session log for{' '}
            <strong>{deleteTarget?.testUserCode}</strong> ({deleteTarget?.userEmail}).
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} size="small">Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" size="small"
            startIcon={deletingId ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineIcon />}
            disabled={!!deletingId}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* â”€â”€ Snackbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnack(s => ({ ...s, open: false }))} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UsageLogs;
