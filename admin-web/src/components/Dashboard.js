import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Report as ReportIcon,
  People as PeopleIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  TrendingUp as TrendingIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { collection, onSnapshot } from 'firebase/firestore';
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

  const StatCard = ({ title, value, icon, color = 'primary', subtitle, trend }) => (
    <Card 
      elevation={0}
      sx={{ 
        height: '100%',
        border: '1px solid #e8eaed',
        borderRadius: 2,
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: '0 1px 2px 0 rgba(60,64,67,.3), 0 2px 6px 2px rgba(60,64,67,.15)',
          borderColor: '#dadce0',
        }
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#5f6368',
                fontSize: '0.8125rem',
                fontWeight: 500,
                mb: 1,
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                color: '#202124',
                fontSize: '2rem',
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              {loading ? '-' : value.toLocaleString()}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              backgroundColor: `${color}.light`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.15,
            }}
          >
            {React.cloneElement(icon, { 
              sx: { fontSize: 24, color: `${color}.main`, opacity: 1 } 
            })}
          </Box>
        </Box>
        {subtitle && (
          <Typography 
            variant="caption" 
            sx={{ 
              color: '#5f6368',
              fontSize: '0.75rem',
            }}
          >
            {subtitle}
          </Typography>
        )}
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <TrendingIcon sx={{ fontSize: 16, color: trend > 0 ? '#34a853' : '#ea4335', mr: 0.5 }} />
            <Typography 
              variant="caption" 
              sx={{ 
                color: trend > 0 ? '#34a853' : '#ea4335',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              {trend > 0 ? '+' : ''}{trend}% from last period
            </Typography>
          </Box>
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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            color: '#202124',
            fontSize: '1.75rem',
            fontWeight: 600,
            mb: 0.5,
          }}
        >
          Dashboard
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#5f6368',
            fontSize: '0.875rem',
          }}
        >
          Welcome back! Here's what's happening with your school reporting system.
        </Typography>
      </Box>

      {loading && <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />}

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
      <Box sx={{ mb: 3 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            color: '#202124',
            fontSize: '1.25rem',
            fontWeight: 600,
            mb: 2,
          }}
        >
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
      </Box>

      {/* Recent Reports */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3,
          border: '1px solid #e8eaed',
          borderRadius: 2,
        }}
      >
        <Typography 
          variant="h6" 
          sx={{ 
            color: '#202124',
            fontSize: '1.125rem',
            fontWeight: 600,
            mb: 2,
          }}
        >
          Recent Reports
        </Typography>
        {recentReports.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ReportIcon sx={{ fontSize: 48, color: '#dadce0', mb: 1 }} />
            <Typography sx={{ color: '#5f6368', fontSize: '0.875rem' }}>
              No reports available
            </Typography>
          </Box>
        ) : (
          <Box>
            {recentReports.map((report, index) => (
              <Box
                key={report.id}
                sx={{
                  p: 2,
                  mb: index < recentReports.length - 1 ? 2 : 0,
                  backgroundColor: '#f8f9fa',
                  borderRadius: 2,
                  border: '1px solid #e8eaed',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      flexGrow: 1,
                      color: '#202124',
                      fontSize: '0.9375rem',
                      fontWeight: 500,
                    }}
                  >
                    {report.title || 'Untitled Report'}
                  </Typography>
                  <Chip
                    label={report.status || 'pending'}
                    color={getStatusColor(report.status)}
                    size="small"
                    sx={{ 
                      mr: 1,
                      height: 24,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  />
                  <Chip
                    label={report.priority || 'medium'}
                    color={getPriorityColor(report.priority)}
                    size="small"
                    sx={{ 
                      height: 24,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  />
                </Box>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#5f6368',
                    fontSize: '0.8125rem',
                    mb: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {report.description || 'No description provided'}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: '#80868b',
                    fontSize: '0.75rem',
                  }}
                >
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
