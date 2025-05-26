import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
  Select,
  MenuItem,
  FormControl,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  DarkMode as DarkModeIcon,
  Language as LanguageIcon,
  MonetizationOn as MonetizationOnIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Edit as EditIcon,
  PhoneIphone as PhoneIphoneIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import i18n from '../../i18n';
import authService from '../../services/authService';
import settingsManager from '../../utils/settingsManager';
import { useLocation, useNavigate } from 'react-router-dom';

const currencies = [
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dólar EE.UU ($)' },
  { value: 'MXN', label: 'Peso Mexicano ($)' },
  { value: 'GBP', label: 'Libra Esterlina (£)' },
  { value: 'JPY', label: 'Yen Japonés (¥)' }
];

const languages = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' }
];

const Settings = () => {
  // Referencias para evitar múltiples renderizados y controlar el ciclo de vida
  const isInitializedRef = useRef(false);  // Nueva referencia para marcar una sola inicialización
  const isDataLoadedRef = useRef(false);
  const isLoadingDataRef = useRef(false);
  const isMountedRef = useRef(true);
  const initialLoadTimeoutRef = useRef(null); // Para limpiar timeouts
  
  // Extraer funciones y hooks necesarios
  const { t = key => key } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [openSnackbar, setOpenSnackbar] = useState(false);
  
  // Configuraciones
  const [settings, setSettings] = useState(() => {
    // Intentar cargar desde localStorage directamente durante inicialización
    try {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    } catch (e) {
      console.error('Error al cargar configuración inicial:', e);
    }
    
    // Valores predeterminados
    return {
      darkMode: false,
      language: 'es',
      currency: 'EUR',
      notifications: false
    };
  });
  
  // Estados para el perfil y la edición
  const [userProfile, setUserProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    createdAt: '',
    avatar: ''
  });
  
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    firstName: '',
    lastName: ''
  });

  // Estados para el diálogo de cambio de contraseña
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Función segura para actualizar estado solo si el componente está montado
  const safeSetState = (setter, value) => {
    if (isMountedRef.current) {
      setter(value);
    }
  };
  
  // Efecto de limpieza durante desmontaje
  useEffect(() => {
    // Marcar como montado
    isMountedRef.current = true;
    
    // Limpiar todo al desmontar
    return () => {
      console.log('Limpiando recursos en Settings...');
      isMountedRef.current = false;
      
      // Limpiar todos los timeouts posibles
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
        initialLoadTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Efecto unificado para la carga inicial de datos
  // Este efecto se ejecuta solo UNA VEZ al montar el componente
  useEffect(() => {
    // Si ya está inicializado, no hacer nada
    if (isInitializedRef.current) {
      return;
    }
    
    // Marcar como inicializado para evitar ejecuciones múltiples
    isInitializedRef.current = true;
    
    // Función para cargar los datos iniciales
    const loadInitialData = async () => {
      console.log('Inicio de carga inicial de datos en Settings');
      
      try {
        // Evitar cargas duplicadas
        if (isDataLoadedRef.current || isLoadingDataRef.current) {
          return;
        }
        
        // Marcar como cargando
        isLoadingDataRef.current = true;
        safeSetState(setLoading, true);
        
        // Establecer un timeout de seguridad
        initialLoadTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          
          console.warn('Timeout de carga forzando finalización');
          isLoadingDataRef.current = false;
          isDataLoadedRef.current = true;
          safeSetState(setLoading, false);
          safeSetState(setProfileLoading, false);
        }, 5000);
        
        // Cargar configuración desde localStorage
        try {
          const userSettings = settingsManager.loadSettings();
          safeSetState(setSettings, userSettings);
          
          // Establecer idioma solo si es necesario
          if (userSettings.language && userSettings.language !== i18n.language) {
            i18n.changeLanguage(userSettings.language);
          }
        } catch (error) {
          console.error('Error en loadUserSettings:', error);
        }
        
        // Siempre cargar los datos del perfil para tenerlos disponibles
        // independientemente de qué pestaña esté activa
        safeSetState(setProfileLoading, true);
        console.log('Intentando cargar datos del usuario...');
        
        // Siempre intentamos obtener datos actualizados del servidor primero
        try {
          const user = await authService.getCurrentUser();
          
          if (user && isMountedRef.current) {
            console.log('Datos de usuario obtenidos del servidor:', user);
            console.log('Fecha directa del usuario:', user.fecha);
            
            // Actualizar el perfil con los datos recibidos
            const createdAtValue = user.fecha || user.createdAt || user.created_at || new Date().toISOString();
            
            console.log('Fecha obtenida del servidor:', createdAtValue, 'desde campo:', user.fecha ? 'fecha' : (user.createdAt ? 'createdAt' : 'otro'));
            
            // Usar la fecha sin manipulación
            safeSetState(setUserProfile, {
              firstName: user.name || user.nombre || '',
              lastName: user.last_name || user.apellidos || '',
              email: user.email || '',
              createdAt: createdAtValue,
              avatar: user.avatar || ''
            });
            
            console.log('Fecha asignada a userProfile:', createdAtValue);
            
            // También actualizar el estado editado para tener los mismos valores
            safeSetState(setEditedProfile, {
              firstName: user.name || user.nombre || '',
              lastName: user.last_name || user.apellidos || ''
            });
            
            console.log('Datos de perfil cargados correctamente del servidor');
          } else {
            // Si no hay datos del servidor, intentar desde localStorage
            console.log('No se obtuvieron datos del usuario del servidor, intentando localStorage');
            const storedUser = localStorage.getItem('user');
            
            if (storedUser && isMountedRef.current) {
              try {
                const userData = JSON.parse(storedUser);
                console.log('Datos de usuario encontrados en localStorage:', userData);
                
                // Usar la fecha sin manipulación
                const createdAtValue = userData.fecha || userData.createdAt || userData.created_at || new Date().toISOString();
                console.log('Fecha obtenida de localStorage:', createdAtValue, 'desde campo:', userData.fecha ? 'fecha' : (userData.createdAt ? 'createdAt' : 'otro'));
                
                safeSetState(setUserProfile, {
                  firstName: userData.name || userData.nombre || '',
                  lastName: userData.last_name || userData.apellidos || '',
                  email: userData.email || '',
                  createdAt: createdAtValue,
                  avatar: userData.avatar || ''
                });
                
                safeSetState(setEditedProfile, {
                  firstName: userData.name || userData.nombre || '',
                  lastName: userData.last_name || userData.apellidos || ''
                });
                
                console.log('Datos de perfil cargados desde localStorage');
              } catch (error) {
                console.error('Error al parsear datos del usuario en localStorage:', error);
              }
            } else {
              console.warn('No se pudieron obtener datos del usuario ni del servidor ni de localStorage');
            }
          }
        } catch (error) {
          console.error('Error al obtener datos del usuario:', error);
          
          // Intentar como fallback desde localStorage
          try {
            const storedUser = localStorage.getItem('user');
            if (storedUser && isMountedRef.current) {
              const userData = JSON.parse(storedUser);
              
              // Usar la fecha sin manipulación
              const createdAtValue = userData.fecha || userData.createdAt || userData.created_at || new Date().toISOString();
              console.log('Fecha obtenida de localStorage:', createdAtValue, 'desde campo:', userData.fecha ? 'fecha' : (userData.createdAt ? 'createdAt' : 'otro'));
              
              safeSetState(setUserProfile, {
                firstName: userData.name || userData.nombre || '',
                lastName: userData.last_name || userData.apellidos || '',
                email: userData.email || '',
                createdAt: createdAtValue,
                avatar: userData.avatar || ''
              });
              
              safeSetState(setEditedProfile, {
                firstName: userData.name || userData.nombre || '',
                lastName: userData.last_name || userData.apellidos || ''
              });
              
              console.log('Datos de perfil cargados desde localStorage (fallback)');
            }
          } catch (e) {
            console.error('Error en fallback de localStorage:', e);
          }
        } finally {
          if (isMountedRef.current) {
            safeSetState(setProfileLoading, false);
          }
        }
        
        // Marcar como cargado completamente
        isDataLoadedRef.current = true;
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
      } finally {
        // Limpiar timeout
        if (initialLoadTimeoutRef.current) {
          clearTimeout(initialLoadTimeoutRef.current);
          initialLoadTimeoutRef.current = null;
        }
        
        // Restablecer estado de carga
        if (isMountedRef.current) {
          isLoadingDataRef.current = false;
          safeSetState(setLoading, false);
        }
      }
    };
    
    // Ejecutar la carga inicial
    loadInitialData();
    
    // Este efecto nunca debe volver a ejecutarse
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const showMessage = (type, text) => {
    if (!isMountedRef.current) return;
    safeSetState(setMessage, { type, text });
    safeSetState(setOpenSnackbar, true);
  };

  const handleCloseSnackbar = () => {
    if (!isMountedRef.current) return;
    safeSetState(setOpenSnackbar, false);
  };

  const handleSettingChange = (setting, value) => {
    if (!isMountedRef.current) return;
    
    try {
      // Evitar actualizaciones si el valor no ha cambiado
      if (settings[setting] === value) {
        return;
      }
      
      // Actualizar estado local para UI inmediata
      safeSetState(setSettings, prev => ({
        ...prev,
        [setting]: value
      }));
      
      // Usar el administrador para manejar todo el proceso (almacenamiento y eventos)
      settingsManager.updateSetting(setting, value);
      
      // Mostrar mensaje de éxito
      showMessage('success', t('settingsUpdated'));
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      showMessage('error', t('errorUpdatingSettings'));
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    console.log('Formateando fecha:', dateString);
    
    try {
      // Intentar convertir la fecha a un objeto Date
      const date = new Date(dateString);
      
      console.log('Fecha convertida a objeto Date:', date);
      
      // Comprobar si es una fecha válida
      if (isNaN(date.getTime())) {
        console.warn('Fecha inválida:', dateString);
        return '-';
      }
      
      // Configurar opciones de formato usando la configuración regional
      const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      
      // Usar el idioma actual o español como fallback
      return date.toLocaleDateString(settings.language || 'es', options);
    } catch (error) {
      console.error('Error al formatear fecha:', error, 'Fecha original:', dateString);
      return '-';
    }
  };
  
  const handleEditProfile = () => {
    if (!isMountedRef.current) return;
    
    // Garantizar que el perfil editado tenga los valores actuales
    safeSetState(setEditedProfile, {
      firstName: userProfile.firstName || '',
      lastName: userProfile.lastName || ''
    });
    safeSetState(setEditMode, true);
  };
  
  const handleCancelEdit = () => {
    if (!isMountedRef.current) return;
    
    // Restaurar los valores originales
    safeSetState(setEditedProfile, {
      firstName: userProfile.firstName || '',
      lastName: userProfile.lastName || ''
    });
    safeSetState(setEditMode, false);
  };
  
  const handleInputChange = (e) => {
    if (!isMountedRef.current) return;
    
    const { name, value } = e.target;
    safeSetState(setEditedProfile, prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSaveProfile = async () => {
    if (!isMountedRef.current) return;
    
    try {
      safeSetState(setLoading, true);
      console.log('Guardando perfil con datos:', editedProfile);
      
      // Verificar que los campos no estén vacíos
      const firstName = editedProfile.firstName?.trim() || '';
      const lastName = editedProfile.lastName?.trim() || '';
      
      if (!firstName) {
        showMessage('error', 'El nombre no puede estar vacío');
        return;
      }
      
      // Preparar los datos del perfil
      const profileData = {
        name: firstName,
        last_name: lastName
      };
      
      console.log('Enviando datos de perfil al servidor:', profileData);
      
      // Usar el servicio de autenticación para actualizar el perfil
      const response = await authService.updateProfile(profileData);
      
      if (!isMountedRef.current) return; // Verificar si el componente sigue montado
      
      console.log('Respuesta del servidor:', response);
      
      // Actualizar el estado local con los datos recibidos
      if (response && response.user) {
        // Datos recibidos del servidor
        safeSetState(setUserProfile, prev => ({
          ...prev,
          firstName: response.user.name || firstName,
          lastName: response.user.last_name || lastName
        }));
        console.log('Perfil actualizado con datos del servidor');
      } else {
        // Si no hay respuesta del servidor, actualizar con los datos editados localmente
        safeSetState(setUserProfile, prev => ({
          ...prev,
          firstName,
          lastName
        }));
        console.log('Perfil actualizado localmente');
      }
      
      // También actualizar localStorage para mantener consistencia
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userObj = JSON.parse(userStr);
          userObj.name = firstName;
          userObj.last_name = lastName;
          localStorage.setItem('user', JSON.stringify(userObj));
          
          // Actualizar también el nombre de usuario para mostrar
          const displayName = `${firstName} ${lastName}`.trim();
          localStorage.setItem('userName', displayName);
          
          // Actualizar los datos en el authService para mantener todo sincronizado
          if (authService.user) {
            authService.user.name = firstName;
            authService.user.last_name = lastName;
          }
          
          console.log('Datos locales actualizados correctamente');
        }
      } catch (e) {
        console.error('Error al actualizar datos locales:', e);
      }
      
      safeSetState(setEditMode, false);
      showMessage('success', t('profileUpdated'));
      
      // Forzar actualización de la interfaz
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error al actualizar perfil:', error);
      showMessage('error', error.response?.data?.message || t('errorUpdatingProfile'));
    } finally {
      if (isMountedRef.current) {
        safeSetState(setLoading, false);
      }
    }
  };

  const handleOpenPasswordDialog = () => {
    if (!isMountedRef.current) return;
    
    safeSetState(setOpenPasswordDialog, true);
    safeSetState(setPasswordData, {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    safeSetState(setPasswordError, '');
  };

  const handleClosePasswordDialog = () => {
    if (!isMountedRef.current) return;
    safeSetState(setOpenPasswordDialog, false);
  };

  const handlePasswordChange = (e) => {
    if (!isMountedRef.current) return;
    
    const { name, value } = e.target;
    safeSetState(setPasswordData, prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error cuando se modifica cualquier campo
    if (passwordError) safeSetState(setPasswordError, '');
  };

  const togglePasswordVisibility = (field) => {
    if (!isMountedRef.current) return;
    
    safeSetState(setShowPassword, prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSavePassword = async () => {
    if (!isMountedRef.current) return;
    
    // Validar que la nueva contraseña y la confirmación coincidan
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      safeSetState(setPasswordError, 'Las contraseñas no coinciden');
      return;
    }
    
    // Validar longitud mínima
    if (passwordData.newPassword.length < 6) {
      safeSetState(setPasswordError, 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    safeSetState(setPasswordLoading, true);
    
    try {
      // Llamar al servicio de autenticación para cambiar la contraseña
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      // Verificar si el componente sigue montado después de la operación asíncrona
      if (!isMountedRef.current) return;
      
      // Cerrar el diálogo y mostrar mensaje de éxito
      handleClosePasswordDialog();
      showMessage('success', 'Contraseña actualizada correctamente');
    } catch (error) {
      // Verificar si el componente sigue montado
      if (!isMountedRef.current) return;
      
      console.error('Error al cambiar contraseña:', error);
      safeSetState(setPasswordError,
        error.response?.data?.message || 
        'Error al cambiar la contraseña. Por favor, inténtalo de nuevo.'
      );
    } finally {
      if (isMountedRef.current) {
        safeSetState(setPasswordLoading, false);
      }
    }
  };

  // Función para asegurar que se muestra la fecha correcta
  const getCorrectDate = () => {
    // Si hay un usuario en localStorage, verificar que tenga la fecha correcta
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        
        // Datos para debugging
        console.log('Datos del usuario en getCorrectDate:', {
          fecha: userData.fecha,
          createdAt: userData.createdAt,
          created_at: userData.created_at,
          fecha_settings: userData.settings?.fecha
        });
        
        // Priorizar fecha, utilizando cualquiera que esté disponible
        let correctDate = userData.fecha;
        if (!correctDate) {
          if (userData.createdAt) correctDate = userData.createdAt;
          else if (userData.created_at) correctDate = userData.created_at;
          else if (userData.settings?.fecha) correctDate = userData.settings.fecha;
        }
        
        console.log('Fecha correcta utilizada:', correctDate);
        
        if (correctDate) {
          return correctDate;
        }
      }
    } catch (e) {
      console.error('Error al obtener fecha correcta:', e);
    }
    
    return userProfile.createdAt;
  };
  
  // Efecto para forzar la actualización de la fecha al cargar el componente
  useEffect(() => {
    // Llamamos a getCorrectDate para asegurar que se actualice al montar
    getCorrectDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Añadimos un efecto adicional para forzar la actualización de la fecha
  useEffect(() => {
    // Intentar obtener la fecha directamente del localStorage
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        
        // Determinar fecha usando una prioridad clara
        const correctDate = userData.fecha || userData.createdAt || userData.created_at;
        
        if (correctDate) {
          console.log('Forzando fecha de registro correcta:', correctDate);
          
          // Actualizar directamente el DOM para mostrar la fecha
          const registerDateElements = document.querySelectorAll('.register-date');
          if (registerDateElements && registerDateElements.length > 0) {
            const formattedDate = formatDate(correctDate);
            registerDateElements.forEach(element => {
              element.textContent = formattedDate;
            });
          }
        }
      }
    } catch (e) {
      console.error('Error al forzar la fecha de registro:', e);
    }
  }, []);

  // Función para actualizar las fechas manualmente
  const updateDateDisplay = () => {
    setTimeout(() => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          const correctDate = userData.fecha || userData.createdAt || userData.created_at;
          
          if (correctDate) {
            console.log('Actualizando manualmente fecha de registro:', correctDate);
            const formattedDate = formatDate(correctDate);
            
            // Intentar actualizar directamente los elementos DOM
            const registerDateElements = document.querySelectorAll('.register-date');
            registerDateElements.forEach(el => {
              // Solo actualizar si contiene la palabra "miembro" o "registro"
              const text = el.textContent.toLowerCase();
              if (text.includes('miembro') || text.includes('registro')) {
                // Si el texto ya incluye la fecha formateada, no es necesario actualizar
                if (!text.includes(formattedDate)) {
                  const prefix = text.split(':')[0];
                  el.textContent = `${prefix}: ${formattedDate}`;
                }
              }
            });
          }
        }
      } catch (e) {
        console.error('Error al actualizar manualmente las fechas:', e);
      }
    }, 1000); // Retrasar un segundo para asegurar que el DOM está listo
  };
  
  // Llamar a la función después de que el componente se monte
  useEffect(() => {
    updateDateDisplay();
  }, []); // Ejecutar cuando cambie la pestaña activa

  if (loading && !editMode) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="200px"
        sx={{ p: 2 }}
      >
        <CircularProgress size={32} />
      </Box>
    );
  }
  
  return (
    <Container 
      maxWidth={false} 
      disableGutters 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        py: { xs: 1, sm: 2 },
        px: 0
      }}
    >
      <Box sx={{ 
        px: { xs: 1, sm: 1.5 }, 
        width: '100%',
        mb: { xs: 7, sm: 0 }
      }}>
        <Typography 
          variant="h5" 
          gutterBottom 
          className="page-title"
          sx={{ px: 2, py: 1 }}
        >
          {t('settings')}
        </Typography>
        
        {/* SECCIÓN DE PERFIL - AHORA PRIMERA */}
        <Paper elevation={0} sx={{ borderRadius: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
            {t('profile')}
          </Typography>
          
          {profileLoading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3} sx={{ px: 2, pb: 2 }}>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mb: { xs: 2, md: 0 } }}>
                  <Avatar 
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      mb: 2,
                      bgcolor: 'primary.main',
                      fontSize: '2.5rem'
                    }}
                  >
                    {userProfile.firstName ? userProfile.firstName.charAt(0).toUpperCase() : '?'}
                  </Avatar>
                  
                  <Typography variant="h6" gutterBottom>
                    {userProfile.firstName || ''} {userProfile.lastName || ''}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {userProfile.email || ''}
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary" className="register-date">
                    {t('memberSince')} {(() => {
                      const dateToShow = getCorrectDate();
                      return formatDate(dateToShow);
                    })()}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={8}>
                <Box sx={{ mt: { xs: 0, md: 0 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle1">
                      <PersonIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                      {t('personalInfo')}
                    </Typography>
                    
                    {!editMode && (
                      <Button 
                        startIcon={<EditIcon />} 
                        onClick={handleEditProfile}
                        variant="outlined"
                        size="small"
                      >
                        {t('edit')}
                      </Button>
                    )}
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {editMode ? (
                    <Box component="form">
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            name="firstName"
                            label={t('firstName')}
                            fullWidth
                            value={editedProfile.firstName || ''}
                            onChange={handleInputChange}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            name="lastName"
                            label={t('lastName')}
                            fullWidth
                            value={editedProfile.lastName || ''}
                            onChange={handleInputChange}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            label={t('email')}
                            fullWidth
                            value={userProfile.email || ''}
                            disabled
                            helperText={t('emailDesc')}
                          />
                        </Grid>
                        <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button 
                            onClick={handleCancelEdit}
                            sx={{ mr: 1 }}
                            disabled={loading}
                          >
                            {t('cancel')}
                          </Button>
                          <Button 
                            variant="contained" 
                            onClick={handleSaveProfile}
                            disabled={loading}
                          >
                            {loading ? <CircularProgress size={24} /> : t('save')}
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>
                  ) : (
                    <Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {t('firstName')}
                          </Typography>
                          <Typography variant="body1" gutterBottom>
                            {userProfile.firstName || '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {t('lastName')}
                          </Typography>
                          <Typography variant="body1" gutterBottom>
                            {userProfile.lastName || '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {t('email')}
                          </Typography>
                          <Typography variant="body1" gutterBottom>
                            {userProfile.email || '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {t('registerDate')}
                          </Typography>
                          <Typography variant="body1" className="register-date">
                            {(() => {
                              const dateToShow = getCorrectDate();
                              return formatDate(dateToShow);
                            })()}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </Paper>
        
        {/* SECCIÓN DE SEGURIDAD */}
        <Paper elevation={0} sx={{ borderRadius: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
            {t('security')}
          </Typography>
          
          <Box sx={{ p: 2 }}>
            <Button 
              variant="outlined"
              color="primary"
              sx={{ mr: 2 }}
              onClick={handleOpenPasswordDialog}
            >
              {t('changePassword')}
            </Button>
          </Box>
        </Paper>
        
        {/* SECCIÓN GENERAL - AHORA AL FINAL */}
        <Paper elevation={0} sx={{ borderRadius: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
            {t('general')}
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <DarkModeIcon />
              </ListItemIcon>
              <ListItemText 
                primary={t('darkMode')} 
                secondary={isMobile ? null : t('darkModeDesc')}
              />
              <ListItemSecondaryAction>
                <Switch
                  edge="end"
                  checked={settings.darkMode}
                  onChange={() => handleSettingChange('darkMode', !settings.darkMode)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            <Divider component="li" />
            
            <ListItem sx={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: isMobile ? '100%' : 'auto', mb: isMobile ? 1 : 0 }}>
                <ListItemIcon>
                  <LanguageIcon />
                </ListItemIcon>
                <ListItemText 
                  primary={t('language')} 
                  secondary={isMobile ? null : t('languageDesc')}
                />
              </Box>
              {isMobile ? (
                <FormControl variant="outlined" fullWidth sx={{ pl: 9 }}>
                  <Select
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                    displayEmpty
                    size="small"
                  >
                    {languages.map((lang) => (
                      <MenuItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <ListItemSecondaryAction>
                  <FormControl variant="standard" sx={{ minWidth: 120 }}>
                    <Select
                      value={settings.language}
                      onChange={(e) => handleSettingChange('language', e.target.value)}
                      displayEmpty
                    >
                      {languages.map((lang) => (
                        <MenuItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </ListItemSecondaryAction>
              )}
            </ListItem>
            
            <Divider component="li" />
            
            <ListItem sx={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: isMobile ? '100%' : 'auto', mb: isMobile ? 1 : 0 }}>
                <ListItemIcon>
                  <MonetizationOnIcon />
                </ListItemIcon>
                <ListItemText 
                  primary={t('currency')} 
                  secondary={isMobile ? null : t('currencyDesc')}
                />
              </Box>
              {isMobile ? (
                <FormControl variant="outlined" fullWidth sx={{ pl: 9 }}>
                  <Select
                    value={settings.currency}
                    onChange={(e) => handleSettingChange('currency', e.target.value)}
                    displayEmpty
                    size="small"
                  >
                    {currencies.map((currency) => (
                      <MenuItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <ListItemSecondaryAction>
                  <FormControl variant="standard" sx={{ minWidth: 150 }}>
                    <Select
                      value={settings.currency}
                      onChange={(e) => handleSettingChange('currency', e.target.value)}
                      displayEmpty
                    >
                      {currencies.map((currency) => (
                        <MenuItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </ListItemSecondaryAction>
              )}
            </ListItem>
            
            <Divider component="li" />
            
            <ListItem button component="a" href="/pwa-status">
              <ListItemIcon>
                <PhoneIphoneIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Estado PWA" 
                secondary={isMobile ? null : "Verificar el estado de la Progressive Web App"}
              />
            </ListItem>
          </List>
        </Paper>
        
        <Dialog 
          open={openPasswordDialog} 
          onClose={handleClosePasswordDialog}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Cambiar Contraseña</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Para cambiar tu contraseña, introduce tu contraseña actual y la nueva contraseña.
            </DialogContentText>
            
            {passwordError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {passwordError}
              </Alert>
            )}
            
            <TextField
              margin="dense"
              label="Contraseña actual"
              type={showPassword.current ? "text" : "password"}
              fullWidth
              variant="outlined"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('current')}
                      edge="end"
                    >
                      {showPassword.current ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              margin="dense"
              label="Nueva contraseña"
              type={showPassword.new ? "text" : "password"}
              fullWidth
              variant="outlined"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('new')}
                      edge="end"
                    >
                      {showPassword.new ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              margin="dense"
              label="Confirmar nueva contraseña"
              type={showPassword.confirm ? "text" : "password"}
              fullWidth
              variant="outlined"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => togglePasswordVisibility('confirm')}
                      edge="end"
                    >
                      {showPassword.confirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleClosePasswordDialog} disabled={passwordLoading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSavePassword} 
              variant="contained" 
              disabled={
                passwordLoading || 
                !passwordData.currentPassword || 
                !passwordData.newPassword || 
                !passwordData.confirmPassword
              }
            >
              {passwordLoading ? <CircularProgress size={24} /> : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
        
        <Snackbar 
          open={openSnackbar} 
          autoHideDuration={6000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={message.type} sx={{ width: '100%' }}>
            {message.text}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
};

export default Settings; 