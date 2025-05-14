import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Badge,
  useTheme,
  useMediaQuery,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  BarChart as ReportsIcon,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Estado para el menú contextual
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  // Referencia para la detección de pulsación larga
  const longPressTimeoutRef = useRef(null);
  const settingsButtonRef = useRef(null);
  
  // Evitar logs excesivos en producción
  const isNavigatingRef = useRef(false);

  const navigationItems = [
    { path: '/dashboard', icon: <DashboardIcon fontSize="small" />, label: t('dashboard') },
    { path: '/personal', icon: <PersonIcon fontSize="small" />, label: t('personal') },
    { path: '/shared', icon: <GroupIcon fontSize="small" />, label: t('shared') },
    { path: '/reports', icon: <ReportsIcon fontSize="small" />, label: t('reports') },
    { path: '/settings', icon: <SettingsIcon fontSize="small" />, label: t('settings') },
  ];

  // Mostrar 4 elementos en móvil, 5 en tablet
  const visibleItems = isMobile 
    ? [
        navigationItems[0], // Dashboard
        navigationItems[1], // Personal
        navigationItems[2], // Shared
        navigationItems[4], // Settings
      ]
    : navigationItems;

  // Estilos especiales para dispositivos iOS con notch o punch hole
  const navStyles = {
    position: 'fixed',
    bottom: 10, // Subimos el panel 10px para evitar que se oculte con la línea del iPhone
    left: 0,
    right: 0,
    display: { xs: 'block', sm: isTablet ? 'block' : 'none', md: 'none' },
    zIndex: 1200,
    borderRadius: '12px 12px 0 0', // Redondeamos las esquinas superiores
    boxShadow: 3,
    mx: 0,
    mb: 0,
    paddingBottom: 'env(safe-area-inset-bottom, 0px)', // Añade padding en iOS para evitar la home bar
  };

  // Estilos para el fondo blanco debajo del panel
  const bgStyles = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 'calc(10px + env(safe-area-inset-bottom, 0px))', // Altura correspondiente al espacio debajo del panel
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#ffffff',
    zIndex: 1199, // Justo debajo del panel para que no tape los elementos
    display: { xs: 'block', sm: isTablet ? 'block' : 'none', md: 'none' },
  };

  // Función simplificada para manejar la navegación
  const handleNavigation = (path) => {
    // Prevenir navegaciones duplicadas o durante otra navegación
    if (isNavigatingRef.current || path === location.pathname) {
      return;
    }

    // Marcar que estamos navegando
    isNavigatingRef.current = true;
    
    // Navegar a la ruta
    navigate(path);
    
    // Reiniciar el estado de navegación después de un breve retraso
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500);
  };

  // Función para ir directamente a la pestaña de perfil
  const handleProfileNav = () => {
    // Prevenir navegaciones duplicadas o durante otra navegación
    if (isNavigatingRef.current) {
      return;
    }

    // Marcar que estamos navegando
    isNavigatingRef.current = true;
    setAnchorEl(null);
    
    // Navegar a la pestaña de perfil
    navigate('/settings?tab=profile', { replace: true });
    
    // Reiniciar el estado de navegación después de un breve retraso
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500);
  };
  
  // Función para manejar el click largo en configuración
  const handleSettingsContextMenu = (event) => {
    event.preventDefault(); // Prevenir el comportamiento por defecto
    setAnchorEl(event.currentTarget);
  };
  
  // Función para cerrar el menú contextual
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  // Funciones para detectar pulsación larga
  const handleTouchStart = (event) => {
    if (event.currentTarget.value === '/settings') {
      settingsButtonRef.current = event.currentTarget;
      longPressTimeoutRef.current = setTimeout(() => {
        // Al mantener presionado, mostrar el menú contextual
        setAnchorEl(event.currentTarget);
      }, 500); // 500ms para considerar una pulsación larga
    }
  };
  
  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };
  
  // Limpiar el timeout cuando el componente se desmonta
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Fondo blanco debajo del panel */}
      <Box sx={bgStyles} />
      
      <Paper
        sx={navStyles}
        elevation={3}
      >
        <BottomNavigation
          value={location.pathname}
          onChange={(event, newValue) => {
            handleNavigation(newValue);
          }}
          showLabels
          sx={{
            height: { xs: 60, sm: 66 }, // Aumentamos un poco más la altura para mejorar el área táctil
            '& .MuiBottomNavigationAction-root': {
              padding: { xs: '8px 0', sm: '10px 0' }, // Aumentamos el padding para más espacio táctil
              minWidth: { xs: 'auto', sm: 80 },
              maxWidth: { xs: 'none', sm: 168 },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              '&.Mui-selected': {
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
              },
              mt: 0.5, // Aumentamos un poco el margen superior
            },
            '& .MuiSvgIcon-root': {
              fontSize: { xs: '1.5rem', sm: '1.6rem' }, // Iconos más grandes para mejor visibilidad
              marginBottom: { xs: '2px', sm: '4px' },
            },
          }}
        >
          {visibleItems.map((item) => (
            <BottomNavigationAction 
              key={item.path}
              label={item.label}
              icon={React.cloneElement(item.icon, { fontSize: "medium" })}
              value={item.path}
              onContextMenu={item.path === '/settings' ? handleSettingsContextMenu : undefined}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              sx={{
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                },
                // Añadir feedback visual para indicar que se puede mantener presionado
                ...(item.path === '/settings' && {
                  '&:active': {
                    opacity: 0.8,
                  },
                }),
              }}
            />
          ))}
        </BottomNavigation>
        
        {/* Menú contextual para navegación rápida a perfil */}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleCloseMenu}
          MenuListProps={{
            'aria-labelledby': 'settings-button',
          }}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          onClick={event => {
            // Prevenir que el evento se propague al BottomNavigation
            event.stopPropagation();
          }}
        >
          <MenuItem 
            onClick={handleProfileNav}
            sx={{ 
              minWidth: 180,
              padding: '12px 16px',
            }}
          >
            <ListItemIcon>
              <AccountCircleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText 
              primary={t('profile')} 
              secondary="Editar perfil"
              primaryTypographyProps={{ fontWeight: 'medium' }}
            />
          </MenuItem>
        </Menu>
      </Paper>
    </>
  );
};

export default MobileBottomNav; 