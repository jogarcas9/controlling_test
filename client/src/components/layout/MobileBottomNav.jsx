import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const navigationItems = [
    { path: '/dashboard', icon: <DashboardIcon />, label: t('dashboard') },
    { path: '/personal', icon: <PersonIcon />, label: t('personal') },
    { path: '/shared', icon: <GroupIcon />, label: t('shared') },
    { path: '/reports', icon: <AssessmentIcon />, label: t('reports') },
  ];

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: { xs: 'block', sm: 'none' },
        zIndex: 1000,
      }}
      elevation={3}
    >
      <BottomNavigation
        value={location.pathname}
        onChange={(event, newValue) => {
          navigate(newValue);
        }}
        showLabels
      >
        {navigationItems.map((item) => (
          <BottomNavigationAction 
            key={item.path}
            label={item.label}
            icon={item.icon}
            value={item.path}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomNav; 