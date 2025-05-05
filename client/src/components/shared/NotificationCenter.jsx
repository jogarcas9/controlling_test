import React, { useState, useEffect } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Circle as CircleIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns/format';
import { es } from 'date-fns/locale/es';

const NotificationCenter = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);
  const open = Boolean(anchorEl);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/notifications', {
        headers: { 'x-auth-token': token }
      });
      setNotifications(response.data);
      setUnreadCount(response.data.filter(notif => !notif.read).length);
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Actualizar notificaciones cada 5 minutos
    const interval = setInterval(fetchNotifications, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        const token = localStorage.getItem('token');
        await axios.put(`/api/notifications/${notification._id}/read`, {}, {
          headers: { 'x-auth-token': token }
        });
        setNotifications(prevNotifications =>
          prevNotifications.map(n =>
            n._id === notification._id ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      // Aquí puedes agregar lógica para navegar a la página relacionada con la notificación
      handleClose();
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
    }
  };

  const formatNotificationDate = (date) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        size="large"
        aria-label={t('notifications')}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 400,
          }
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" component="div">
            {t('notifications')}
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length > 0 ? (
          <List sx={{ p: 0 }}>
            {notifications.map((notification) => (
              <React.Fragment key={notification._id}>
                <ListItem
                  button
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    backgroundColor: notification.read ? 'inherit' : 'action.hover',
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {!notification.read && (
                          <CircleIcon sx={{ fontSize: 8, color: 'primary.main' }} />
                        )}
                        <Typography variant="body1">
                          {notification.message}
                        </Typography>
                      </Box>
                    }
                    secondary={formatNotificationDate(notification.date)}
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="textSecondary">
              {t('noNotifications')}
            </Typography>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationCenter; 