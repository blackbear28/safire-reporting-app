import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Tooltip from '@mui/material/Tooltip';

export default function TopBar({ user, onSidebarToggle }) {
  return (
    <AppBar position="fixed" color="inherit" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, borderBottom: '1px solid #e8eaed' }}>
      <Toolbar sx={{ minHeight: 64, px: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={onSidebarToggle} edge="start" color="inherit" sx={{ mr: 2, display: { md: 'none' } }}>
            <span className="material-icons">menu</span>
          </IconButton>
          <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: '#1a73e8', letterSpacing: 0.5 }}>
            Safire Admin Console
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title="Notifications">
            <IconButton color="inherit">
              <NotificationsIcon />
            </IconButton>
          </Tooltip>
          <Avatar alt={user?.displayName || 'Admin'} src={user?.photoURL || ''} sx={{ width: 36, height: 36, bgcolor: '#1a73e8', fontWeight: 600 }}>
            {user?.displayName ? user.displayName[0] : 'A'}
          </Avatar>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
