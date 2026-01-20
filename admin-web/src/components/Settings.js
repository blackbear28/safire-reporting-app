import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Switch,
  TextField,
  Button,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications,
  Security,  
  Email,
  Save
} from '@mui/icons-material';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Settings({ userRole }) {
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      newReportAlerts: true,
      criticalReportAlerts: true,
      dailyDigest: false
    },
    system: {
      autoAssignReports: false,
      requireApproval: true,
      allowAnonymous: true,
      maxReportsPerUser: 10
    },
    email: {
      smtpServer: '',
      smtpPort: 587,
      emailFrom: '',
      password: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const loadSettings = useCallback(async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'admin_settings', 'general'));
      if (settingsDoc.exists()) {
        setSettings(prev => ({ ...prev, ...settingsDoc.data() }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    try {
      await setDoc(doc(db, 'admin_settings', 'general'), settings);
      showSnackbar('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showSnackbar('Failed to save settings', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleNotificationChange = (setting) => (event) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [setting]: event.target.checked
      }
    });
  };

  const handleSystemChange = (setting) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setSettings({
      ...settings,
      system: {
        ...settings.system,
        [setting]: value
      }
    });
  };

  const handleEmailChange = (setting) => (event) => {
    setSettings({
      ...settings,
      email: {
        ...settings.email,
        [setting]: event.target.value
      }
    });
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Typography>Loading settings...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Configure system preferences and notification settings
      </Typography>

      <Grid container spacing={3}>
        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader
              avatar={<Notifications />}
              title="Notification Settings"
              subheader="Configure how you receive alerts"
            />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Email />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Email Notifications"
                    secondary="Receive notifications via email"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.emailNotifications}
                      onChange={handleNotificationChange('emailNotifications')}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                
                <ListItem>
                  <ListItemText 
                    primary="New Report Alerts"
                    secondary="Get notified when new reports are submitted"
                    sx={{ ml: 4 }}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.newReportAlerts}
                      onChange={handleNotificationChange('newReportAlerts')}
                      disabled={!settings.notifications.emailNotifications}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemText 
                    primary="Critical Report Alerts"
                    secondary="Immediate alerts for high-priority reports"
                    sx={{ ml: 4 }}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.criticalReportAlerts}
                      onChange={handleNotificationChange('criticalReportAlerts')}
                      disabled={!settings.notifications.emailNotifications}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemText 
                    primary="Daily Digest"
                    secondary="Daily summary of reports and activities"
                    sx={{ ml: 4 }}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications.dailyDigest}
                      onChange={handleNotificationChange('dailyDigest')}
                      disabled={!settings.notifications.emailNotifications}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* System Settings */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader
              avatar={<SettingsIcon />}
              title="System Settings"
              subheader="Configure system behavior"
            />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Auto-assign Reports"
                    secondary="Automatically assign reports to departments"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.system.autoAssignReports}
                      onChange={handleSystemChange('autoAssignReports')}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemText 
                    primary="Require Approval"
                    secondary="Reports need admin approval before being visible"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.system.requireApproval}
                      onChange={handleSystemChange('requireApproval')}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemText 
                    primary="Allow Anonymous Reports"
                    secondary="Users can submit reports without identification"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.system.allowAnonymous}
                      onChange={handleSystemChange('allowAnonymous')}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemText 
                    primary="Max Reports Per User"
                    secondary="Daily limit for reports per user"
                  />
                  <ListItemSecondaryAction>
                    <TextField
                      type="number"
                      size="small"
                      value={settings.system.maxReportsPerUser}
                      onChange={handleSystemChange('maxReportsPerUser')}
                      sx={{ width: 80 }}
                      inputProps={{ min: 1, max: 50 }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Email Configuration - Only for Super Admin */}
        {userRole === 'super_admin' && (
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardHeader
                avatar={<Security />}
                title="Email Configuration"
                subheader="SMTP settings for sending notifications"
              />
              <CardContent>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <strong>Security Notice:</strong> Email configuration is only available to super administrators.
                  Ensure SMTP credentials are kept secure.
                </Alert>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="SMTP Server"
                      value={settings.email.smtpServer}
                      onChange={handleEmailChange('smtpServer')}
                      placeholder="smtp.gmail.com"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="SMTP Port"
                      value={settings.email.smtpPort}
                      onChange={handleEmailChange('smtpPort')}
                      placeholder="587"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="From Email"
                      value={settings.email.emailFrom}
                      onChange={handleEmailChange('emailFrom')}
                      placeholder="noreply@school.edu"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="password"
                      label="SMTP Password"
                      value={settings.email.password}
                      onChange={handleEmailChange('password')}
                      placeholder="••••••••"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* System Information */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardHeader
              title="System Information"
              subheader="Current system status and information"
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" color="primary">
                      Safire Admin
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Version 1.0.0
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main">
                      Online
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      System Status
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" color="info.main">
                      Firebase
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Database Provider
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" color="warning.main">
                      {userRole === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Your Role
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Save />}
          onClick={saveSettings}
        >
          Save All Settings
        </Button>
      </Box>

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
