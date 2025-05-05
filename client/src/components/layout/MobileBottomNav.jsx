import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  BarChart as ReportsIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: { xs: 'block', sm: isTablet ? 'block' : 'none', md: 'none' },
        zIndex: 1200,
        borderRadius: 0,
        boxShadow: 3,
      }}
      elevation={3}
    >
      <BottomNavigation
        value={location.pathname.startsWith('/reports') ? '/reports' : location.pathname}
        onChange={(event, newValue) => {
          navigate(newValue);
        }}
        showLabels
        sx={{
          height: { xs: 48, sm: 56 },
          '& .MuiBottomNavigationAction-root': {
            padding: { xs: '4px 0', sm: '6px 0' },
            minWidth: { xs: 'auto', sm: 80 },
            maxWidth: { xs: 'none', sm: 168 },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: { xs: '0.6rem', sm: '0.7rem' },
            '&.Mui-selected': {
              fontSize: { xs: '0.6rem', sm: '0.7rem' },
            },
          },
          '& .MuiSvgIcon-root': {
            marginBottom: { xs: '2px', sm: '4px' },
          },
        }}
      >
        {visibleItems.map((item) => (
          <BottomNavigationAction 
            key={item.path}
            label={item.label}
            icon={item.icon}
            value={item.path}
            sx={{
              '&.Mui-selected': {
                color: theme.palette.primary.main,
              },
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomNav; 