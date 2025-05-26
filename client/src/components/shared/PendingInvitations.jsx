import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  Grid,
  Avatar,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  alpha,
  Snackbar
} from '@mui/material';
import {
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
  NotificationsActive as NotificationIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useInvitations } from '../../hooks/useInvitations';
import * as sharedSessionService from '../../services/sharedSessionService';

const PendingInvitations = ({ onInvitationAccepted, onInvitationRejected }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedInvitation, setSelectedInvitation] = useState(null);
  const [openInfoDialog, setOpenInfoDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const {
    invitations,
    loading: apiLoading,
    error,
    fetchInvitations
  } = useInvitations();

  useEffect(() => {
    fetchInvitations();
    
    // Actualizar invitaciones cada 30 segundos
    const interval = setInterval(() => {
      fetchInvitations();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchInvitations]);

  const handleAcceptInvitation = async (invitation) => {
    try {
      setLoading(true);
      await sharedSessionService.respondToInvitation(invitation.sessionId, 'accept');
      await fetchInvitations();
      if (onInvitationAccepted) {
        onInvitationAccepted(invitation);
      }
      setSnackbar({
        open: true,
        message: 'Invitación aceptada correctamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al aceptar invitación:', error);
      setSnackbar({
        open: true,
        message: 'Error al aceptar la invitación',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectInvitation = async (invitation) => {
    try {
      setLoading(true);
      await sharedSessionService.respondToInvitation(invitation.sessionId, 'reject');
      await fetchInvitations();
      if (onInvitationRejected) {
        onInvitationRejected(invitation);
      }
      setSnackbar({
        open: true,
        message: 'Invitación rechazada correctamente',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error al rechazar invitación:', error);
      setSnackbar({
        open: true,
        message: 'Error al rechazar la invitación',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShowInvitationInfo = (invitation) => {
    setSelectedInvitation(invitation);
    setOpenInfoDialog(true);
  };

  const handleCloseInfoDialog = () => {
    setOpenInfoDialog(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (apiLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '20vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <NotificationIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" component="h2" fontWeight="bold">
          Invitaciones Pendientes
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.error.main, 0.1)
          }}
        >
          {error}
        </Alert>
      )}

      {invitations.length === 0 ? (
        <Card
          elevation={0}
          sx={{
            p: 3,
            textAlign: 'center',
            borderRadius: 2,
            border: `2px dashed ${alpha(theme.palette.divider, 0.2)}`,
            bgcolor: alpha(theme.palette.background.default, 0.5)
          }}
        >
          <Typography variant="body1" color="text.secondary">
            No tienes invitaciones pendientes
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {invitations.map((invitation) => (
            <Grid item xs={12} key={invitation._id}>
              <Card 
                sx={{ 
                  borderRadius: 2,
                  boxShadow: theme.shadows[1],
                  position: 'relative',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    boxShadow: theme.shadows[3],
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            mr: 2,
                            bgcolor: invitation.color || theme.palette.primary.main
                          }}
                        >
                          {invitation.sessionName?.charAt(0) || 'S'}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" component="div" noWrap>
                            {invitation.sessionName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Invitado por: {invitation.invitedBy}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        Recibida: {formatDistanceToNow(new Date(invitation.invitationDate), { 
                          addSuffix: true, 
                          locale: es 
                        })}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                        <Chip 
                          label="Pendiente" 
                          color="warning" 
                          size="small" 
                          sx={{ fontWeight: 'medium' }} 
                        />
                        <IconButton 
                          size="small" 
                          onClick={() => handleShowInvitationInfo(invitation)}
                          sx={{ ml: 1 }}
                        >
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'flex-end', p: 1 }}>
                  <Button
                    startIcon={<RejectIcon />}
                    color="error"
                    onClick={() => handleRejectInvitation(invitation)}
                    size="small"
                    sx={{ mr: 1 }}
                    disabled={loading}
                  >
                    Rechazar
                  </Button>
                  <Button
                    startIcon={<AcceptIcon />}
                    color="primary"
                    variant="contained"
                    onClick={() => handleAcceptInvitation(invitation)}
                    size="small"
                    disabled={loading}
                  >
                    Aceptar
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        open={openInfoDialog}
        onClose={handleCloseInfoDialog}
        maxWidth="sm"
        fullWidth
      >
        {selectedInvitation && (
          <>
            <DialogTitle>
              Detalles de la invitación
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="h6" gutterBottom>
                {selectedInvitation.sessionName}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Descripción:</strong> {selectedInvitation.description || 'Sin descripción'}
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Invitado por:</strong> {selectedInvitation.invitedBy}
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Fecha de invitación:</strong> {new Date(selectedInvitation.invitationDate).toLocaleString()}
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Participantes:</strong> {selectedInvitation.participantsCount || 0} personas
              </Typography>
              {selectedInvitation.participants && selectedInvitation.participants.length > 0 && (
                <Box mt={2}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Lista de participantes:</strong>
                  </Typography>
                  <ul>
                    {selectedInvitation.participants.map((participant, index) => (
                      <li key={index}>
                        <Typography variant="body2">
                          {participant.name} ({participant.email})
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseInfoDialog}>
                Cerrar
              </Button>
              <Button 
                variant="contained" 
                color="error"
                onClick={() => {
                  handleRejectInvitation(selectedInvitation);
                  handleCloseInfoDialog();
                }}
                disabled={loading}
              >
                Rechazar
              </Button>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => {
                  handleAcceptInvitation(selectedInvitation);
                  handleCloseInfoDialog();
                }}
                disabled={loading}
              >
                Aceptar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PendingInvitations; 