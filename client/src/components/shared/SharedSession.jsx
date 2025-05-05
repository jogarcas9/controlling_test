import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  useMediaQuery,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Avatar,
  AvatarGroup,
  Tooltip,
  Divider,
  Tabs,
  Tab,
  Badge,
  Menu,
  MenuItem,
  Fade
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Today as TodayIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  MoreVert as MoreVertIcon,
  Lock as LockIcon,
  People as PeopleIcon,
  Sync as SyncIcon,
  Download as DownloadIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import axios from 'axios';

const SharedSession = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/shared-sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(response.data);
      setError('');
    } catch (err) {
      setError('Error al cargar las sesiones compartidas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (sessionData) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/shared-sessions', sessionData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOpenDialog(false);
      fetchSessions();
    } catch (err) {
      setError('Error al crear la sesión compartida');
    }
  };

  const handleDeleteSession = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/shared-sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSessions();
    } catch (err) {
      setError('Error al eliminar la sesión compartida');
    }
  };

  const handleEditSession = async (sessionData) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/shared-sessions/${editingSession._id}`, sessionData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingSession(null);
      fetchSessions();
    } catch (err) {
      setError('Error al editar la sesión compartida');
    }
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleMonthChange = (event) => {
    setSelectedMonth(parseInt(event.target.value));
  };

  const handleYearChange = (event) => {
    setSelectedYear(parseInt(event.target.value));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            color: theme.palette.primary.main,
            mb: 2
          }}
        >
          Sesiones Compartidas
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ color: 'text.secondary', mb: 3 }}
        >
          Gestiona y colabora en sesiones compartidas con otros usuarios
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

      <Box sx={{ mb: 4 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            py: 1,
            px: 3
          }}
        >
          Nueva Sesión Compartida
        </Button>
      </Box>

      <Grid container spacing={3}>
        {sessions.length === 0 ? (
          <Grid item xs={12}>
            <Card
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 2,
                border: `2px dashed ${alpha(theme.palette.divider, 0.2)}`,
                bgcolor: alpha(theme.palette.background.default, 0.5)
              }}
            >
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
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
                sx={{ borderRadius: 2 }}
              >
                Crear Nueva Sesión
              </Button>
            </Card>
          </Grid>
        ) : (
          sessions.map((session) => (
            <Grid item xs={12} sm={6} md={4} key={session._id}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[4]
                  }
                }}
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
                <CardHeader
                  avatar={
                    <Avatar
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main
                      }}
                    >
                      {session.name.charAt(0)}
                    </Avatar>
                  }
                  action={
                    <IconButton onClick={handleMenuClick}>
                      <MoreVertIcon />
                    </IconButton>
                  }
                  title={
                    <Typography variant="h6" noWrap>
                      {session.name}
                    </Typography>
                  }
                  subheader={
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(session.date), 'dd MMMM yyyy', { locale: es })}
                    </Typography>
                  }
                />
                <CardContent sx={{ flexGrow: 1 }}>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AvatarGroup max={3}>
                      {session.participants?.map((participant, index) => (
                        <Tooltip key={index} title={participant.email}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              fontSize: '0.875rem',
                              bgcolor: alpha(theme.palette.secondary.main, 0.1),
                              color: theme.palette.secondary.main
                            }}
                          >
                            {participant.email.charAt(0).toUpperCase()}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                    <Typography variant="body2" color="text.secondary">
                      {session.participants?.length || 0} participantes
                    </Typography>
                  </Box>
                </CardContent>
                <Divider />
                <CardActions sx={{ p: 2, justifyContent: 'space-between' }}>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => setEditingSession(session)}
                      sx={{ color: theme.palette.primary.main }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteSession(session._id)}
                      sx={{ color: theme.palette.error.main }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ShareIcon />}
                    sx={{ borderRadius: 2 }}
                  >
                    Compartir
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        TransitionComponent={Fade}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 200
          }
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          <SyncIcon sx={{ mr: 2 }} />
          Sincronizar
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <DownloadIcon sx={{ mr: 2 }} />
          Exportar
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <PrintIcon sx={{ mr: 2 }} />
          Imprimir
        </MenuItem>
      </Menu>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          {editingSession ? 'Editar Sesión' : 'Nueva Sesión'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nombre"
              value={editingSession?.name || ''}
              onChange={(e) => setEditingSession({ ...editingSession, name: e.target.value })}
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth
              label="Descripción"
              multiline
              rows={3}
              value={editingSession?.description || ''}
              onChange={(e) => setEditingSession({ ...editingSession, description: e.target.value })}
              sx={{ mb: 3 }}
            />
            <TextField
              fullWidth
              label="Participantes (separados por comas)"
              value={editingSession?.participants?.join(', ') || ''}
              onChange={(e) => setEditingSession({
                ...editingSession,
                participants: e.target.value.split(',').map(p => p.trim())
              })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenDialog(false)}
            sx={{ color: 'text.secondary' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => editingSession ? handleEditSession(editingSession) : handleCreateSession(editingSession)}
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            {editingSession ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SharedSession; 