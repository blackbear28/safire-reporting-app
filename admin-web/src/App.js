import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Components
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard_new';
import Sidebar from './components/Sidebar';
import ReportsManagement from './components/ReportsManagement';
import ComplaintsManagement from './components/ComplaintsManagement';
import UsersManagement from './components/UsersManagement';
import Analytics from './components/Analytics';
import AppointmentsManagement from './components/AppointmentsManagement';
import Settings from './components/Settings';
import LoadingSpinner from './components/LoadingSpinner';

import CreateAdminUser from './components/CreateAdminUser';
import TestFeedbackLogs from './components/TestFeedbackLogs';
import UsageLogs from './components/UsageLogs';
import MessagesManagement from './components/MessagesManagement';
import ModerationSettings from './components/ModerationSettings';
import ModerationLogs from './components/ModerationLogs';
import HotspotMap from './components/HotspotMap';
import TopBar from './components/TopBar';

// Theme — Poppins / modern professional
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4f6ef7',
      dark: '#3451d1',
      light: '#7b93fb',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f04f5a',
      light: '#ff7d87',
      dark: '#c0202e',
    },
    success: {
      main: '#22c55e',
      light: '#4ade80',
      dark: '#15803d',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    info: {
      main: '#06b6d4',
      light: '#22d3ee',
      dark: '#0891b2',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    background: {
      default: '#f4f6fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e2230',
      secondary: '#64748b',
    },
    divider: '#e8edf5',
    grey: {
      50:  '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Inter", "Helvetica Neue", "Arial", sans-serif',
    h1: { fontSize: '2rem',     fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.75rem',  fontWeight: 700, letterSpacing: '-0.015em' },
    h3: { fontSize: '1.5rem',   fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontSize: '1.25rem',  fontWeight: 600, letterSpacing: '-0.005em' },
    h5: { fontSize: '1.1rem',   fontWeight: 600, letterSpacing: '0' },
    h6: { fontSize: '0.95rem',  fontWeight: 600, letterSpacing: '0' },
    subtitle1: { fontSize: '0.875rem', fontWeight: 500, color: '#64748b' },
    subtitle2: { fontSize: '0.8rem',   fontWeight: 500, color: '#64748b' },
    body1:     { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.6 },
    body2:     { fontSize: '0.8125rem',fontWeight: 400, lineHeight: 1.55, color: '#64748b' },
    caption:   { fontSize: '0.75rem',  fontWeight: 400, color: '#94a3b8' },
    overline:  { fontSize: '0.7rem',   fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' },
    button:    { fontSize: '0.875rem', fontWeight: 500, textTransform: 'none', letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 12 },
  shadows: [
    'none',
    '0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)',
    '0 2px 6px rgba(15,23,42,.07), 0 1px 3px rgba(15,23,42,.04)',
    '0 4px 12px rgba(15,23,42,.08), 0 2px 4px rgba(15,23,42,.04)',
    '0 6px 16px rgba(15,23,42,.09), 0 2px 6px rgba(15,23,42,.05)',
    '0 8px 24px rgba(15,23,42,.10), 0 4px 8px rgba(15,23,42,.05)',
    '0 12px 32px rgba(15,23,42,.11), 0 4px 10px rgba(15,23,42,.06)',
    ...Array(18).fill('0 12px 32px rgba(15,23,42,.11), 0 4px 10px rgba(15,23,42,.06)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontFamily: '"Poppins", "Inter", "Helvetica Neue", Arial, sans-serif' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          padding: '7px 18px',
          transition: 'all .18s ease',
        },
        contained: {
          boxShadow: '0 2px 8px rgba(79,110,247,.25)',
          '&:hover': { boxShadow: '0 4px 16px rgba(79,110,247,.35)', transform: 'translateY(-1px)' },
          '&:active': { transform: 'none', boxShadow: 'none' },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': { borderWidth: '1.5px', backgroundColor: 'rgba(79,110,247,.04)' },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 10, transition: 'all .15s ease' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #e8edf5',
          boxShadow: '0 1px 3px rgba(15,23,42,.06)',
          transition: 'box-shadow .2s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: 16 },
        elevation1: { boxShadow: '0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)' },
        elevation2: { boxShadow: '0 2px 6px rgba(15,23,42,.07), 0 1px 3px rgba(15,23,42,.04)' },
        elevation3: { boxShadow: '0 4px 12px rgba(15,23,42,.08), 0 2px 4px rgba(15,23,42,.04)' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 0 #e8edf5',
          backdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(255,255,255,0.92)',
          color: '#1e2230',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #e8edf5',
          boxShadow: 'none',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#f8fafc',
            fontWeight: 600,
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#64748b',
            borderBottom: '2px solid #e8edf5',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: '#f8fafc' },
          transition: 'background-color .12s',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: '1px solid #f1f5f9', padding: '10px 16px' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, fontSize: '0.75rem', borderRadius: 8 },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '& fieldset': { borderColor: '#e2e8f0', borderWidth: '1.5px' },
            '&:hover fieldset': { borderColor: '#94a3b8' },
            '&.Mui-focused fieldset': { borderColor: '#4f6ef7', borderWidth: '2px' },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        outlined: { borderRadius: 10 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20, boxShadow: '0 20px 60px rgba(15,23,42,.18)' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12, fontSize: '0.855rem' },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 99, height: 6, backgroundColor: '#e8edf5' },
        bar:  { borderRadius: 99 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1e2230',
          fontSize: '0.75rem',
          fontFamily: '"Poppins", sans-serif',
          borderRadius: 8,
          padding: '6px 12px',
        },
        arrow: { color: '#1e2230' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { fontWeight: 500, textTransform: 'none', fontSize: '0.875rem' },
      },
    },
    MuiSnackbar: {
      defaultProps: { anchorOrigin: { vertical: 'bottom', horizontal: 'right' } },
    },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check if user is admin or super admin
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          
          if (userData && (userData.role === 'admin' || userData.role === 'super_admin' || userData.role === 'superadmin')) {
            setUser(user);
            setUserRole(userData.role);
          } else {
            // User is not authorized
            console.log('User role not authorized:', userData?.role);
            setUser(null);
            setUserRole(null);
            await auth.signOut();
            alert('Access denied. Admin privileges required.');
          }
        } catch (error) {
          console.error('Error checking user role:', error);
          setUser(null);
          setUserRole(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoadingSpinner />
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/create-admin" element={<CreateAdminUser />} />
            <Route path="*" element={<LoginPage />} />
          </Routes>
        </Router>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <TopBar user={user} onSidebarToggle={toggleSidebar} />
        <Box sx={{ display: 'flex' }}>
          <Sidebar 
            open={sidebarOpen} 
            onToggle={toggleSidebar}
            userRole={userRole}
          />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              pt: 10, // Add top padding for AppBar
              transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
              marginLeft: sidebarOpen ? 0 : '-260px',
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard userRole={userRole} />} />
              <Route path="/reports" element={<ReportsManagement userRole={userRole} />} />
              <Route path="/complaints" element={<ComplaintsManagement userRole={userRole} />} />
              <Route path="/users" element={<UsersManagement userRole={userRole} />} />
              <Route path="/appointments" element={<AppointmentsManagement />} />
              <Route path="/messages" element={<MessagesManagement userRole={userRole} />} />
              <Route path="/analytics" element={<Analytics userRole={userRole} />} />
              <Route path="/moderation" element={<ModerationSettings userRole={userRole} />} />
              <Route path="/moderation-logs" element={<ModerationLogs userRole={userRole} />} />
              <Route path="/test-feedback" element={<TestFeedbackLogs userRole={userRole} />} />
              <Route path="/usage-logs" element={<UsageLogs />} />
              <Route path="/hotspot-map" element={<HotspotMap />} />
              <Route path="/settings" element={<Settings userRole={userRole} />} />
              <Route path="/create-admin" element={<CreateAdminUser />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
