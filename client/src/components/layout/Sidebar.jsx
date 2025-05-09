import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Tooltip,
  Typography,
  Avatar,
  useMediaQuery,
  useTheme,
  Paper,
  Collapse,
  Badge,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight,
  Group as GroupIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import authService from '../../services/authService';

const Sidebar = ({ 
  isMinimized, 
  onMinimizeToggle, 
  handleLogout, 
  handleDrawerToggle, 
  mobileOpen, 
  isMobile = false,
  isTablet = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // Calcular la visualización del sidebar según el dispositivo
  const effectiveMinimized = isMobile ? false : isMinimized;
  
  // Estado para almacenar los datos del usuario
  const [userData, setUserData] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  
  // Cargar los datos del usuario al montar el componente
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Intentar obtener datos del usuario del servicio de autenticación
        const user = await authService.getCurrentUser();
        
        if (user) {
          setUserData(user);
          
          // Establecer el nombre para mostrar basado en la información disponible
          let name = '';
          
          // Si tenemos nombre y apellidos, construir nombre completo
          if (user.nombre && user.apellidos) {
            name = `${user.nombre} ${user.apellidos}`;
          } else if (user.nombre) {
            name = user.nombre;
          } else if (user.name) {
            name = user.name;
          } else if (user.username) {
            name = user.username;
          } else if (user.email) {
            name = user.email.split('@')[0];
          } else {
            name = 'Usuario';
          }
          
          setDisplayName(name);
          setUserEmail(user.email || '');
        } else {
          // Si no hay datos del usuario, cargar desde localStorage como fallback
          const storedUser = localStorage.getItem('user');
          const userName = localStorage.getItem('userName');
          const userEmail = localStorage.getItem('userEmail');
          
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setUserData(parsedUser);
              
              if (userName) {
                setDisplayName(userName);
              } else {
                let name = parsedUser.nombre || parsedUser.name || parsedUser.username;
                if (!name && parsedUser.email) name = parsedUser.email.split('@')[0];
                setDisplayName(name || 'Usuario');
              }
              
              setUserEmail(userEmail || parsedUser.email || '');
            } catch (error) {
              console.error('Error al parsear datos de usuario:', error);
              setDisplayName(userName || 'Usuario');
              setUserEmail(userEmail || '');
            }
          } else {
            // Último intento: usar los valores directos de localStorage
            setDisplayName(userName || 'Usuario');
            setUserEmail(userEmail || '');
          }
        }
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        // Usar los valores de localStorage como fallback
        const userName = localStorage.getItem('userName');
        const userEmail = localStorage.getItem('userEmail');
        setDisplayName(userName || 'Usuario');
        setUserEmail(userEmail || '');
      }
    };
    
    loadUserData();
  }, []);

  const menuItems = [
    { path: '/dashboard', icon: <DashboardIcon />, text: t('dashboard') },
    { path: '/personal', icon: <PersonIcon />, text: t('personal') },
    { path: '/shared', icon: <GroupIcon />, text: t('shared') },
    { path: '/reports', icon: <AssessmentIcon />, text: t('reports') },
    { path: '/settings', icon: <SettingsIcon />, text: t('settings') },
  ];

  const getUserInitials = () => {
    if (!displayName) return "U";
    
    // Obtener iniciales del nombre completo
    return displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        position: 'relative',
        boxShadow: 'none',
        overflow: 'hidden',
        padding: 0,
        margin: 0,
        width: '100%',
        maxWidth: '100%',
        border: 'none',
        borderRight: '1px solid',
        borderColor: 'divider',
        boxSizing: 'border-box'
      }}
    >
      {/* Botón para minimizar/maximizar (solo en desktop) */}
      {!isSmallScreen && !isTablet && (
        <Box
          sx={{
            position: 'absolute',
            top: effectiveMinimized ? 12 : 16,
            right: effectiveMinimized ? 12 : 16,
            zIndex: 10,
            transition: theme.transitions.create(['top', 'right'], {
              duration: theme.transitions.duration.shorter,
            }),
          }}
        >
          <Tooltip title={effectiveMinimized ? t('expand') : t('collapse')} placement="left">
            <IconButton 
              onClick={onMinimizeToggle}
              size="small"
              sx={{
                bgcolor: 'background.paper',
                boxShadow: 2,
                border: '1px solid',
                borderColor: 'divider',
                width: 28,
                height: 28,
                '&:hover': {
                  bgcolor: 'action.hover',
                  transform: 'scale(1.05)',
                },
                transition: theme.transitions.create(['transform', 'box-shadow'], {
                  duration: theme.transitions.duration.shortest,
                }),
              }}
            >
              {effectiveMinimized ? <ChevronRight fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Header con información del usuario y botón de menú móvil */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2, md: 2.5 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: effectiveMinimized ? 'center' : 'flex-start',
          gap: { xs: 1, sm: 1.5 },
          pb: { xs: 2, sm: 3 },
          pt: effectiveMinimized ? 5 : { xs: 3, sm: 4 },
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Mostrar botón de menú hamburgesa en móvil */}
        {(isMobile || isTablet) && (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <IconButton 
              edge="start" 
              onClick={handleDrawerToggle}
              sx={{ color: 'primary.main' }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        )}

        {/* Avatar del usuario */}
        <Avatar
          sx={{
            width: effectiveMinimized ? 40 : { xs: 48, sm: 56 },
            height: effectiveMinimized ? 40 : { xs: 48, sm: 56 },
            bgcolor: 'primary.main',
            fontSize: effectiveMinimized ? '1rem' : { xs: '1.2rem', sm: '1.4rem' },
            fontWeight: 'bold',
            boxShadow: 2,
            border: '2px solid',
            borderColor: 'background.paper',
            transition: theme.transitions.create(['width', 'height'], {
              duration: theme.transitions.duration.shortest,
            }),
          }}
        >
          {getUserInitials()}
        </Avatar>

        {/* Nombre y correo electrónico del usuario */}
        {!effectiveMinimized && (
          <Box sx={{ mt: { xs: 0.5, sm: 1 } }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '0.95rem', sm: '1.1rem' }, 
                lineHeight: 1.2,
                mb: 0.5,
                maxWidth: { xs: '180px', sm: '200px' },
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </Typography>
            {userEmail && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  fontSize: { xs: '0.75rem', sm: '0.8rem' },
                  maxWidth: { xs: '180px', sm: '200px' },
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {userEmail}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Lista de elementos de navegación */}
      <List
        component="nav"
        sx={{
          width: '100%',
          padding: 0,
          mt: 1,
          '& .MuiListItem-root': {
            mb: 0.5,
            borderRadius: 1,
            mx: effectiveMinimized ? 1 : 2,
            pr: 0
          }
        }}
      >
        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          
          return (
            <ListItem
              key={item.path}
              button
              onClick={() => {
                navigate(item.path);
                if (isMobile || isTablet) {
                  handleDrawerToggle();
                }
              }}
              sx={{
                px: { xs: 1.5, sm: 2 },
                py: { xs: 0.75, sm: 1 },
                mb: { xs: 0.5, sm: 0.75 },
                borderRadius: 1.5,
                position: 'relative',
                backgroundColor: isActive ? 'action.selected' : 'transparent',
                '&:hover': {
                  backgroundColor: isActive ? 'action.selected' : 'action.hover',
                },
                overflow: 'hidden',
                flexWrap: 'nowrap',
              }}
            >
              {isActive && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    bgcolor: 'primary.main',
                    borderRadius: '0 4px 4px 0',
                  }}
                />
              )}
              <ListItemIcon
                sx={{
                  minWidth: effectiveMinimized ? 0 : 40,
                  color: isActive ? 'primary.main' : 'text.primary',
                  justifyContent: effectiveMinimized ? 'center' : 'flex-start',
                  mr: effectiveMinimized ? 0 : 1,
                }}
              >
                {item.icon}
              </ListItemIcon>
              
              {!effectiveMinimized && (
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: { xs: '0.9rem', sm: '0.95rem' },
                    fontWeight: isActive ? 'bold' : 'normal',
                    color: isActive ? 'primary.main' : 'text.primary',
                  }}
                />
              )}
            </ListItem>
          );
        })}
      </List>

      {/* Divider antes del botón de cerrar sesión */}
      <Divider sx={{ my: { xs: 0.5, sm: 1 } }} />
      
      {/* Botón de cerrar sesión */}
      <Box sx={{ p: { xs: 1, sm: 1.5 }, mb: { xs: 1, sm: 2 } }}>
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            borderRadius: 1.5,
            py: { xs: 0.75, sm: 1 },
            px: { xs: 1.5, sm: 2 },
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: effectiveMinimized ? 0 : 40,
              color: 'text.secondary',
              justifyContent: effectiveMinimized ? 'center' : 'flex-start',
              mr: effectiveMinimized ? 0 : 1,
            }}
          >
            <LogoutIcon />
          </ListItemIcon>
          
          {!effectiveMinimized && (
            <ListItemText
              primary={t('logout')}
              primaryTypographyProps={{
                fontSize: { xs: '0.9rem', sm: '0.95rem' },
                color: 'text.secondary',
              }}
            />
          )}
        </ListItem>
      </Box>
    </Box>
  );
};

export default Sidebar; 