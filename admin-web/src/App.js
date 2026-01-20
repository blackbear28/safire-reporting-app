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
import UsersManagement from './components/UsersManagement';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import LoadingSpinner from './components/LoadingSpinner';
import CreateAdminUser from './components/CreateAdminUser';
import TestFeedbackLogs from './components/TestFeedbackLogs';
import UsageLogs from './components/UsageLogs';
import MessagesManagement from './components/MessagesManagement';
import ModerationSettings from './components/ModerationSettings';
import ModerationLogs from './components/ModerationLogs';

// Theme configuration - Google Cloud Console inspired
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a73e8', // Google Blue
      dark: '#1557b0',
      light: '#4285f4',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ea4335', // Google Red
      light: '#ff6659',
      dark: '#c5221f',
    },
    success: {
      main: '#34a853', // Google Green
      light: '#57bb7e',
      dark: '#0d9e3b',
    },
    warning: {
      main: '#fbbc04', // Google Yellow
      light: '#fdd663',
      dark: '#f9ab00',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#202124',
      secondary: '#5f6368',
    },
    divider: '#e8eaed',
  },
  typography: {
    fontFamily: '"Outfit", "Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.125rem',
      fontWeight: 600,
      letterSpacing: '-0.01562em',
      color: '#202124',
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '-0.00833em',
      color: '#202124',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '0em',
      color: '#202124',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '0.0075em',
      color: '#202124',
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      letterSpacing: '0em',
      color: '#202124',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      letterSpacing: '0.0125em',
      color: '#202124',
    },
    subtitle1: {
      fontSize: '0.875rem',
      fontWeight: 500,
      letterSpacing: '0.00714em',
      color: '#5f6368',
    },
    body1: {
      fontSize: '0.875rem',
      fontWeight: 400,
      letterSpacing: '0.01071em',
      color: '#202124',
    },
    body2: {
      fontSize: '0.8125rem',
      fontWeight: 400,
      letterSpacing: '0.01071em',
      color: '#5f6368',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      letterSpacing: '0.0892857143em',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
    '0 1px 2px 0 rgba(60,64,67,.3), 0 2px 6px 2px rgba(60,64,67,.15)',
    '0 4px 8px 3px rgba(60,64,67,.15), 0 1px 3px 0 rgba(60,64,67,.3)',
    '0 6px 10px 4px rgba(60,64,67,.15), 0 2px 3px 0 rgba(60,64,67,.3)',
    '0 8px 12px 6px rgba(60,64,67,.15), 0 4px 4px 0 rgba(60,64,67,.3)',
    ...Array(19).fill('0 8px 12px 6px rgba(60,64,67,.15), 0 4px 4px 0 rgba(60,64,67,.3)'),
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          textTransform: 'none',
          fontWeight: 500,
          padding: '6px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid #e8eaed',
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid #e8eaed',
        },
      },
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
              <Route path="/users" element={<UsersManagement userRole={userRole} />} />
              <Route path="/messages" element={<MessagesManagement userRole={userRole} />} />
              <Route path="/analytics" element={<Analytics userRole={userRole} />} />
              <Route path="/moderation" element={<ModerationSettings userRole={userRole} />} />
              <Route path="/moderation-logs" element={<ModerationLogs userRole={userRole} />} />
              <Route path="/test-feedback" element={<TestFeedbackLogs userRole={userRole} />} />
              <Route path="/usage-logs" element={<UsageLogs />} />
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
