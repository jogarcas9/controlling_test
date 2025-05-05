import React, { useState } from 'react';
import {
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Typography,
  Box,
  Button,
  CircularProgress
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import format from 'date-fns/format';
import es from 'date-fns/locale/es';
import { useNavigate } from 'react-router-dom';
import sessionService from '../../services/sessionService';
import { useSnackbar } from 'notistack';

const SessionInvitationItem = ({ notification, onDelete, onAction }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { message, date, read, _id } = notification;
  const sessionId = notification.content?.sessionId || notification.data?.sessionId;
  const sessionName = notification.content?.sessionName || notification.data?.sessionName;

  const handleAccept = async (e) => {
    e.stopPropagation();
    if (loading) return;
    
    setLoading(true);
    try {
      await sessionService.acceptInvitation(sessionId);
      enqueueSnackbar('Has aceptado la invitación a la sesión', { variant: 'success' });
      
      if (onAction) {
        onAction('accepted', _id);
      }
      
      // Redirigir a la sesión
      navigate(`/shared-sessions/${sessionId}`);
    } catch (error) {
      console.error('Error al aceptar la invitación:', error);
      enqueueSnackbar('Error al aceptar la invitación: ' + (error.response?.data?.msg || error.message), { 
        variant: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (e) => {
    e.stopPropagation();
    if (loading) return;
    
    setLoading(true);
    try {
      await sessionService.declineInvitation(sessionId, _id);
      enqueueSnackbar('Has rechazado la invitación a la sesión', { variant: 'info' });
      
      if (onAction) {
        onAction('declined', _id);
      }
    } catch (error) {
      console.error('Error al rechazar la invitación:', error);
      enqueueSnackbar('Error al rechazar la invitación: ' + (error.response?.data?.msg || error.message), { 
        variant: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ListItem
      alignItems="flex-start"
      sx={{
        bgcolor: read ? 'transparent' : 'action.hover',
        '&:hover': {
          bgcolor: 'action.hover',
        },
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          <GroupIcon />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Typography
            component="div"
            variant="body1"
            color="text.primary"
            sx={{ fontWeight: 'medium', mb: 1 }}
          >
            {message}
          </Typography>
        }
        secondary={
          <React.Fragment>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="primary">
                Sesión: {sessionName}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {format(new Date(date), 'PPp', { locale: es })}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
                onClick={handleAccept}
                disabled={loading}
              >
                Aceptar
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CloseIcon />}
                onClick={handleDecline}
                disabled={loading}
              >
                Rechazar
              </Button>
            </Box>
          </React.Fragment>
        }
      />
      <IconButton 
        edge="end" 
        aria-label="delete" 
        onClick={(e) => {
          e.stopPropagation();
          if (onDelete) onDelete(_id);
        }}
        sx={{ alignSelf: 'flex-start', mt: 0.5 }}
      >
        <DeleteIcon />
      </IconButton>
    </ListItem>
  );
};

export default SessionInvitationItem; 