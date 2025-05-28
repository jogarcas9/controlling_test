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
  Chip,
  useTheme,
  useMediaQuery,
  alpha
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  Lock as LockIcon,
  LockOpen as UnlockedIcon
} from '@mui/icons-material';
import { formatDate, getInitials, generateRandomColor } from '../../utils/helpers';

const SessionList = ({ 
  sessions, 
  onSelectSession, 
  onEditSession, 
  onDeleteSession,
  onAddSession 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Función para renderizar el indicador de estado
  const renderSessionStatus = (session) => {
    if (session.isLocked) {
      return (
        <Tooltip title="Esta sesión está en espera de que los participantes acepten sus invitaciones">
          <Chip
            icon={<LockIcon fontSize={isMobile ? "small" : "small"} />}
            label={isMobile ? "Espera" : "En espera"}
            color="warning"
            size="small"
            sx={{ 
              ml: isMobile ? 0.5 : 1,
              height: isMobile ? 20 : 24,
              fontSize: isMobile ? '0.65rem' : '0.75rem',
              '& .MuiChip-icon': { 
                fontSize: isMobile ? '0.75rem' : '0.875rem'
              }
            }}
          />
        </Tooltip>
      );
    }
    
    return (
      <Tooltip title="Todos los participantes han aceptado y la sesión está desbloqueada">
        <Chip
          icon={<UnlockedIcon fontSize={isMobile ? "small" : "small"} />}
          label={isMobile ? "Activa" : "Desbloqueada"}
          color="success"
          size="small"
          sx={{ 
            ml: isMobile ? 0.5 : 1,
            height: isMobile ? 20 : 24,
            fontSize: isMobile ? '0.65rem' : '0.75rem',
            '& .MuiChip-icon': { 
              fontSize: isMobile ? '0.75rem' : '0.875rem'
            }
          }}
        />
      </Tooltip>
    );
  };

  // Manejador para evitar la propagación del click en los botones
  const handleActionClick = (e, callback) => {
    e.stopPropagation();
    callback();
  };

  return (
    <Box sx={{ pt: 1 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: isMobile ? 2 : 3,
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        <Typography 
          variant={isMobile ? "h6" : "h5"} 
          component="h2" 
          fontWeight="bold"
          sx={{ fontSize: isMobile ? '1.1rem' : '1.5rem' }}
        >
          Sesiones Compartidas
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onAddSession}
          size={isMobile ? "small" : "medium"}
          sx={{ 
            borderRadius: 2,
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            mt: isMobile ? 1 : 0
          }}
        >
          {isMobile ? 'Nueva' : 'Nueva Sesión'}
        </Button>
      </Box>

      <Grid container spacing={isMobile ? 1.5 : 3}>
        {sessions.length === 0 ? (
          <Grid item xs={12}>
            <Card sx={{ 
              p: isMobile ? 2 : 4, 
              textAlign: 'center',
              backgroundColor: 'background.default',
              border: '2px dashed',
              borderColor: 'divider'
            }}>
              <Box sx={{ mb: isMobile ? 1 : 2 }}>
                <PeopleIcon sx={{ fontSize: isMobile ? 40 : 60, color: 'text.secondary' }} />
              </Box>
              <Typography 
                variant={isMobile ? "subtitle1" : "h6"} 
                color="text.secondary" 
                gutterBottom
              >
                No tienes sesiones compartidas
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ mb: isMobile ? 2 : 3 }}
              >
                Crea una nueva sesión para compartir gastos con otros usuarios
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={onAddSession}
                size={isMobile ? "small" : "medium"}
              >
                {isMobile ? 'Crear Sesión' : 'Crear Nueva Sesión'}
              </Button>
            </Card>
          </Grid>
        ) : (
          sessions.map((session) => (
            <Grid item xs={12} sm={6} md={4} key={session._id}>
              <Card 
                onClick={() => !session.isLocked && onSelectSession(session)}
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100%',
                  borderRadius: isMobile ? 3 : 2,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: session.isLocked ? 'not-allowed' : 'pointer',
                  opacity: session.isLocked ? 0.8 : 1,
                  transform: 'translateY(0)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  ...(isMobile && {
                    '&:active': {
                      transform: 'scale(0.98)',
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'radial-gradient(circle, transparent 1%, rgba(0,0,0,.025) 1%)',
                      backgroundPosition: 'center',
                      backgroundSize: '15000%',
                      opacity: 0,
                      transition: 'background-size 0.3s, opacity 0.3s',
                    },
                    '&:active::after': {
                      backgroundSize: '100%',
                      opacity: 1,
                      transition: 'all 0s',
                    }
                  }),
                  ...(!isMobile && {
                    '&:hover': {
                      boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                      transform: session.isLocked ? 'none' : 'translateY(-4px)'
                    }
                  })
                }}
              >
                <CardContent sx={{ 
                  flexGrow: 1, 
                  pb: 1,
                  p: isMobile ? 1.5 : 2 
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: isMobile ? 'flex-start' : 'center', 
                    mb: 1.5,
                    flexDirection: isMobile ? 'column' : 'row'
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      mb: isMobile ? 1 : 0
                    }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: session.color || 'primary.main',
                          width: isMobile ? 40 : 50,
                          height: isMobile ? 40 : 50,
                          mr: 1.5
                        }}
                      >
                        {session.name?.charAt(0) || 'S'}
                      </Avatar>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography 
                          variant={isMobile ? "subtitle1" : "h6"} 
                          component="div" 
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: isMobile ? '0.9rem' : '1.25rem'
                          }} 
                          noWrap
                        >
                          {session.name}
                        </Typography>
                        {renderSessionStatus(session)}
                      </Box>
                    </Box>
                  </Box>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: isMobile ? '32px' : '40px',
                      fontSize: isMobile ? '0.75rem' : '0.875rem'
                    }}
                  >
                    {session.description || 'Sin descripción'}
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap',
                    gap: 1.5
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      minWidth: isMobile ? '100%' : 'auto'
                    }}>
                      <PeopleIcon 
                        fontSize="small" 
                        color="action" 
                        sx={{ 
                          mr: 0.5,
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }} 
                      />
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                      >
                        {session.participants?.length || 0} participantes
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center'
                    }}>
                      <CalendarIcon 
                        fontSize="small" 
                        color="action" 
                        sx={{ 
                          mr: 0.5,
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }} 
                      />
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                      >
                        {formatDate(session.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {session.participants && session.participants.length > 0 && (
                    <Box sx={{ mt: 1.5 }}>
                      <AvatarGroup 
                        max={isMobile ? 4 : 5} 
                        sx={{ justifyContent: 'flex-start' }}
                      >
                        {session.participants.map((participant, index) => (
                          <Tooltip 
                            key={index} 
                            title={participant.name || participant.email}
                            placement="top"
                          >
                            <Avatar 
                              sx={{ 
                                width: isMobile ? 24 : 30, 
                                height: isMobile ? 24 : 30,
                                fontSize: isMobile ? '0.75rem' : '0.875rem',
                                bgcolor: generateRandomColor(participant.email)
                              }}
                            >
                              {getInitials(participant.name || participant.email)}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </AvatarGroup>
                    </Box>
                  )}
                </CardContent>
                
                <CardActions sx={{ 
                  justifyContent: 'flex-start', 
                  p: isMobile ? 1.5 : 2, 
                  pt: 0
                }}>
                  <IconButton 
                    size="small" 
                    onClick={(e) => handleActionClick(e, () => onEditSession(session))}
                    color="primary"
                    sx={{ padding: isMobile ? 0.5 : 1 }}
                  >
                    <EditIcon fontSize={isMobile ? "small" : "medium"} />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={(e) => handleActionClick(e, () => onDeleteSession(session._id))}
                    color="error"
                    sx={{ padding: isMobile ? 0.5 : 1 }}
                  >
                    <DeleteIcon fontSize={isMobile ? "small" : "medium"} />
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