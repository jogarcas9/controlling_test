import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Paper,
  Box,
  Tooltip,
  Divider,
  Button,
  Card,
  CardContent,
  CardActions,
  Fab,
  Grid
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Lock as LockIcon,
  Today as TodayIcon,
  Add as AddIcon
} from '@mui/icons-material';

const SessionList = ({ 
  sessions, 
  onSelectSession, 
  onEditSession, 
  onDeleteSession,
  renderSessionStatus,
  onAddSession
}) => {
  const formatDate = (date) => {
    if (!date) return '';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.warn('Fecha inválida en formatDate de SessionList:', date);
        return 'Fecha inválida';
      }
      
      // Formateamos la fecha usando toLocaleDateString en español
      const options = { day: 'numeric', month: 'long', year: 'numeric' };
      return dateObj.toLocaleDateString('es-ES', options);
    } catch (error) {
      console.error('Error al formatear fecha en SessionList:', error, 'date:', date);
      return 'Fecha inválida';
    }
  };

  // Función para obtener el estado de la sesión
  const getSessionStatus = (session) => {
    const userId = localStorage.getItem('userId');
    
    // Verificar si el usuario es el creador
    const isCreator = session.userId === userId || 
                     (session.userId && session.userId._id === userId);
    
    if (isCreator) {
      // Si es el creador, verificar si todos los participantes han aceptado
      const allAccepted = session.participants?.every(p => p.status === 'accepted');
      return allAccepted ? 'active' : 'pending';
    }
    
    // Buscar al usuario como participante
    const participant = session.participants?.find(p => {
      const pUserId = p.userId?._id || p.userId;
      return pUserId === userId || (pUserId && pUserId.toString() === userId);
    });
    
    if (participant) {
      if (participant.status === 'pending') {
        return 'waiting'; // Cambiado de invitation a waiting - funcionalidad eliminada
      } else if (participant.status === 'accepted') {
        // Si el usuario aceptó, verificar si todos los demás participantes también aceptaron
        const allAccepted = session.participants?.every(p => p.status === 'accepted');
        return allAccepted ? 'active' : 'waiting';
      } else {
        return 'rejected';
      }
    }
    
    return null;
  };

  if (!sessions || sessions.length === 0) {
    console.log("No hay sesiones para mostrar");
    return (
      <Paper sx={{ p: 3, textAlign: 'center', position: 'relative' }}>
        <Typography color="textSecondary">
          No hay sesiones compartidas disponibles
        </Typography>
        {onAddSession && (
          <Fab 
            color="primary" 
            aria-label="add"
            onClick={onAddSession}
            size="medium"
            sx={{ position: 'absolute', bottom: -20, right: 20 }}
          >
            <AddIcon />
          </Fab>
        )}
      </Paper>
    );
  }

  // Log de depuración para entender qué sesiones se están procesando
  console.log("Procesando sesiones en SessionList:", sessions);

  // Clasificar sesiones según su estado
  const activeSessions = [];
  const pendingSessions = [];
  const waitingSessions = [];
  const rejectedSessions = [];

  sessions.forEach(session => {
    const status = getSessionStatus(session);
    
    if (status === 'active') {
      activeSessions.push(session);
    } else if (status === 'pending') {
      pendingSessions.push(session);
    } else if (status === 'waiting') {
      waitingSessions.push(session);
    } else if (status === 'rejected') {
      rejectedSessions.push(session);
    } else if (status === 'invitation') {
      // Las invitaciones no se procesan - funcionalidad eliminada
    }
  });

  // Sesiones ordenadas por fecha (más recientes primero)
  const sortByDate = (a, b) => {
    const dateA = a.updatedAt || a.createdAt || 0;
    const dateB = b.updatedAt || b.createdAt || 0;
    return new Date(dateB) - new Date(dateA);
  };

  activeSessions.sort(sortByDate);
  pendingSessions.sort(sortByDate);
  waitingSessions.sort(sortByDate);
  rejectedSessions.sort(sortByDate);

  // Ver si hay sesiones para mostrar después de filtrar
  const hasActiveSessions = activeSessions.length > 0;
  const hasPendingSessions = pendingSessions.length > 0;
  const hasWaitingSessions = waitingSessions.length > 0;
  const hasRejectedSessions = rejectedSessions.length > 0;

  if (!hasActiveSessions && !hasPendingSessions && !hasWaitingSessions && !hasRejectedSessions) {
    console.log("No hay sesiones después de clasificar por estado");
    return (
      <Paper sx={{ p: 3, textAlign: 'center', position: 'relative' }}>
        <Typography color="textSecondary">
          No hay sesiones compartidas disponibles según tu perfil de usuario
        </Typography>
        {onAddSession && (
          <Fab 
            color="primary" 
            aria-label="add"
            onClick={onAddSession}
            size="medium"
            sx={{ position: 'absolute', bottom: -20, right: 20 }}
          >
            <AddIcon />
          </Fab>
        )}
      </Paper>
    );
  }

  const renderActiveSession = (session, index) => (
    <Card key={session._id || index} variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" component="div">
              {session.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Creador:</strong> {session.userId?.nombre || "Usuario"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Participantes:</strong> {session.participants?.length || 0}
            </Typography>
            {session.description && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {session.description}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {renderSessionStatus && renderSessionStatus(session)}
          </Box>
        </Box>
      </CardContent>
      <CardActions>
        <Button 
          size="small" 
          color="primary"
          startIcon={<GroupIcon />}
          onClick={() => onSelectSession(session)}
        >
          Ver Detalles
        </Button>

        {/* Botones de edición/eliminación para el creador */}
        {session.userId?._id === localStorage.getItem('userId') && (
          <>
            <Button 
              size="small" 
              startIcon={<EditIcon />}
              onClick={() => onEditSession(session)}
            >
              Editar
            </Button>
            <Button 
              size="small" 
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => onDeleteSession(session._id)}
            >
              Eliminar
            </Button>
          </>
        )}
      </CardActions>
    </Card>
  );

  return (
    <div>
      {/* Sección de sesiones activas */}
      {hasActiveSessions && (
        <Box sx={{ mb: 4 }} data-section="active-sessions">
          <Typography variant="h6" gutterBottom>
            Sesiones activas ({activeSessions.length})
          </Typography>
          <Box>
            {activeSessions.map((session, index) => renderActiveSession(session, index))}
          </Box>
        </Box>
      )}

      {/* Sección de sesiones pendientes (creadas por el usuario) */}
      {hasPendingSessions && (
        <Box sx={{ mb: 4 }} data-section="pending-sessions">
          <Typography variant="h6" gutterBottom>
            Sesiones pendientes ({pendingSessions.length})
          </Typography>
          <Box>
            {pendingSessions.map((session, index) => renderActiveSession(session, index))}
          </Box>
        </Box>
      )}

      {/* Sección de sesiones en espera */}
      {hasWaitingSessions && (
        <Box sx={{ mb: 4 }} data-section="waiting-sessions">
          <Typography variant="h6" gutterBottom>
            Sesiones en espera ({waitingSessions.length})
          </Typography>
          <Box>
            {waitingSessions.map((session, index) => renderActiveSession(session, index))}
          </Box>
        </Box>
      )}

      {/* Botón para agregar nueva sesión */}
      {onAddSession && (
        <Fab 
          color="primary" 
          aria-label="add"
          onClick={onAddSession}
          size="medium"
          sx={{ position: 'fixed', bottom: 80, right: 24 }}
        >
          <AddIcon />
        </Fab>
      )}
    </div>
  );
};

export default SessionList; 