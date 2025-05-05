import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
  Avatar,
  Tooltip,
  Button,
  AvatarGroup,
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { formatDate, getInitials, generateRandomColor } from '../../utils/helpers';

const SessionList = ({ 
  sessions, 
  onSelectSession, 
  onEditSession, 
  onDeleteSession,
  onAddSession 
}) => {
  return (
    <Box sx={{ pt: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2" fontWeight="bold">
          Sesiones Compartidas
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onAddSession}
          sx={{ borderRadius: 2 }}
        >
          Nueva Sesión
        </Button>
      </Box>

      <Grid container spacing={3}>
        {sessions.length === 0 ? (
          <Grid item xs={12}>
            <Card sx={{ 
              p: 4, 
              textAlign: 'center',
              backgroundColor: 'background.default',
              border: '2px dashed',
              borderColor: 'divider'
            }}>
              <Box sx={{ mb: 2 }}>
                <PeopleIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
              </Box>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No tienes sesiones compartidas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Crea una nueva sesión para empezar a compartir gastos con otros usuarios
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={onAddSession}
              >
                Crear Nueva Sesión
              </Button>
            </Card>
          </Grid>
        ) : (
          sessions.map(session => (
            <Grid item xs={12} sm={6} md={4} key={session._id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 6
                  }
                }}
                onClick={() => onSelectSession(session)}
              >
                {session.isLocked && (
                  <Chip
                    icon={<LockIcon />}
                    label="Pendiente de confirmación"
                    color="warning"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 1
                    }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: generateRandomColor(session._id),
                        width: 40,
                        height: 40,
                        mr: 1
                      }}
                    >
                      {getInitials(session.name)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" component="h3" noWrap>
                        {session.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(session.date)}
                      </Typography>
                    </Box>
                  </Box>

                  {session.description && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {session.description}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
                      {session.participants?.map((participant, index) => (
                        <Tooltip key={index} title={participant.email || 'Usuario'}>
                          <Avatar sx={{ bgcolor: generateRandomColor(participant.email) }}>
                            {getInitials(participant.email)}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Tooltip title="Tipo de sesión">
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                          <CalendarIcon 
                            fontSize="small" 
                            sx={{ 
                              color: 'text.secondary',
                              mr: 0.5
                            }} 
                          />
                          <Typography variant="caption" color="text.secondary">
                            {session.sessionType === 'permanent' ? 'Permanente' : 'Única'}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditSession(session);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session._id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
};

export default SessionList; 