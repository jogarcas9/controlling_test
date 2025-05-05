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
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import authService from '../../services/authService';

const Sidebar = ({ isMinimized, onMinimizeToggle, handleLogout, handleDrawerToggle, mobileOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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
          } else {
            name = user.nombre || 
                   user.name || 
                   user.username || 
                   (user.email ? user.email.split('@')[0] : '');
          }
                       
          setDisplayName(name);
          setUserEmail(user.email || '');
        } else {
          // Si no hay datos del usuario desde el servicio, intentar desde localStorage
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setUserData(parsedUser);
              
              // Establecer el nombre para mostrar
              let name = '';
              
              // Si tenemos nombre y apellidos, construir nombre completo
              if (parsedUser.nombre && parsedUser.apellidos) {
                name = `${parsedUser.nombre} ${parsedUser.apellidos}`;
              } else {
                name = parsedUser.nombre || 
                       parsedUser.name || 
                       parsedUser.username || 
                       (parsedUser.email ? parsedUser.email.split('@')[0] : '');
              }
                           
              setDisplayName(name);
              setUserEmail(parsedUser.email || '');
            } catch (error) {
              console.error('Error al parsear datos de usuario:', error);
              setDisplayName(localStorage.getItem('userName') || '');
              setUserEmail(localStorage.getItem('userEmail') || '');
            }
          } else {
            // Último intento: usar los valores directos de localStorage
            setDisplayName(localStorage.getItem('userName') || '');
            setUserEmail(localStorage.getItem('userEmail') || '');
          }
        }
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        // Usar los valores de localStorage como fallback
        setDisplayName(localStorage.getItem('userName') || '');
        setUserEmail(localStorage.getItem('userEmail') || '');
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
        boxShadow: theme.shadows[1],
        overflowX: 'hidden',
      }}
    >
      {/* Botón para minimizar/maximizar en la esquina superior derecha (solo en desktop) */}
      {!isMobile && (
        <Box
          sx={{
            position: 'absolute',
            top: isMinimized ? 12 : 16,
            right: isMinimized ? 12 : 16,
            zIndex: 10,
            transition: theme.transitions.create(['top', 'right'], {
              duration: theme.transitions.duration.shorter,
            }),
          }}
        >
          <Tooltip title={isMinimized ? t('expand') : t('collapse')} placement="left">
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
              {isMinimized ? <ChevronRight fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Header con información del usuario y botón de menú móvil */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMinimized ? 'center' : 'flex-start',
          gap: 1.5,
          pb: 3,
          pt: isMinimized ? 5 : 4,
        }}
      >
        <Box 
          sx={{ 
            width: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: isMinimized ? 'center' : 'space-between',
            mb: isMinimized ? 0 : 1.5,
            position: 'relative',
          }}
        >
          <Avatar
            sx={{
              width: isMinimized ? 46 : 56,
              height: isMinimized ? 46 : 56,
              bgcolor: 'primary.main',
              fontSize: isMinimized ? '1.1rem' : '1.4rem',
              fontWeight: 'bold',
              boxShadow: 2,
              transition: theme.transitions.create(['width', 'height', 'fontSize'], {
                duration: theme.transitions.duration.shorter,
              }),
              border: '2px solid',
              borderColor: 'background.paper',
            }}
          >
            {getUserInitials()}
          </Avatar>
          {isMobile && (
            <IconButton
              onClick={handleDrawerToggle}
              sx={{ color: 'text.secondary' }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Box>
        {!isMinimized && (
          <Box sx={{ width: '100%' }}>
            <Typography variant="subtitle1" fontWeight="bold" noWrap>
              {displayName || userEmail.split('@')[0]}
            </Typography>
            {userEmail && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {userEmail}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      <Divider sx={{ opacity: 0.7 }} />

      {/* Menú principal */}
      <List 
        sx={{ 
          flexGrow: 1,
          px: isMinimized ? 1 : 1.5,
          py: 2,
        }}
      >
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem
              button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) handleDrawerToggle();
              }}
              selected={isSelected}
              sx={{
                justifyContent: isMinimized ? 'center' : 'flex-start',
                py: 1.2,
                mb: 0.8,
                borderRadius: 1.5,
                transition: theme.transitions.create(
                  ['background-color', 'box-shadow'],
                  { duration: theme.transitions.duration.standard }
                ),
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  boxShadow: 1,
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
                '&:hover': {
                  bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                  borderRadius: 1.5,
                  transform: 'translateY(-2px)',
                  boxShadow: 2,
                },
              }}
            >
              <Tooltip title={isMinimized ? item.text : ''} placement="right">
                <ListItemIcon
                  sx={{
                    minWidth: isMinimized ? 'auto' : 44,
                    color: location.pathname === item.path ? 'inherit' : 'text.secondary',
                    transition: theme.transitions.create(['color', 'transform'], {
                      duration: theme.transitions.duration.shorter,
                    }),
                    '& .MuiSvgIcon-root': {
                      fontSize: '1.4rem',
                      transition: theme.transitions.create('transform', {
                        duration: theme.transitions.duration.shorter,
                      }),
                    },
                    '&:hover .MuiSvgIcon-root': {
                      transform: 'scale(1.1)',
                    },
                    mx: isMinimized ? 'auto' : 0,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
              </Tooltip>
              {!isMinimized && (
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    sx: {
                      fontWeight: location.pathname === item.path ? 600 : 400,
                    },
                  }}
                />
              )}
            </ListItem>
          );
        })}
      </List>

      {/* Botón de logout */}
      <Divider sx={{ opacity: 0.7 }} />
      <List sx={{ px: isMinimized ? 1 : 1.5, py: 1.5 }}>
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            justifyContent: isMinimized ? 'center' : 'flex-start',
            py: 1.2,
            borderRadius: 1.5,
            transition: theme.transitions.create(
              ['background-color', 'color', 'box-shadow', 'transform'],
              { duration: theme.transitions.duration.shorter }
            ),
            '&:hover': {
              bgcolor: 'error.lighter',
              borderRadius: 1.5,
              transform: 'translateY(-2px)',
              boxShadow: 2,
              '& .MuiListItemIcon-root': {
                color: 'error.main',
              },
              '& .MuiListItemText-primary': {
                color: 'error.main',
              },
            },
          }}
        >
          <Tooltip title={isMinimized ? t('logout') : ''} placement="right">
            <ListItemIcon
              sx={{
                minWidth: isMinimized ? 'auto' : 44,
                color: 'text.secondary',
                transition: theme.transitions.create('color', {
                  duration: theme.transitions.duration.shorter,
                }),
                '& .MuiSvgIcon-root': {
                  fontSize: '1.4rem',
                  transition: theme.transitions.create('transform', {
                    duration: theme.transitions.duration.shorter,
                  }),
                },
                '&:hover .MuiSvgIcon-root': {
                  transform: 'scale(1.1)',
                },
                mx: isMinimized ? 'auto' : 0,
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
          </Tooltip>
          {!isMinimized && (
            <ListItemText
              primary={t('logout')}
              primaryTypographyProps={{
                sx: { 
                  color: 'text.secondary',
                  transition: theme.transitions.create('color', {
                    duration: theme.transitions.duration.shorter,
                  }),
                },
              }}
            />
          )}
        </ListItem>
      </List>
    </Box>
  );
};

export default Sidebar; 