import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Report as ReportIcon,
  People as PeopleIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  TrendingUp as TrendingIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';

export default function Dashboard({ userRole }) {
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    resolvedReports: 0,
    totalUsers: 0,
    criticalReports: 0,
    todayReports: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    // Real-time statistics
    const unsubscribeReports = onSnapshot(
      collection(db, 'reports'),
      (snapshot) => {
        const reports = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        setStats({
          totalReports: reports.length,
          pendingReports: reports.filter(r => r.status === 'pending').length,
          resolvedReports: reports.filter(r => r.status === 'resolved').length,
          criticalReports: reports.filter(r => r.priority === 'high' || r.priority === 'critical').length,
          todayReports: reports.filter(r => {
            const reportDate = r.createdAt?.toDate();
            return reportDate && reportDate >= today;
          }).length,
          falseReports: reports.filter(r => r.isFalsePositive).length,
          aiAnalyzedReports: reports.filter(r => r.aiAnalyzed).length,
          highRiskReports: reports.filter(r => r.aiAnalysis?.riskLevel === 'HIGH').length,
          autoFlaggedReports: reports.filter(r => r.aiAutoFlagged).length
        });

        // Get recent reports (last 5)
        const sorted = reports
          .sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0))
          .slice(0, 5);
        setRecentReports(sorted);
      }
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setStats(prev => ({
          ...prev,
          totalUsers: users.length,
          suspendedUsers: users.filter(u => u.accountStatus === 'suspended' || u.status === 'suspended').length,
          usersWithFalseReports: users.filter(u => (u.falseReportsCount || 0) > 0).length
        }));
        setLoading(false);
      }
    );

    return () => {
      unsubscribeReports();
      unsubscribeUsers();
    };
  }, []);

  const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ color: `${color}.main`, mr: 1 }}>
            {icon}
          </Box>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" component="div" color={`${color}.main`}>
          {loading ? '-' : value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'success';
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome back! Here's what's happening with your school reporting system.
      </Typography>

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Reports"
            value={stats.totalReports}
            icon={<ReportIcon />}
            color="primary"
            subtitle="All time reports"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Pending Reports"
            value={stats.pendingReports}
            icon={<PendingIcon />}
            color="warning"
            subtitle="Requires attention"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Resolved Reports"
            value={stats.resolvedReports}
            icon={<CheckIcon />}
            color="success"
            subtitle="Successfully handled"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<PeopleIcon />}
            color="info"
            subtitle="Registered users"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Critical Reports"
            value={stats.criticalReports}
            icon={<WarningIcon />}
            color="error"
            subtitle="High priority issues"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Today's Reports"
            value={stats.todayReports}
            icon={<TrendingIcon />}
            color="secondary"
            subtitle="Reports submitted today"
          />
        </Grid>
      </Grid>

      {/* Anti-False Reporting Statistics */}
      <Typography variant="h5" gutterBottom sx={{ mt: 2, mb: 2 }}>
        Anti-False Reporting Statistics
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="False Reports"
            value={stats.falseReports || 0}
            icon={<WarningIcon />}
            color="error"
            subtitle="Flagged as false"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="AI Analyzed"
            value={stats.aiAnalyzedReports || 0}
            icon={<CheckIcon />}
            color="info"
            subtitle="Reports processed by AI"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="High Risk"
            value={stats.highRiskReports || 0}
            icon={<WarningIcon />}
            color="warning"
            subtitle="AI flagged high risk"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Auto-Flagged"
            value={stats.autoFlaggedReports || 0}
            icon={<ReportIcon />}
            color="error"
            subtitle="Automatically flagged"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Suspended Users"
            value={stats.suspendedUsers || 0}
            icon={<PeopleIcon />}
            color="error"
            subtitle="Currently suspended"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Users w/ False Reports"
            value={stats.usersWithFalseReports || 0}
            icon={<PeopleIcon />}
            color="warning"
            subtitle="Have submitted false reports"
          />
        </Grid>
      </Grid>

      {/* Recent Reports */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Reports
        </Typography>
        {recentReports.length === 0 ? (
          <Typography color="text.secondary">
            No reports available
          </Typography>
        ) : (
          <Box>
            {recentReports.map((report) => (
              <Box
                key={report.id}
                sx={{
                  p: 2,
                  mb: 2,
                  border: 1,
                  borderColor: 'grey.200',
                  borderRadius: 1,
                  '&:last-child': { mb: 0 }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                    {report.title || 'Untitled Report'}
                  </Typography>
                  <Chip
                    label={report.status || 'pending'}
                    color={getStatusColor(report.status)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={report.priority || 'medium'}
                    color={getPriorityColor(report.priority)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {report.description || 'No description provided'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {report.createdAt?.toDate()?.toLocaleString() || 'Unknown date'} • 
                  Category: {report.category || 'General'}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
