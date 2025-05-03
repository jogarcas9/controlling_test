import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  useLocation,
  // eslint-disable-next-line no-unused-vars
  UNSAFE_DataRouterContext,
  // eslint-disable-next-line no-unused-vars
  UNSAFE_DataRouterStateContext,
} from 'react-router-dom';
import { 
  Box, 
  CssBaseline, 
  ThemeProvider, 
  createTheme,
  Drawer,
  useMediaQuery,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import { 
  Menu as MenuIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';
import { CurrencyProvider } from './context/CurrencyContext';
import SharedSessions from './components/shared/SharedSessions';
import Dashboard from './components/dashboard/Dashboard';
import PersonalExpenses from './components/personal/PersonalExpenses';
import Settings from './components/settings/Settings';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Sidebar from './components/layout/Sidebar';
import MobileBottomNav from './components/layout/MobileBottomNav';
import NotificationRemover from './components/layout/NotificationRemover';
import NotificationButtonRemover from './components/layout/NotificationButtonRemover';
import ReportsDashboard from './components/reports/ReportsDashboard';
import { AuthProvider } from './context/AuthContext';
import authService from './services/authService';

// Componente AppLayout sin dependencia de useTheme
const AppLayout = ({ 
  children, 
  drawerWidth, 
  minimizedDrawerWidth,
  isDrawerMinimized,
  mobileOpen,
  handleDrawerToggle,
  handleDrawerMinimize,
  handleLogout,
  darkMode,
  t,
  theme
}) => {
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      overflow: 'hidden',
      background: darkMode 
        ? 'linear-gradient(135deg, #111827 0%, #1e1f25 100%)' 
        : 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '20%',
        background: darkMode 
          ? 'linear-gradient(180deg, rgba(76, 110, 245, 0.05) 0%, rgba(76, 110, 245, 0) 100%)' 
          : 'linear-gradient(180deg, rgba(76, 110, 245, 0.05) 0%, rgba(76, 110, 245, 0) 100%)',
        zIndex: 0
      }
    }}>
      {/* NavBar con estilo moderno */}
      <AppBar 
        position="fixed" 
        color="transparent" 
        elevation={0}
        sx={{
          width: { 
            xs: '100%',
            sm: `calc(100% - ${isDrawerMinimized ? minimizedDrawerWidth : drawerWidth}px)` 
          },
          ml: { 
            xs: 0,
            sm: isDrawerMinimized ? minimizedDrawerWidth : drawerWidth 
          },
          background: 'transparent',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderRadius: 0,
        }}
      >
        <Toolbar sx={{ 
          height: 64,
          background: 'transparent',
          borderRadius: 0
        }}>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerToggle}
              edge="start"
              sx={{
                mr: 2,
                color: 'text.secondary',
              }}
            >
              <MenuIcon />
            </IconButton>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 600, 
                display: { xs: 'none', sm: 'block' } 
              }}
            >
              {getPageTitle(location.pathname, t)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <IconButton
              color="inherit"
              onClick={handleLogout}
              aria-label={t('logout')}
              size="large"
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { sm: isDrawerMinimized ? minimizedDrawerWidth : drawerWidth },
          flexShrink: { sm: 0 },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* Menú lateral para dispositivos móviles */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRadius: 0 
            },
          }}
        >
          <Sidebar 
            mobileOpen={mobileOpen} 
            handleDrawerToggle={handleDrawerToggle} 
            isMinimized={false}
            onMinimizeToggle={handleDrawerMinimize}
          />
        </Drawer>

        {/* Menú lateral para escritorio */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: isDrawerMinimized ? minimizedDrawerWidth : drawerWidth,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
              borderRadius: 0
            },
          }}
          open
        >
          <Sidebar 
            handleDrawerToggle={handleDrawerToggle} 
            isMinimized={isDrawerMinimized} 
            onMinimizeToggle={handleDrawerMinimize}
          />
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 3 },
          width: { 
            xs: '100%', 
            sm: `calc(100% - ${isDrawerMinimized ? minimizedDrawerWidth : drawerWidth}px)` 
          },
          height: '100vh',
          overflow: 'auto',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          mt: {xs: '56px', sm: '64px'},
          pb: { xs: '65px', sm: 0 }
        }}
      >
        {children}
      </Box>

      {isMobile && <MobileBottomNav />}
    </Box>
  );
};

// Nuevo componente que obtiene el tema usando useTheme
function ThemeAwareAppLayout(props) {
  const theme = useTheme();
  return <AppLayout {...props} theme={theme} />;
}

// Función para obtener el título de la página según la ruta actual
const getPageTitle = (pathname, t) => {
  if (pathname.startsWith('/dashboard')) return t('dashboard');
  if (pathname.startsWith('/personal')) return t('personalExpenses');
  if (pathname.startsWith('/shared')) return t('sharedExpenses');
  if (pathname.startsWith('/reports')) return t('reports');
  if (pathname.startsWith('/settings')) return t('settings');
  return 'Controling';
};

const App = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDrawerMinimized, setIsDrawerMinimized] = useState(false);
  const drawerWidth = 240;
  const minimizedDrawerWidth = 65;
  
  // Estados para la configuración
  const [darkMode, setDarkMode] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [language, setLanguage] = useState('es');
  // eslint-disable-next-line no-unused-vars
  const [currency, setCurrency] = useState('EUR');

  // Obtener funciones de traducción incondicionalmente
  const { t = key => key } = useTranslation();
  
  // Crear el tema directamente en el componente
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#6366f1', // Índigo vibrante
        light: '#818cf8',
        dark: '#4f46e5',
        contrastText: '#ffffff',
        lighter: 'rgba(99, 102, 241, 0.08)'
      },
      secondary: {
        main: '#f43f5e', // Rosa vibrante
        light: '#fb7185',
        dark: '#e11d48',
        contrastText: '#ffffff',
        lighter: 'rgba(244, 63, 94, 0.08)'
      },
      background: {
        default: darkMode ? '#0f172a' : '#f8fafc',
        paper: darkMode ? '#1e293b' : '#ffffff',
        sidebar: darkMode ? '#0f172a' : '#1e293b'
      },
      error: {
        main: '#ef4444',
        light: '#f87171',
        dark: '#dc2626',
        contrastText: '#ffffff',
        lighter: 'rgba(239, 68, 68, 0.08)'
      },
      success: {
        main: '#22c55e',
        light: '#4ade80',
        dark: '#16a34a',
        contrastText: '#ffffff',
        lighter: 'rgba(34, 197, 94, 0.08)'
      },
      info: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb',
        contrastText: '#ffffff',
        lighter: 'rgba(59, 130, 246, 0.08)'
      },
      warning: {
        main: '#f59e0b',
        light: '#fbbf24',
        dark: '#d97706',
        contrastText: '#ffffff',
        lighter: 'rgba(245, 158, 11, 0.08)'
      }
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 700,
        fontSize: '1.75rem'
      },
      h5: {
        fontWeight: 600
      },
      h6: {
        fontWeight: 600
      },
      subtitle1: {
        fontSize: '0.9rem',
        fontWeight: 500
      }
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            fontWeight: 500,
            boxShadow: 'none'
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500
          }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: '16px'
          },
          head: {
            fontWeight: 600,
            color: darkMode ? '#e2e8f0' : '#334155'
          }
        }
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:last-child td': {
              borderBottom: 0
            }
          }
        }
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            width: 42,
            height: 26,
            padding: 0
          },
          switchBase: {
            padding: 1,
            '&.Mui-checked': {
              transform: 'translateX(16px)',
              color: '#fff',
            }
          },
          thumb: {
            width: 24,
            height: 24
          },
          track: {
            borderRadius: 13
          }
        }
      }
    },
    shape: {
      borderRadius: 16
    },
    shadows: [
      'none',
      '0px 2px 4px rgba(0,0,0,0.02)',
      '0px 2px 8px rgba(0,0,0,0.05)',
      '0px 4px 12px rgba(0,0,0,0.08)',
      '0px 6px 16px rgba(0,0,0,0.11)',
      '0px 8px 20px rgba(0,0,0,0.14)',
      '0px 10px 24px rgba(0,0,0,0.17)',
      '0px 12px 28px rgba(0,0,0,0.20)',
      '0px 14px 32px rgba(0,0,0,0.23)',
      '0px 16px 36px rgba(0,0,0,0.26)',
      '0px 18px 40px rgba(0,0,0,0.29)',
      '0px 20px 44px rgba(0,0,0,0.32)',
      '0px 22px 48px rgba(0,0,0,0.35)',
      '0px 24px 52px rgba(0,0,0,0.38)',
      '0px 26px 56px rgba(0,0,0,0.41)',
      '0px 28px 60px rgba(0,0,0,0.44)',
      '0px 30px 64px rgba(0,0,0,0.47)',
      '0px 32px 68px rgba(0,0,0,0.50)',
      '0px 34px 72px rgba(0,0,0,0.53)',
      '0px 36px 76px rgba(0,0,0,0.56)',
      '0px 38px 80px rgba(0,0,0,0.59)',
      '0px 40px 84px rgba(0,0,0,0.62)',
      '0px 42px 88px rgba(0,0,0,0.65)',
      '0px 44px 92px rgba(0,0,0,0.68)',
      '0px 46px 96px rgba(0,0,0,0.71)'
    ]
  });

  // Detectar si estamos en un dispositivo móvil
  // eslint-disable-next-line no-unused-vars
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDrawerMinimize = () => {
    setIsDrawerMinimized(!isDrawerMinimized);
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = authService.isAuthenticated();
      setIsAuthenticated(isAuth);
      
      // Si está autenticado, verificar el token
      if (isAuth) {
        authService.verifyToken()
          .catch(() => {
            // Si hay error de verificación, eliminar token y redirigir a login
            setIsAuthenticated(false);
            window.location.href = '/login';
          });
      }
    };

    checkAuth();
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);
  
  // Efecto para cargar la configuración desde localStorage
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = JSON.parse(localStorage.getItem('appSettings'));
        if (savedSettings) {
          if (savedSettings.darkMode !== undefined) setDarkMode(savedSettings.darkMode);
          if (savedSettings.language !== undefined) {
            setLanguage(savedSettings.language);
            // Forzar el cambio de idioma
            i18n.changeLanguage(savedSettings.language || 'es');
          } else {
            // Si no hay idioma guardado, usar español
            i18n.changeLanguage('es');
          }
          if (savedSettings.currency !== undefined) setCurrency(savedSettings.currency);
        } else {
          // Si no hay configuración guardada, usar español
          i18n.changeLanguage('es');
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error);
        // En caso de error, usar español
        i18n.changeLanguage('es');
      }
    };
    
    // Cargar configuración inicial
    loadSettings();
    
    // Escuchar cambios en la configuración
    const handleSettingsChanged = (event) => {
      const { setting, value } = event.detail;
      
      switch (setting) {
        case 'darkMode':
          setDarkMode(value);
          break;
        case 'language':
          setLanguage(value);
          // Forzar el cambio de idioma
          i18n.changeLanguage(value || 'es');
          break;
        case 'currency':
          setCurrency(value);
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('settingsChanged', handleSettingsChanged);
    
    return () => {
      window.removeEventListener('settingsChanged', handleSettingsChanged);
    };
  }, []);

  const PrivateRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return (
      <ThemeAwareAppLayout
        drawerWidth={drawerWidth}
        minimizedDrawerWidth={minimizedDrawerWidth}
        isDrawerMinimized={isDrawerMinimized}
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        handleDrawerMinimize={handleDrawerMinimize}
        handleLogout={handleLogout}
        darkMode={darkMode}
        t={t}
      >
        {children}
      </ThemeAwareAppLayout>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationRemover />
      <NotificationButtonRemover />
      <AuthProvider>
        <CurrencyProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
              <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/personal-expenses" element={<PrivateRoute><PersonalExpenses /></PrivateRoute>} />
              <Route path="/personal" element={<PrivateRoute><PersonalExpenses /></PrivateRoute>} />
              <Route path="/shared-sessions" element={<PrivateRoute><SharedSessions /></PrivateRoute>} />
              <Route path="/shared" element={<PrivateRoute><SharedSessions /></PrivateRoute>} />
              <Route path="/reports" element={<PrivateRoute><ReportsDashboard /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
              <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
            </Routes>
          </Router>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App; 