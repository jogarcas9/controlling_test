import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme, useMediaQuery } from '@mui/material';
import { i18n } from '../../i18n';
import { authService } from '../../services/authService';

const Settings = () => {
  const { t = key => key } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    darkMode: false,
    language: 'es',
    currency: 'EUR'
  });
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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

  // Estado para el diálogo de cambio de contraseña
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

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [openSnackbar, setOpenSnackbar] = useState(false);
  
  // Referencia para prevenir solicitudes excesivas y actualizaciones de estado
  const isLoadingDataRef = useRef(false);
  const hasLoadedDataRef = useRef(false);
  
  // Efecto simplificado para manejar el parámetro tab de la URL
  useEffect(() => {
    // Comprobar si hay un parámetro en la URL para cambiar a la pestaña de perfil
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    
    if (tab === 'profile' && activeTab !== 1) {
      setActiveTab(1);
    } else if (!tab && activeTab !== 0) {
      setActiveTab(0);
    }
  }, [location.search, activeTab]);
  
  // Simplificar los event listeners
  useEffect(() => {
    const handleSwitchToProfileTab = () => {
      setActiveTab(1);
    };
    
    const handleSwitchToGeneralTab = () => {
      setActiveTab(0);
    };
    
    window.addEventListener('switchToProfileTab', handleSwitchToProfileTab);
    window.addEventListener('switchToGeneralTab', handleSwitchToGeneralTab);
    
    return () => {
      window.removeEventListener('switchToProfileTab', handleSwitchToProfileTab);
      window.removeEventListener('switchToGeneralTab', handleSwitchToGeneralTab);
    };
  }, []);
  
  // Efecto simplificado para cargar datos
  useEffect(() => {
    const loadUserData = async () => {
      // Evitar cargar datos múltiples veces
      if (isLoadingDataRef.current || hasLoadedDataRef.current) {
        return;
      }
      
      isLoadingDataRef.current = true;
      setLoading(true);
      setProfileLoading(true);
      
      try {
        // Cargar datos del usuario localmente
        let userObject = null;
        
        try {
          const userRaw = localStorage.getItem('user');
          if (userRaw) {
            userObject = JSON.parse(userRaw);
          }
        } catch (e) {
          console.error('Error parsing stored user data:', e);
        }
        
        // Intentar cargar desde el servicio de autenticación solo si es necesario y no tenemos datos locales
        let authUser = null;
        if (!userObject) {
          try {
            authUser = await authService.getCurrentUser();
          } catch (e) {
            console.error('Error loading user from auth service:', e);
          }
        }
        
        // Usar los datos disponibles
        const user = authUser || userObject || {};
        
        // Actualizar configuración
        setSettings({
          darkMode: user.settings?.darkMode !== undefined ? user.settings.darkMode : false,
          language: user.settings?.language || 'es',
          currency: user.settings?.currency || 'EUR',
          notifications: user.settings?.notifications !== undefined ? user.settings.notifications : false
        });
        
        // Actualizar idioma si es necesario
        if (user.settings?.language) {
          i18n.changeLanguage(user.settings.language);
        }
        
        // Determinar nombre y apellido
        let firstName = '';
        let lastName = '';
        
        if (user.name) {
          firstName = user.name;
          lastName = user.last_name || '';
        } else if (localStorage.getItem('userName')) {
          const fullName = localStorage.getItem('userName').split(' ');
          firstName = fullName[0] || '';
          lastName = fullName.slice(1).join(' ') || '';
        } else if (user.firstName) {
          firstName = user.firstName;
          lastName = user.lastName || '';
        } else if (user.nombre) {
          firstName = user.nombre;
          lastName = user.apellidos || '';
        } else {
          firstName = 'Usuario';
          lastName = '';
        }
        
        // Determinar fecha de creación
        let createdAt = user.fecha;
        if (!createdAt) {
          if (user.createdAt) createdAt = user.createdAt;
          else if (user.created_at) createdAt = user.created_at;
          else if (user.fechaRegistro) createdAt = user.fechaRegistro;
          else createdAt = new Date().toISOString();
        }
        
        // Actualizar perfil
        const profile = {
          firstName,
          lastName,
          email: user.email || '',
          createdAt,
          id: user._id || user.id || ''
        };
        
        setUserProfile(profile);
        setEditedProfile({
          firstName: profile.firstName,
          lastName: profile.lastName
        });
        
        // Marcar que ya hemos cargado los datos
        hasLoadedDataRef.current = true;
      } catch (error) {
        console.error('Error loading user data:', error);
        showMessage('error', 'Error al cargar datos de usuario');
      } finally {
        setLoading(false);
        setProfileLoading(false);
        isLoadingDataRef.current = false;
      }
    };
    
    loadUserData();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    
    // Usar un enfoque más simple para cambiar la URL
    if (newValue === 1) {
      navigate('/settings?tab=profile', { replace: true });
    } else {
      navigate('/settings', { replace: true });
    }
  };
  
  // Simplificar formatDate para que sea más eficiente
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha no válida';
      
      return date.toLocaleDateString(settings.language || 'es', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric'
      });
    } catch (error) {
      return 'Error en formato de fecha';
    }
  };
  
  // ... resto del código existente ...

  return (
    // ... render code ...
  );
};

export default Settings; 