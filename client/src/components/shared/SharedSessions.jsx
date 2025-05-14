import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Today as TodayIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

import SessionList from './SessionList';
import SessionForm from './SessionForm';
import ExpenseList from './ExpenseList';
import ExpenseForm from './ExpenseForm';
import DistributionTable from './DistributionTable';
import PendingInvitations from './PendingInvitations';

import { useSessions, useExpenses, useDistribution, useInvitations } from '../../hooks';
import * as sharedSessionService from '../../services/sharedSessionService';
import * as expenseService from '../../services/expenseService';
import { formatMonthYear } from '../../utils/dateHelpers';

const SharedSessions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados locales
  const [currentSession, setCurrentSession] = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Estados para la vista mensual
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  
  // Theme y responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Nombres de los meses en español
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  // Opciones para el selector de año (3 años atrás y 1 adelante)
  const getYearOptions = () => {
    const currentYear = today.getFullYear();
    return [currentYear - 3, currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  };

  // Hooks personalizados
  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
    getSessionDetails
  } = useSessions();

  const {
    expenses,
    loading: expensesLoading,
    error: expensesError,
    fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    calculateTotal
  } = useExpenses(currentSession?._id, selectedMonth, selectedYear);

  const {
    distributions,
    error: distributionError,
    calculateEqualDistribution,
    calculateCustomDistribution,
    calculateSettlements
  } = useDistribution(expenses, currentSession?.participants || []);

  const {
    invitations,
    count: pendingInvitationsCount,
    fetchInvitations,
    error: invitationsError,
    acceptInvitation,
    rejectInvitation
  } = useInvitations();

  // Función para mostrar correctamente el nombre del mes en dispositivos móviles
  const getShortMonthName = (monthIndex) => {
    return monthNames[monthIndex].substring(0, 3);
  };

  // Manejadores para la navegación de meses
  const handlePreviousMonth = () => {
    console.log('Click en mes anterior');
    setSelectedMonth(prevMonth => {
      if (prevMonth === 0) {
        setSelectedYear(prevYear => prevYear - 1);
        return 11;
      }
      return prevMonth - 1;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth(prevMonth => {
      if (prevMonth === 11) {
        setSelectedYear(prevYear => prevYear + 1);
        return 0;
      } else {
        return prevMonth + 1;
      }
    });
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  // Efectos
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Agregar un efecto para manejar la actualización cuando cambia alguna notificación
  useEffect(() => {
    // Suscribirse a eventos de notificación
    const handleNotificationUpdate = () => {
      fetchSessions();
    };
    
    // Agregar listener para evento personalizado de notificaciones
    window.addEventListener('notification_updated', handleNotificationUpdate);
    
    return () => {
      window.removeEventListener('notification_updated', handleNotificationUpdate);
    };
  }, [fetchSessions]);

  useEffect(() => {
    if (currentSession) {
      fetchExpenses();
    }
  }, [currentSession, fetchExpenses, selectedMonth, selectedYear]);

  // Nuevo efecto para gestionar invitaciones pendientes
  const [showPendingInvitations, setShowPendingInvitations] = useState(false);

  // Manejadores para invitaciones
  const handleInvitationAccepted = async () => {
    await fetchSessions();
    await fetchInvitations();
    
    if (pendingInvitationsCount === 0) {
      setShowPendingInvitations(false);
    }
  };
  
  const handleInvitationRejected = async () => {
    await fetchInvitations();
    
    if (pendingInvitationsCount === 0) {
      setShowPendingInvitations(false);
    }
  };

  // Manejadores de sesiones
  const handleSelectSession = async (session) => {
    console.log('Seleccionando sesión:', session);
    
    // Verificar que la sesión tenga un ID antes de establecerla como actual
    if (!session || !session._id) {
      console.error('Se intentó seleccionar una sesión sin ID:', session);
      alert('Error: No se pudo cargar la sesión seleccionada');
      return;
    }
    
    try {
      // Primero verificar si la sesión está bloqueada en los datos actualizados
      const updatedSessionData = await getSessionDetails(session._id);
      
      if (!updatedSessionData) {
        throw new Error('No se pudieron obtener los detalles actualizados de la sesión');
      }
      
      if (updatedSessionData.isLocked) {
        // Si la sesión está bloqueada, mostrar un mensaje informativo
        alert('Esta sesión está pendiente de confirmación por parte de los participantes. No se puede acceder hasta que todos los participantes acepten la invitación.');
        return;
      }
      
      // Establecer la sesión actual con los datos completos y actualizados
      setCurrentSession(updatedSessionData);
      
      // Cargar gastos si es necesario
      if (fetchExpenses) {
        fetchExpenses(updatedSessionData._id);
      }
    } catch (error) {
      console.error('Error al cargar los detalles de la sesión:', error);
      const errorMessage = error.userMessage || error.message || 'Error desconocido';
      alert(`Error al cargar los detalles de la sesión: ${errorMessage}`);
      // Si hay error, limpiar la sesión actual
      setCurrentSession(null);
    }
  };

  const handleAddSession = useCallback(() => {
    setEditingSession(null);
    setShowSessionForm(true);
  }, []);

  const handleEditSession = (session) => {
    // Verificar permisos
    const userId = localStorage.getItem('userId');
    const userRole = getUserRoleInSession(session, userId);
    
    if (!userId) {
      console.error('No se encontró el userId en localStorage');
      alert('Error al verificar permisos: información de usuario no disponible');
      return;
    }
    
    if (userRole === 'Creador' || userRole === 'Administrador') {
      setEditingSession(session);
      setShowSessionForm(true);
    } else {
      alert('No tienes permiso para editar esta sesión. Solo los administradores pueden editar sesiones.');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!sessionId) {
      console.error('Se intentó eliminar una sesión sin ID');
      return;
    }
    
    if (window.confirm('¿Estás seguro de que deseas eliminar esta sesión? Esta acción no se puede deshacer.')) {
      try {
        console.log('Intentando eliminar sesión:', sessionId);
        await deleteSession(sessionId);
        
        // Si la sesión actual es la que se acaba de eliminar, resetear la vista
        if (currentSession?._id === sessionId) {
          setCurrentSession(null);
        }
        
        // La lista de sesiones ya se actualiza en el hook useSessions
      } catch (error) {
        console.error('Error al eliminar la sesión:', error);
        const errorMessage = error.userMessage || error.message || 'Error desconocido';
        alert(`Error al eliminar la sesión: ${errorMessage}`);
      }
    }
  };

  // Función para obtener el rol del usuario en la sesión actual
  const getUserRoleInSession = (session, userId) => {
    if (!session || !userId) return null;
    
    // Si el usuario es el creador de la sesión
    if (session.user === userId) {
      return 'Creador';
    }
    
    // Buscar al usuario en la lista de participantes
    const participant = session.participants?.find(p => p.userId === userId || (p.userId && p.userId._id === userId));
    return participant ? participant.role : null;
  };

  // Modificar getUserNameByEmail para usar el servicio correctamente
  const getUserNameByEmail = async (email) => {
    if (!email) return null;
    
    try {
      console.log(`Obteniendo información para el usuario con email: ${email}`);
      const result = await sharedSessionService.getUserByEmail(email);
      
      if (result && result.user) {
        console.log(`Nombre obtenido para ${email}: ${result.user.name}`);
        return result.user.name || email.split('@')[0];
      } else {
        console.warn(`No se encontró información para el usuario con email: ${email}`);
        return email.split('@')[0];
      }
    } catch (error) {
      console.error(`Error al obtener información para el usuario con email ${email}:`, error);
      return email.split('@')[0];
    }
  };

  // Modificar handleSessionSubmit para incluir la obtención de nombres reales
  const handleSubmitSession = async (sessionData) => {
    try {
      // Procesar participantes para obtener nombres reales
      console.log('Procesando participantes para obtener nombres reales...');
      const processedParticipants = await Promise.all(
        sessionData.participants.map(async (participant) => {
          if (!participant.email) return participant;
          
          try {
            // Obtener nombre del usuario por email
            const userName = await getUserNameByEmail(participant.email);
            
            console.log(`Participante ${participant.email} - Nombre obtenido: ${userName}`);
            
            return {
              ...participant,
              name: userName || participant.email.split('@')[0] // Usar el nombre real obtenido o parte del email como fallback
            };
          } catch (error) {
            console.error(`Error al obtener nombre para ${participant.email}:`, error);
            // En caso de error, usar el email como nombre
            return {
              ...participant,
              name: participant.email.split('@')[0]
            };
          }
        })
      );
      
      const processedSessionData = {
        ...sessionData,
        participants: processedParticipants
      };
      
      console.log('Datos de sesión procesados:', processedSessionData);
      
      if (editingSession) {
        // Editar sesión existente
        console.log('Actualizando sesión:', editingSession._id);
        const updatedSession = await updateSession(editingSession._id, processedSessionData);
        
        // Si la sesión actual es la que se acaba de editar, actualizarla
        if (currentSession && currentSession._id === editingSession._id) {
          setCurrentSession(updatedSession);
        }
      } else {
        // Crear nueva sesión
        console.log('Creando nueva sesión');
        const newSession = await createSession(processedSessionData);
        
        // Si la creación fue exitosa, seleccionar la nueva sesión
        if (newSession && newSession._id) {
          handleSelectSession(newSession);
        }
      }
      
      // Cerrar el formulario
      setShowSessionForm(false);
      setEditingSession(null);
    } catch (error) {
      console.error('Error al guardar la sesión:', error);
      const errorMessage = error.userMessage || error.message || 'Error desconocido';
      alert(`Error al guardar la sesión: ${errorMessage}`);
    }
  };

  // Manejadores de gastos
  const handleAddExpense = () => {
    setEditingExpense(null);
    setShowExpenseForm(true);
  };

  const handleEditExpense = (expense) => {
    // Verificar que el usuario sea participante de la sesión
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      console.error('No se encontró el userId en localStorage');
      alert('Error al verificar permisos: información de usuario no disponible');
      return;
    }
    
    // Comprobar que existe una sesión seleccionada
    if (!currentSession) {
      console.error('No hay una sesión seleccionada');
      return;
    }
    
    // Comprobar que el usuario es participante de la sesión
    const isParticipant = currentSession.participants?.some(
      p => p.userId?._id === userId || p.userId === userId
    );
    
    if (isParticipant) {
      setEditingExpense(expense);
      setShowExpenseForm(true);
    } else {
      alert('No tienes permiso para editar gastos en esta sesión.');
    }
  };

  const handleExpenseSubmit = async (expenseData) => {
    try {
      if (editingExpense) {
        await updateExpense(editingExpense._id, expenseData);
      } else {
        await addExpense(expenseData);
      }
      setShowExpenseForm(false);
      setEditingExpense(null);
      
      // Después de añadir/actualizar un gasto, asegurarse de que la lista está actualizada
      await fetchExpenses();
      
      // Sincronizar solo después de que el gasto se haya guardado correctamente
      try {
        await sharedSessionService.syncToPersonal(currentSession._id);
      } catch (syncError) {
        console.error('Error en la sincronización:', syncError);
        // No mostrar error al usuario ya que el gasto se guardó correctamente
      }
    } catch (error) {
      console.error('Error al guardar el gasto:', error);
      alert('Error al guardar el gasto: ' + (error.response?.data?.msg || error.message));
    }
  };

  const handleDeleteExpense = async (expense) => {
    if (!currentSession?._id) {
      console.error('No hay una sesión seleccionada');
      return;
    }

    const isIncome = expense.type === 'income';
    const itemType = isIncome ? 'ingreso' : 'gasto';

    if (window.confirm(`¿Estás seguro de que deseas eliminar este ${itemType}?` + 
      (expense.isRecurring ? `\nEste es un ${itemType} recurrente. Se eliminarán todas las versiones futuras.` : ''))) {
      try {
        // Eliminar el gasto y dejar que el hook maneje la actualización del estado
        await deleteExpense(expense._id);
        
        // Después de eliminar un gasto, asegurarse de que la lista está actualizada
        await fetchExpenses();
        
        // Sincronizar después de eliminar el gasto
        try {
          await sharedSessionService.syncToPersonal(currentSession._id);
        } catch (syncError) {
          console.error('Error en la sincronización después de eliminar:', syncError);
        }
      } catch (error) {
        console.error(`Error al eliminar el ${itemType}:`, error);
        alert(`Error al eliminar el ${itemType}: ` + (error.response?.data?.msg || error.message));
      }
    }
  };

  // Manejador de distribución
  const handleUpdateDistribution = async (percentages) => {
    try {
      // Convertir los porcentajes al formato esperado por el backend
      const distribution = Object.entries(percentages).map(([userId, percentage]) => ({
        userId,
        percentage: Number(percentage)
      }));

      // Actualizar en el backend
      await sharedSessionService.updateDistribution(currentSession._id, distribution);
      
      // Actualizar el estado local con la sesión actualizada
      setCurrentSession(prev => ({
        ...prev,
        allocations: distribution
      }));

      // Recargar la sesión para asegurar que tenemos los datos actualizados
      const response = await sharedSessionService.getSessionDetails(currentSession._id);
      setCurrentSession(response.data);

    } catch (error) {
      console.error('Error al actualizar la distribución:', error);
      alert('Error al actualizar la distribución. Por favor, intenta de nuevo.');
    }
  };

  // Manejador para sincronizar gastos compartidos con gastos personales
  const handleSyncToPersonal = async () => {
    if (!currentSession || !currentSession._id) {
      console.error('No hay una sesión seleccionada para sincronizar');
      return;
    }
    
    setLoading(true);
    try {
      const result = await sharedSessionService.syncToPersonal(currentSession._id);
      console.log('Resultado de sincronización:', result);
      setMessage({
        type: 'success',
        text: 'Los gastos de esta sesión han sido sincronizados a tus gastos personales'
      });
    } catch (error) {
      console.error('Error al sincronizar gastos:', error);
      setMessage({
        type: 'error',
        text: 'Error al sincronizar los gastos a personales'
      });
    } finally {
      setLoading(false);
    }
  };

  // Efecto para manejar la apertura automática del formulario de sesión cuando se navega desde el dashboard
  useEffect(() => {
    if (location.state?.openSessionForm) {
      console.log('Abriendo formulario de sesión compartida desde navegación');
      handleAddSession();
      
      // Limpiar el estado para evitar que se abra nuevamente si se recarga la página
      window.history.replaceState({}, document.title);
    }
  }, [location, handleAddSession]);

  if (sessionsLoading && !sessions.length) {
    return (
      <Container sx={{ px: 0, pt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container 
      maxWidth={false} 
      disableGutters 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        py: { xs: 1, sm: 2 },
        px: 0
      }}
    >
      <Box sx={{ px: { xs: 1, sm: 1.5 }, width: '100%' }}>
        {/* Sección de invitaciones pendientes */}
        {pendingInvitationsCount > 0 && (
          <Box sx={{ mb: isMobile ? 2 : 3 }}>
            <Button
              variant={showPendingInvitations ? "contained" : "outlined"}
              color="primary"
              startIcon={<NotificationsIcon />}
              onClick={() => setShowPendingInvitations(!showPendingInvitations)}
              endIcon={
                <Chip 
                  label={pendingInvitationsCount} 
                  color="error" 
                  size={isMobile ? "small" : "small"} 
                  sx={{ 
                    ml: 1, 
                    height: isMobile ? 18 : 20, 
                    minWidth: isMobile ? 18 : 20,
                    fontSize: isMobile ? '0.65rem' : '0.75rem'
                  }} 
                />
              }
              sx={{ 
                mb: 2,
                fontSize: isMobile ? '0.75rem' : '0.875rem'
              }}
              size={isMobile ? "small" : "medium"}
            >
              {isMobile ? 'Invitaciones' : 'Invitaciones Pendientes'}
            </Button>
            
            {showPendingInvitations && (
              <Paper sx={{ p: isMobile ? 1.5 : 2, mb: isMobile ? 2 : 4, borderRadius: 2 }}>
                <PendingInvitations 
                  onInvitationAccepted={handleInvitationAccepted}
                  onInvitationRejected={handleInvitationRejected}
                />
              </Paper>
            )}
          </Box>
        )}
        
        {/* Si no hay sesión seleccionada, mostrar la lista de sesiones */}
        {!currentSession ? (
          <Box>
            {sessionsError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {sessionsError}
              </Alert>
            )}
            
            <SessionList
              sessions={sessions}
              onSelectSession={handleSelectSession}
              onEditSession={handleEditSession}
              onDeleteSession={handleDeleteSession}
              onAddSession={handleAddSession}
            />
          </Box>
        ) : (
          <Box>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              mb: isMobile ? 2 : 4,
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                mb: isMobile ? 2 : 0,
                width: isMobile ? '100%' : 'auto'
              }}>
                <IconButton
                  onClick={() => { console.log('Click en retroceder sesión'); setCurrentSession(null); }}
                  sx={{ mr: 1.5, zIndex: 2000 }}
                  size={isMobile ? "small" : "medium"}
                >
                  <ArrowBackIcon fontSize={isMobile ? "small" : "medium"} />
                </IconButton>
                <Typography 
                  variant={isMobile ? "h5" : "h4"} 
                  component="h1"
                  sx={{ 
                    fontSize: isMobile ? '1.2rem' : '1.75rem',
                    fontWeight: 'bold'
                  }}
                >
                  {currentSession.name}
                </Typography>
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                gap: 1.5,
                flexDirection: isMobile ? 'column' : 'row',
                width: isMobile ? '100%' : 'auto'
              }}>
                {/* Navegador de meses mejorado para móviles y escritorio - solo para sesiones permanentes */}
                {currentSession.sessionType === 'permanent' && (
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: isMobile ? 2 : 0,
                    mt: { xs: 1, sm: 0 },
                    gap: 1,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    p: 0.5,
                    backgroundColor: 'background.paper'
                  }}>
                    {/* Botón MES ANTERIOR */}
                    <Button
                      variant="text"
                      color="primary"
                      onClick={handlePreviousMonth}
                      sx={{ 
                        minWidth: 40, 
                        width: 40, 
                        height: 38, 
                        p: 0,
                        borderRadius: 1.5,
                        zIndex: 2000,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <ChevronLeftIcon />
                    </Button>
                    
                    {/* Selector de MES */}
                    <Button
                      variant="text"
                      color="inherit"
                      onClick={goToCurrentMonth}
                      sx={{ 
                        flex: 1, 
                        height: 38, 
                        maxWidth: 200,
                        textTransform: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 'medium',
                        px: 2,
                        borderRadius: 1.5,
                        mx: 0.5,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      {isMobile ? getShortMonthName(selectedMonth) : monthNames[selectedMonth]} {selectedYear}
                    </Button>
                    
                    {/* Botón MES SIGUIENTE */}
                    <Button
                      variant="text"
                      color="primary"
                      onClick={handleNextMonth}
                      sx={{ 
                        minWidth: 40, 
                        width: 40, 
                        height: 38, 
                        p: 0,
                        borderRadius: 1.5,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <ChevronRightIcon />
                    </Button>
                    
                    {/* Botón HOY (tanto desktop como mobile) */}
                    <Button
                      variant="text"
                      color="primary"
                      onClick={goToCurrentMonth}
                      sx={{ 
                        minWidth: 40, 
                        width: 40, 
                        height: 38, 
                        p: 0, 
                        ml: 0.5,
                        borderRadius: 1.5,
                        display: { xs: 'none', sm: 'flex' },
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <TodayIcon />
                    </Button>
                  </Box>
                )}
                
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleSyncToPersonal}
                  sx={{ 
                    borderRadius: 2,
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    height: isMobile ? 'auto' : 40
                  }}
                  disabled={loading}
                  size={isMobile ? "small" : "medium"}
                  fullWidth={isMobile}
                >
                  {loading ? 'Sincronizando...' : (isMobile ? 'Sincronizar Gastos' : 'Sincronizar a Gastos Personales')}
                </Button>
              </Box>
            </Box>
            
            {message && (
              <Alert 
                severity={message.type} 
                sx={{ mb: isMobile ? 2 : 3 }}
                onClose={() => setMessage(null)}
              >
                {message.text}
              </Alert>
            )}
            
            {/* Mostrar el encabezado del mes solo para sesiones permanentes */}
            {currentSession.sessionType === 'permanent' && !isMobile && (
              <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>
                {monthNames[selectedMonth]} {selectedYear}
                {(selectedMonth !== today.getMonth() || selectedYear !== today.getFullYear()) && (
                  <Button
                    size="small"
                    variant="text"
                    onClick={goToCurrentMonth}
                    sx={{ ml: 2 }}
                  >
                    Ir al mes actual
                  </Button>
                )}
              </Typography>
            )}

            <Box sx={{ mb: isMobile ? 2 : 4 }}>
              <ExpenseList
                expenses={expenses}
                onAddExpense={handleAddExpense}
                onEditExpense={handleEditExpense}
                onDeleteExpense={handleDeleteExpense}
                total={calculateTotal()}
                loading={expensesLoading}
                userRole="Participante"
                currentSession={currentSession}
              />
            </Box>

            {currentSession.participants?.length > 0 && (
              <Box>
                <DistributionTable
                  participants={(() => {
                    const participantsList = [];
                    const addedUserIds = new Set(); // Para evitar duplicados

                    // Función para obtener el mejor nombre disponible
                    const getBestName = (participant) => {
                      // Si tenemos un objeto usuario completo
                      if (participant.userId && typeof participant.userId === 'object') {
                        const user = participant.userId;
                        
                        // Intentar obtener nombre+apellidos
                        if (user.nombre && user.apellidos) {
                          return `${user.nombre} ${user.apellidos}`.trim();
                        } else if (user.nombre) {
                          return user.nombre;
                        } else if (user.name) {
                          return user.name;
                        }
                      }
                      
                      // Usar el nombre explícito del participante si existe y no es el email
                      if (participant.name && 
                          participant.email && 
                          participant.name !== participant.email && 
                          !participant.email.includes(participant.name)) {
                        return participant.name;
                      }
                      
                      // Si todo lo demás falla, usar la parte local del email
                      return participant.email ? participant.email.split('@')[0] : 'Participante';
                    };
                    
                    // Procesar todos los participantes
                    const allParticipants = currentSession.participants || [];
                    
                    allParticipants.forEach(participant => {
                      // Obtener el ID del usuario
                      let userId = participant.userId;
                      
                      // Si es un objeto, extraer su ID
                      if (userId && typeof userId === 'object') {
                        userId = userId._id || userId.id || userId.toString();
                      }
                      
                      // Si no hay ID o ya fue agregado, saltar
                      if (!userId || addedUserIds.has(userId.toString())) {
                        return;
                      }
                      
                      // Registrar este ID como procesado
                      addedUserIds.add(userId.toString());
                      
                      // Obtener el mejor nombre disponible
                      const name = getBestName(participant);
                      
                      // Obtener el porcentaje de asignación si existe
                      const allocation = currentSession.allocations?.find(
                        a => {
                          const allocUserId = typeof a.userId === 'object' 
                            ? (a.userId._id || a.userId.id || a.userId.toString()) 
                            : a.userId;
                          return allocUserId?.toString() === userId.toString();
                        }
                      );
                      
                      participantsList.push({
                        userId: userId.toString(),
                        name: name,
                        email: participant.email,
                        percentage: allocation?.percentage || 0
                      });
                    });
                    
                    console.log('Participantes procesados para distribución:', participantsList);
                    return participantsList;
                  })()}
                  expenses={expenses}
                  onUpdateDistribution={handleUpdateDistribution}
                  loading={expensesLoading}
                  error={distributionError}
                />
              </Box>
            )}
          </Box>
        )}

        {/* Formularios modales */}
        <SessionForm
          open={showSessionForm}
          onClose={() => {
            setShowSessionForm(false);
            setEditingSession(null);
          }}
          onSubmit={handleSubmitSession}
          initialData={editingSession}
          loading={sessionsLoading}
          error={sessionsError}
        />

        <ExpenseForm
          open={showExpenseForm}
          onClose={() => {
            setShowExpenseForm(false);
            setEditingExpense(null);
          }}
          onSubmit={handleExpenseSubmit}
          initialData={editingExpense}
          loading={expensesLoading}
          error={expensesError}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      </Box>
    </Container>
  );
};

export default SharedSessions;