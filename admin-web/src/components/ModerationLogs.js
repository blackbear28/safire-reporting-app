// admin-web/src/components/ModerationLogs.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Alert,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Block as BlockIcon,
  CheckCircle as ApproveIcon,
  
  Image as ImageIcon,
  Link as LinkIcon,
  TextFields as TextIcon
} from '@mui/icons-material';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';

export default function ModerationLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const [filterAction, setFilterAction] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Subscribe to moderation logs in real-time
    const logsQuery = query(
      collection(db, 'moderationLogs'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      setLogs(logsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (filterType !== 'all' && log.violationType !== filterType) return false;
    if (searchQuery && !log.contentPreview?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Statistics
  const stats = {
    total: logs.length,
    rejected: logs.filter(l => l.action === 'rejected').length,
    approved: logs.filter(l => l.action === 'approved').length,
    todayRejected: logs.filter(l => 
      l.action === 'rejected' && 
      format(l.timestamp, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    ).length
  };

  const getViolationColor = (type) => {
    const colors = {
      'explicit_keyword': 'error',
      'spam': 'warning',
      'violence': 'error',
      'sexual': 'error',
      'harassment': 'error',
      'hate': 'error',
      'malicious_link': 'warning',
      'inappropriate_image': 'error',
      'irrelevant': 'default'
    };
    return colors[type] || 'default';
  };

  const getViolationIcon = (type) => {
    if (type?.includes('image')) return <ImageIcon />;
    if (type?.includes('link')) return <LinkIcon />;
    return <TextIcon />;
  };

  return (
    <Box maxWidth={1400} mx="auto" p={4}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <BlockIcon sx={{ fontSize: 40, color: '#ea4335' }} />
        <Box>
          <Typography variant="h4" fontWeight={600} color="#202124">
            AI Moderation Logs
          </Typography>
          <Typography variant="body2" color="#5f6368">
            Real-time content moderation activity
          </Typography>
        </Box>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #e8eaed', borderRadius: 3 }}>
            <CardContent>
              <Typography variant="body2" color="#5f6368" mb={1}>
                Total Analyzed
              </Typography>
              <Typography variant="h4" fontWeight={600}>
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #ea4335', borderRadius: 3, bgcolor: '#fce8e6' }}>
            <CardContent>
              <Typography variant="body2" color="#ea4335" mb={1}>
                Blocked Total
              </Typography>
              <Typography variant="h4" fontWeight={600} color="#ea4335">
                {stats.rejected}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #34a853', borderRadius: 3, bgcolor: '#e6f4ea' }}>
            <CardContent>
              <Typography variant="body2" color="#34a853" mb={1}>
                Approved Total
              </Typography>
              <Typography variant="h4" fontWeight={600} color="#34a853">
                {stats.approved}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{ border: '1px solid #fbbc04', borderRadius: 3, bgcolor: '#fef7e0' }}>
            <CardContent>
              <Typography variant="body2" color="#ea8600" mb={1}>
                Blocked Today
              </Typography>
              <Typography variant="h4" fontWeight={600} color="#ea8600">
                {stats.todayRejected}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card elevation={0} sx={{ border: '1px solid #e8eaed', borderRadius: 3, mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Action</InputLabel>
                <Select
                  value={filterAction}
                  label="Action"
                  onChange={(e) => setFilterAction(e.target.value)}
                >
                  <MenuItem value="all">All Actions</MenuItem>
                  <MenuItem value="rejected">Blocked Only</MenuItem>
                  <MenuItem value="approved">Approved Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Violation Type</InputLabel>
                <Select
                  value={filterType}
                  label="Violation Type"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="explicit_keyword">Explicit Keywords</MenuItem>
                  <MenuItem value="spam">Spam</MenuItem>
                  <MenuItem value="violence">Violence</MenuItem>
                  <MenuItem value="sexual">Sexual Content</MenuItem>
                  <MenuItem value="malicious_link">Malicious Links</MenuItem>
                  <MenuItem value="inappropriate_image">Inappropriate Images</MenuItem>
                  <MenuItem value="irrelevant">Non-School Content</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Logs Table */}
      {loading ? (
        <Box><LinearProgress /></Box>
      ) : filteredLogs.length === 0 ? (
        <Alert severity="info">No moderation logs found</Alert>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e8eaed', borderRadius: 3 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                <TableCell width={50}></TableCell>
                <TableCell><strong>Time</strong></TableCell>
                <TableCell><strong>Action</strong></TableCell>
                <TableCell><strong>Violation</strong></TableCell>
                <TableCell><strong>Confidence</strong></TableCell>
                <TableCell><strong>Content Preview</strong></TableCell>
                <TableCell><strong>User ID</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => (
                <React.Fragment key={log.id}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      >
                        {expandedRow === log.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(log.timestamp, 'MMM dd, HH:mm:ss')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={log.action === 'rejected' ? <BlockIcon /> : <ApproveIcon />}
                        label={log.action.toUpperCase()}
                        color={log.action === 'rejected' ? 'error' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {log.violationType ? (
                        <Chip
                          icon={getViolationIcon(log.violationType)}
                          label={log.violationType.replace(/_/g, ' ')}
                          color={getViolationColor(log.violationType)}
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="#5f6368">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.confidence ? `${(log.confidence * 100).toFixed(0)}%` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                        {log.contentPreview || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {log.userId.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 0, borderBottom: 'none' }}>
                      <Collapse in={expandedRow === log.id} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2, m: 1 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                                Details
                              </Typography>
                              <Typography variant="body2" color="#5f6368">
                                <strong>Title:</strong> {log.title || 'N/A'}<br />
                                <strong>Has Images:</strong> {log.hasImages ? `Yes (${log.imageCount})` : 'No'}<br />
                                <strong>Method:</strong> {log.method || 'ai_moderation'}<br />
                                <strong>Automated:</strong> {log.automated ? 'Yes' : 'No'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                                Full Content
                              </Typography>
                              <Box
                                sx={{
                                  maxHeight: 200,
                                  overflow: 'auto',
                                  p: 2,
                                  bgcolor: '#fff',
                                  borderRadius: 1,
                                  border: '1px solid #e8eaed'
                                }}
                              >
                                <Typography variant="body2">
                                  {log.contentPreview}
                                </Typography>
                              </Box>
                            </Grid>
                            {log.violations && log.violations.length > 0 && (
                              <Grid item xs={12}>
                                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                                  Violations Detected ({log.violations.length})
                                </Typography>
                                {log.violations.map((v, idx) => (
                                  <Chip
                                    key={idx}
                                    label={`${v.field}: ${v.category}`}
                                    size="small"
                                    sx={{ mr: 1, mb: 1 }}
                                  />
                                ))}
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
