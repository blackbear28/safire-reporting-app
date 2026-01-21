import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Typography,
  Box,
  IconButton,
  
  Chip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Report as ReportIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Menu as MenuIcon,
  AdminPanelSettings as AdminIcon,
  Feedback as FeedbackIcon,
  Chat as ChatIcon,
  History as HistoryIcon,
  Shield as ShieldIcon,
  Flag,
  Event as EventIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Reports', icon: <ReportIcon />, path: '/reports' },
  { text: 'Complaints', icon: <Flag />, path: '/complaints' },
  { text: 'Users', icon: <PeopleIcon />, path: '/users' },
  { text: 'Appointments', icon: <EventIcon />, path: '/appointments' },
  { text: 'Messages', icon: <ChatIcon />, path: '/messages' },
  { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
  { text: 'Moderation', icon: <ShieldIcon />, path: '/moderation', badge: 'AI' },
  { text: 'Moderation Logs', icon: <HistoryIcon />, path: '/moderation-logs', badge: 'NEW' },
  { text: 'Test Feedback', icon: <FeedbackIcon />, path: '/test-feedback' },
  { text: 'Usage Logs', icon: <HistoryIcon />, path: '/usage-logs' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

export default function Sidebar({ open, onToggle, userRole }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e8eaed',
          boxShadow: 'none',
        },
      }}
    >
      {/* Header */}
      <Box 
        sx={{ 
          p: 2.5,
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          borderBottom: '1px solid #e8eaed',
        }}
      >
        <IconButton 
          onClick={onToggle}
          size="small"
          sx={{ 
            color: '#5f6368',
            '&:hover': { backgroundColor: '#f8f9fa' },
          }}
        >
          <MenuIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(26, 115, 232, 0.2)',
            }}
          >
            <AdminIcon sx={{ color: '#ffffff', fontSize: 20 }} />
          </Box>
          <Box>
            <Typography 
              variant="h6" 
              sx={{ 
                fontSize: '1rem',
                fontWeight: 600,
                color: '#202124',
                lineHeight: 1.2,
              }}
            >
              Safire Admin
            </Typography>
            <Chip
              label={userRole === 'super_admin' ? 'Super Admin' : 'Admin'}
              size="small"
              sx={{
                height: '18px',
                fontSize: '0.6875rem',
                fontWeight: 500,
                mt: 0.5,
                backgroundColor: userRole === 'super_admin' ? '#e8f0fe' : '#f1f3f4',
                color: userRole === 'super_admin' ? '#1a73e8' : '#5f6368',
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Navigation Menu */}
      <List sx={{ px: 1.5, py: 1.5 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                borderRadius: 2,
                px: 2,
                py: 1,
                minHeight: '40px',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: '#f8f9fa',
                },
                '&.Mui-selected': {
                  backgroundColor: '#e8f0fe',
                  color: '#1a73e8',
                  '& .MuiListItemIcon-root': {
                    color: '#1a73e8',
                  },
                  '& .MuiTypography-root': {
                    fontWeight: 600,
                  },
                  '&:hover': {
                    backgroundColor: '#e8f0fe',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: '#5f6368' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: location.pathname === item.path ? '#1a73e8' : '#202124',
                }}
              />
              {item.badge && (
                <Chip 
                  label={item.badge} 
                  size="small"
                  sx={{ 
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    backgroundColor: '#ff8c00',
                    color: '#fff'
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* User Actions */}
      <Box sx={{ mt: 'auto', p: 1, borderTop: '1px solid #e8eaed' }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            px: 2,
            py: 1,
            minHeight: '40px',
            '&:hover': {
              backgroundColor: '#fce8e6',
              color: '#ea4335',
              '& .MuiListItemIcon-root': {
                color: '#ea4335',
              },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: '#5f6368' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Logout"
            primaryTypographyProps={{
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          />
        </ListItemButton>
      </Box>
    </Drawer>
  );
}
