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
  // Referencia para controlar múltiples navegaciones
  const isNavigatingRef = useRef(false);

  // Log inicial para depuración
  console.log('[MobileBottomNav] Mounted with location:', location);

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

  // Función para manejar la navegación
  const handleNavigation = (path) => {
    // Prevenir navegaciones múltiples
    if (isNavigatingRef.current) {
      return;
    }
    
    // Marcar como navegando
    isNavigatingRef.current = true;
    
    // Navegar directamente sin lógica adicional
    navigate(path);
    
    // Restablecer el estado de navegación después de un tiempo
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 300);
  };
  
  // Función para navegar al perfil
  const handleProfileNavigation = () => {
    // Prevenir navegaciones múltiples
    if (isNavigatingRef.current) {
      return;
    }
    
    // Marcar como navegando
    isNavigatingRef.current = true;
    
    // Cerrar el menú primero
    setAnchorEl(null);
    
    // Usar timeout para asegurar que el menú se cierre antes de navegar
    setTimeout(() => {
      console.log('Navegando a perfil desde MobileBottomNav');
      
      try {
        // Navegar directamente con el parámetro tab=profile
        // Eliminamos el enfoque en dos pasos para evitar múltiples renderizados
        navigate('/settings?tab=profile');
        
        // Restablecer el estado de navegación después de un tiempo
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 300);
      } catch (error) {
        console.error('Error al navegar al perfil:', error);
        isNavigatingRef.current = false;
      }
    }, 100);
  };
  
  // Función para manejar el click largo en configuración
  const handleSettingsContextMenu = (event) => {
    event.preventDefault(); // Prevenir el comportamiento por defecto
    event.stopPropagation(); // Detener propagación para evitar conflictos
    setAnchorEl(event.currentTarget);
  };
  
  // Función para cerrar el menú contextual
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  // Funciones para detectar pulsación larga
  const handleTouchStart = (event) => {
    if (event.currentTarget.value === '/settings' && !isNavigatingRef.current) {
      settingsButtonRef.current = event.currentTarget;
      
      // Limpiar cualquier timeout anterior por seguridad
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
      
      // Iniciar nuevo timeout para pulsación larga
      longPressTimeoutRef.current = setTimeout(() => {
        console.log('Detectada pulsación larga en botón de configuración');
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
            // Prevenir navegaciones múltiples
            if (isNavigatingRef.current) {
              return;
            }
            
            // Marcar como navegando
            isNavigatingRef.current = true;
            
            try {
              // Navegar directamente sin lógica compleja
              navigate(newValue);
            } catch (error) {
              console.error('Error durante la navegación:', error);
            }
            
            // Restablecer el estado de navegación después de un tiempo
            setTimeout(() => {
              isNavigatingRef.current = false;
            }, 300);
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
            onClick: event => {
              // Prevenir que el evento se propague al BottomNavigation
              event.stopPropagation();
            }
          }}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          // Añadir autoFocus para mejorar la experiencia del usuario
          autoFocus={false}
          disableAutoFocusItem
          // Prevenir el cierre al clickear fuera
          disableRestoreFocus
          // Cerrar el menú al seleccionar una opción
          autoClose
        >
          <MenuItem 
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              handleProfileNavigation();
            }}
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