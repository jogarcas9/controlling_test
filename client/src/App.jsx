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
  useTheme,
  Snackbar,
  Alert,
} from '@mui/material';
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
import InstallPWA from './components/layout/InstallPWA';
import ReportsDashboard from './components/reports/ReportsDashboard';
import PWAInstallPrompt from './components/shared/PWAInstallPrompt';
import { AuthProvider } from './context/AuthContext';
import authService from './services/authService';
import { checkServiceWorkers } from './utils/checkServiceWorkers';
import socketService from './services/socketService';

// Crear un contexto para el estado de la conexión en tiempo real
export const RealTimeContext = React.createContext({
  isConnected: false,
  lastUpdate: null,
  reconnect: () => {},
  showNotification: () => {},
});

// Componente de Layout principal que contiene el sidebar y el área de contenido
const AppLayout = ({ 
  children, 
  drawerWidth, 
  minimizedDrawerWidth,
  isDrawerMinimized,
  mobileOpen,
  handleDrawerToggle,
  handleDrawerMinimize,
  handleLogout,
  _darkMode: darkMode,
  _t: t,
  theme
}) => {
  const _location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  
  // Calculamos el ancho efectivo del drawer basado en el dispositivo
  const effectiveDrawerWidth = isMobile ? 0 : 
                               isTablet ? (isDrawerMinimized ? minimizedDrawerWidth : 100) : 
                               isDrawerMinimized ? minimizedDrawerWidth : drawerWidth;

  return (
    <Box sx={{ 
      display: 'flex',
      minHeight: '100vh',
      bgcolor: 'background.default',
      flexDirection: { xs: 'column', sm: 'row' },
    }}>
      <CssBaseline />
      <Box
        component="nav"
        sx={{
          width: { xs: drawerWidth, sm: isDrawerMinimized ? minimizedDrawerWidth : drawerWidth },
          flexShrink: { sm: 0 },
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 1200,
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
              boxShadow: theme.shadows[8],
            },
          }}
        >
          <Sidebar 
            mobileOpen={mobileOpen} 
            handleDrawerToggle={handleDrawerToggle} 
            isMinimized={false}
            onMinimizeToggle={handleDrawerMinimize}
            handleLogout={handleLogout}
            isMobile={true}
          />
        </Drawer>

        {/* Menú lateral para tablets y escritorio combinado */}
        <Drawer
          variant={(isMobile || isTablet) ? "temporary" : "permanent"}
          open={(isMobile || isTablet) ? mobileOpen : true}
          onClose={(isMobile || isTablet) ? handleDrawerToggle : undefined}
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: isDrawerMinimized ? minimizedDrawerWidth : (isTablet ? 100 : drawerWidth),
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              boxShadow: isTablet ? theme.shadows[3] : 'none',
            },
          }}
        >
          <Sidebar 
            handleDrawerToggle={handleDrawerToggle} 
            isMinimized={isDrawerMinimized} 
            onMinimizeToggle={handleDrawerMinimize}
            handleLogout={handleLogout}
            isTablet={isTablet}
          />
        </Drawer>
      </Box>

      <Box
        component="main"
        className={(isMobile || isTablet) ? 'main-content-with-bottom-nav' : ''}
        sx={{
          flexGrow: 1,
          p: { xs: 0.25, sm: 0.5, md: 0.75 },
          width: { xs: '100%', sm: `calc(100% - ${effectiveDrawerWidth}px)` },
          ml: { xs: 0, sm: `${effectiveDrawerWidth}px` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          overflow: 'hidden',
        }}
      >
        {children}
      </Box>

      {(isMobile || isTablet) && <MobileBottomNav />}
      <InstallPWA />
    </Box>
  );
};

// Nuevo componente que obtiene el tema usando useTheme
function ThemeAwareAppLayout(props) {
  const theme = useTheme();
  return <AppLayout {...props} theme={theme} />;
}

// Prefijando con _ la función no utilizada
const _getPageTitle = (pathname, t) => {
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
  const drawerWidth = 220;
  const minimizedDrawerWidth = 70;
  
  // Estados para la configuración
  const [darkMode, setDarkMode] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [language, setLanguage] = useState('es');
  // eslint-disable-next-line no-unused-vars
  const [currency, setCurrency] = useState('EUR');

  // Estados para Socket.IO y notificaciones en tiempo real
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // Obtener funciones de traducción incondicionalmente
  const { t = key => key } = useTranslation();
  
  // Crear el tema directamente en el componente
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#6366f1',
        light: '#818cf8',
        dark: '#4f46e5',
        contrastText: '#ffffff'
      },
      secondary: {
        main: '#f43f5e',
        light: '#fb7185',
        dark: '#e11d48',
        contrastText: '#ffffff'
      },
      background: {
        default: darkMode ? '#0f172a' : '#f8fafc',
        paper: darkMode ? '#1e293b' : '#ffffff'
      },
      error: {
        main: '#ef4444',
        light: '#f87171',
        dark: '#dc2626',
        contrastText: '#ffffff'
      },
      success: {
        main: '#22c55e',
        light: '#4ade80',
        dark: '#16a34a',
        contrastText: '#ffffff'
      },
      info: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb',
        contrastText: '#ffffff'
      },
      warning: {
        main: '#f59e0b',
        light: '#fbbf24',
        dark: '#d97706',
        contrastText: '#ffffff'
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
      MuiContainer: {
        styleOverrides: {
          root: {
            paddingLeft: 0,
            paddingRight: 0,
          }
        }
      },
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
            backgroundColor: darkMode ? '#1e293b' : '#ffffff',
            borderRight: 'none',
            boxShadow: '0px 2px 4px rgba(0,0,0,0.1)'
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
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

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

  // Función para manejar cambios en la configuración
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

  // Efecto para inicialización y autenticación
  useEffect(() => {
    // Verificar autenticación al iniciar
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
    window.addEventListener('settingsChanged', handleSettingsChanged);
    
    return () => {
      window.removeEventListener('settingsChanged', handleSettingsChanged);
    };
  }, []);

  useEffect(() => {
    // Verificar service workers al iniciar la aplicación
    checkServiceWorkers().then(registrations => {
      if (registrations.length > 0) {
        console.log('Desregistrando service workers encontrados...');
        registrations.forEach(registration => {
          registration.unregister().then(success => {
            if (success) {
              console.log('Service worker desregistrado:', registration.scope);
            }
          });
        });
      }
    });

    // Desactivar notificaciones
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          navigator.serviceWorker.ready.then(registration => {
            registration.pushManager.getSubscription().then(subscription => {
              if (subscription) {
                subscription.unsubscribe();
              }
            });
          });
        }
      });
    }
  }, []);

  // Efecto para inicializar la conexión Socket.IO
  useEffect(() => {
    if (isAuthenticated) {
      const initSocket = async () => {
        try {
          const socket = await socketService.connect();
          if (socket) {
            setSocketConnected(true);
            
            // Configurar eventos
            socket.on('connect', () => setSocketConnected(true));
            socket.on('disconnect', () => setSocketConnected(false));
            
            // Evento de notificación
            socket.on('notification', (data) => {
              showNotification(data.message, data.severity || 'info');
              if (data.updateTime) {
                setLastUpdate(new Date());
              }
            });
          }
        } catch (error) {
          console.error('Error al inicializar Socket.IO:', error);
        }
      };
      
      initSocket();
    }
    
    return () => {
      // No desconectamos al salir para evitar reconexiones constantes
      // socketService.disconnect();
    };
  }, [isAuthenticated]);

  // Función para mostrar notificaciones
  const showNotification = (message, severity = 'info') => {
    setNotification({ 
      open: true, 
      message, 
      severity
    });
  };

  // Función para reconectar Socket.IO
  const reconnectSocket = async () => {
    try {
      await socketService.disconnect();
      const socket = await socketService.connect();
      if (socket) {
        setSocketConnected(true);
        showNotification('Conexión reestablecida', 'success');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al reconectar:', error);
      setSocketConnected(false);
      showNotification('Error al reconectar', 'error');
      return false;
    }
  };

  // Cerrar notificación
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // Valor del contexto de tiempo real
  const realTimeContextValue = {
    isConnected: socketConnected,
    lastUpdate,
    reconnect: reconnectSocket,
    showNotification,
  };

  // Componente para rutas privadas
  const PrivateRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <AuthProvider value={{ isAuthenticated, setIsAuthenticated }}>
      <CurrencyProvider>
        <ThemeProvider theme={theme}>
          <RealTimeContext.Provider value={{
            isConnected: socketConnected,
            lastUpdate,
            reconnect: reconnectSocket,
            showNotification
          }}>
            <Router>
              {isAuthenticated ? (
                <ThemeAwareAppLayout
                  drawerWidth={drawerWidth}
                  minimizedDrawerWidth={minimizedDrawerWidth}
                  isDrawerMinimized={isDrawerMinimized}
                  mobileOpen={mobileOpen}
                  handleDrawerToggle={handleDrawerToggle}
                  handleDrawerMinimize={handleDrawerMinimize}
                  handleLogout={handleLogout}
                  _darkMode={darkMode}
                  _t={t}
                >
                  <Routes>
                    <Route 
                      path="/" 
                      element={<Navigate to="/dashboard" replace />} 
                    />
                    <Route 
                      path="/dashboard" 
                      element={
                        <PrivateRoute>
                          <Dashboard />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/personal" 
                      element={
                        <PrivateRoute>
                          <PersonalExpenses />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/shared" 
                      element={
                        <PrivateRoute>
                          <SharedSessions />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/reports" 
                      element={
                        <PrivateRoute>
                          <ReportsDashboard />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/settings" 
                      element={
                        <PrivateRoute>
                          <Settings 
                            darkMode={darkMode} 
                            language={language}
                            currency={currency}
                            onSettingsChanged={handleSettingsChanged}
                          />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="*" 
                      element={<Navigate to="/dashboard" replace />} 
                    />
                  </Routes>
                </ThemeAwareAppLayout>
              ) : (
                <Routes>
                  <Route path="/login" element={<Login onLoginSuccess={() => setIsAuthenticated(true)} />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              )}

              {/* Componente de PWA Install Prompt */}
              <PWAInstallPrompt />

              <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={handleCloseNotification}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                <Alert 
                  onClose={handleCloseNotification} 
                  severity={notification.severity} 
                  variant="filled" 
                  sx={{ width: '100%' }}
                >
                  {notification.message}
                </Alert>
              </Snackbar>
            </Router>
          </RealTimeContext.Provider>
        </ThemeProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
};

export default App; 