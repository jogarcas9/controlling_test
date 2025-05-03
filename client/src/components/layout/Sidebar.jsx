import React from 'react';
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
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const Sidebar = ({ isMinimized, onMinimizeToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const menuItems = [
    { path: '/dashboard', icon: <DashboardIcon />, text: t('dashboard') },
    { path: '/personal', icon: <PersonIcon />, text: t('personal') },
    { path: '/shared', icon: <GroupIcon />, text: t('shared') },
    { path: '/reports', icon: <AssessmentIcon />, text: t('reports') },
    { path: '/settings', icon: <SettingsIcon />, text: t('settings') },
  ];

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMinimized ? 'center' : 'flex-end',
          p: 1,
        }}
      >
        <IconButton onClick={onMinimizeToggle}>
          {isMinimized ? <ChevronRight /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.path}
            onClick={() => navigate(item.path)}
            selected={location.pathname === item.path}
            sx={{
              justifyContent: isMinimized ? 'center' : 'flex-start',
              py: 1.5,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
              },
            }}
          >
            <Tooltip title={isMinimized ? item.text : ''} placement="right">
              <ListItemIcon
                sx={{
                  minWidth: isMinimized ? 'auto' : 48,
                  color: location.pathname === item.path ? 'inherit' : 'text.secondary',
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
        ))}
      </List>
    </Box>
  );
};

export default Sidebar; 