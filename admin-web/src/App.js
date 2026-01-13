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
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import ReportsManagement from './components/ReportsManagement';
import UsersManagement from './components/UsersManagement';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import LoadingSpinner from './components/LoadingSpinner';
import CreateAdminUser from './components/CreateAdminUser';

// Theme configuration
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      dark: '#115293',
      light: '#42a5f5'
    },
    secondary: {
      main: '#dc004e'
    },
    background: {
      default: '#f5f5f5'
    }
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h4: {
      fontWeight: 600
    },
    h6: {
      fontWeight: 500
    }
  }
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
              marginLeft: sidebarOpen ? 0 : '-240px',
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard userRole={userRole} />} />
              <Route path="/reports" element={<ReportsManagement userRole={userRole} />} />
              <Route path="/users" element={<UsersManagement userRole={userRole} />} />
              <Route path="/analytics" element={<Analytics userRole={userRole} />} />
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
