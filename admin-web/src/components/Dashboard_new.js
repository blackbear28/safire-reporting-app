import React, { useState, useEffect } from 'react';
import SupportRequestModal from './SupportRequestModal';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Report as ReportIcon,
  People as PeopleIcon,
  Chat as ChatIcon,
  BarChart as BarChartIcon,
  ArrowForward as ArrowForwardIcon,
  
  Security as SecurityIcon,
  TrendingUp as TrendingIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function Dashboard({ userRole }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    resolvedReports: 0,
    totalUsers: 0,
    todayReports: 0
  });

  useEffect(() => {
    const unsubscribeReports = onSnapshot(
      collection(db, 'reports'),
      (snapshot) => {
        const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        setStats(prev => ({
          ...prev,
          totalReports: reports.length,
          pendingReports: reports.filter(r => r.status === 'pending').length,
          resolvedReports: reports.filter(r => r.status === 'resolved').length,
          todayReports: reports.filter(r => {
            const reportDate = r.createdAt?.toDate();
            return reportDate && reportDate >= today;
          }).length,
        }));
      }
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
      }
    );

    return () => {
      unsubscribeReports();
      unsubscribeUsers();
    };
  }, []);

  const ActionCard = ({ title, description, icon, onClick, color = '#1976d2' }) => (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid #e8eaed',
        borderRadius: 3,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 1px 2px 0 rgba(60,64,67,.3), 0 2px 6px 2px rgba(60,64,67,.15)',
          borderColor: '#dadce0',
          transform: 'translateY(-2px)',
        }
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            backgroundColor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          {React.cloneElement(icon, { sx: { color: '#fff', fontSize: 24 } })}
        </Box>
        <Typography
          variant="h6"
          sx={{
            color: '#202124',
            fontSize: '1rem',
            fontWeight: 600,
            mb: 1,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: '#5f6368',
            fontSize: '0.875rem',
            lineHeight: 1.5,
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );

  const FeatureCard = ({ title, description, icon, badge }) => (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #e8eaed',
        borderRadius: 3,
        mb: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 1px 2px 0 rgba(60,64,67,.3), 0 2px 6px 2px rgba(60,64,67,.15)',
          borderColor: '#dadce0',
        }
      }}
    >
      <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            backgroundColor: '#f1f3f4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {React.cloneElement(icon, { sx: { color: '#202124', fontSize: 20 } })}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography
              variant="subtitle1"
              sx={{
                color: '#202124',
                fontSize: '0.9375rem',
                fontWeight: 600,
              }}
            >
              {title}
            </Typography>
            {badge && (
              <Chip
                label={badge}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  backgroundColor: '#e8f0fe',
                  color: '#1967d2',
                }}
              />
            )}
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: '#5f6368',
              fontSize: '0.8125rem',
            }}
          >
            {description}
          </Typography>
        </Box>
        <IconButton size="small" sx={{ color: '#5f6368' }}>
          <ArrowForwardIcon fontSize="small" />
        </IconButton>
      </CardContent>
    </Card>
  );

  const StatBadge = ({ label, value, color = '#1976d2' }) => (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: 2,
        backgroundColor: '#f8f9fa',
        border: '1px solid #e8eaed',
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: '#5f6368',
          fontSize: '0.8125rem',
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
      <Chip
        label={value}
        size="small"
        sx={{
          height: 24,
          fontSize: '0.875rem',
          fontWeight: 700,
          backgroundColor: color,
          color: '#fff',
        }}
      />
    </Box>
  );

  const [supportModalOpen, setSupportModalOpen] = useState(false);

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 5 }}>
        <Typography
          variant="h3"
          sx={{
            color: '#202124',
            fontSize: '2rem',
            fontWeight: 600,
            mb: 1,
          }}
        >
          School Reporting System
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: '#5f6368',
            fontSize: '1rem',
            fontWeight: 400,
          }}
        >
          The fastest way to manage and resolve campus incidents
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Box sx={{ mb: 5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <StatBadge label="Total Reports" value={stats.totalReports} color="#1976d2" />
        <StatBadge label="Pending" value={stats.pendingReports} color="#ed6c02" />
        <StatBadge label="Resolved" value={stats.resolvedReports} color="#2e7d32" />
        <StatBadge label="Today" value={stats.todayReports} color="#9c27b0" />
      </Box>

      {/* Main Action Cards */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        <Grid item xs={12} md={4}>
          <ActionCard
            title="Manage Reports"
            description="Review, assign, and resolve submitted incident reports"
            icon={<ReportIcon />}
            color="#1976d2"
            onClick={() => navigate('/reports')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <ActionCard
            title="View Analytics"
            description="Track trends and patterns in campus incident reporting"
            icon={<BarChartIcon />}
            color="#0288d1"
            onClick={() => navigate('/analytics')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <ActionCard
            title="User Management"
            description="Manage users, roles, and permissions across the system"
            icon={<PeopleIcon />}
            color="#7b1fa2"
            onClick={() => navigate('/users')}
          />
        </Grid>
      </Grid>

      {/* What's New Section */}
      <Box sx={{ mb: 5 }}>
        <Typography
          variant="h5"
          sx={{
            color: '#202124',
            fontSize: '1.375rem',
            fontWeight: 600,
            mb: 3,
          }}
        >
          What's new
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FeatureCard
              title="AI-Powered False Report Detection"
              description="Advanced machine learning to identify and flag potentially false or malicious reports"
              icon={<SecurityIcon />}
              badge="NEW"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FeatureCard
              title="Print Report Evidence"
              description="Generate professional formatted reports for due process proceedings"
              icon={<VerifiedIcon />}
              badge="NEW"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FeatureCard
              title="Real-time Admin Messaging"
              description="Chat directly with students and staff for faster issue resolution"
              icon={<ChatIcon />}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FeatureCard
              title="Advanced Analytics Dashboard"
              description="Comprehensive insights into reporting trends and campus safety metrics"
              icon={<TrendingIcon />}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Get Started Section */}
      <Box
        sx={{
          p: 4,
          borderRadius: 3,
          backgroundColor: '#f8f9fa',
          border: '1px solid #e8eaed',
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: '#202124',
            fontSize: '1.25rem',
            fontWeight: 600,
            mb: 1,
          }}
        >
          Get started
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: '#5f6368',
            fontSize: '0.875rem',
            mb: 3,
          }}
        >
          Quick actions to manage your reporting system effectively
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<ReportIcon />}
            onClick={() => navigate('/reports')}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontSize: '0.875rem',
              fontWeight: 600,
              backgroundColor: '#1a73e8',
              '&:hover': {
                backgroundColor: '#1967d2',
              },
            }}
          >
            View all reports
          </Button>
          <Button
            variant="outlined"
            startIcon={<ChatIcon />}
            onClick={() => navigate('/messages')}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontSize: '0.875rem',
              fontWeight: 600,
              borderColor: '#dadce0',
              color: '#5f6368',
              '&:hover': {
                borderColor: '#5f6368',
                backgroundColor: '#f8f9fa',
              },
            }}
          >
            Open messages
          </Button>
          <Button
            variant="outlined"
            startIcon={<BarChartIcon />}
            onClick={() => navigate('/analytics')}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontSize: '0.875rem',
              fontWeight: 600,
              borderColor: '#dadce0',
              color: '#5f6368',
              '&:hover': {
                borderColor: '#5f6368',
                backgroundColor: '#f8f9fa',
              },
            }}
          >
            View analytics
          </Button>
          <Button
            variant="outlined"
            onClick={() => setSupportModalOpen(true)}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              px: 3,
              py: 1.5,
              fontSize: '0.875rem',
              fontWeight: 600,
              borderColor: '#dadce0',
              color: '#5f6368',
              '&:hover': {
                borderColor: '#5f6368',
                backgroundColor: '#f8f9fa',
              },
            }}
          >
            Support Requests
          </Button>
        </Box>
        <SupportRequestModal open={supportModalOpen} onClose={() => setSupportModalOpen(false)} />
      </Box>
    </Box>
  );
}
