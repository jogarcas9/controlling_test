import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Today as TodayIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon
} from '@mui/icons-material';

import SessionList from './SessionList';
import SessionForm from './SessionForm';
import ExpenseList from './ExpenseList';
import ExpenseForm from './ExpenseForm';
import DistributionTable from './DistributionTable';

import { useSessions, useExpenses, useDistribution } from '../../hooks';
import sessionService from '../../services/sessionService';
import { formatMonthYear } from '../../utils/dateHelpers';

const SharedSessions = () => {
  // Estados locales
  const [currentSession, setCurrentSession] = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [error, setError] = useState(null);
  
  // Estados para la vista mensual
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  
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
    setSessions
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

  // Manejadores para la vista mensual
  const handleMonthChange = (event) => {
    setSelectedMonth(parseInt(event.target.value));
  };

  const handleYearChange = (event) => {
    setSelectedYear(parseInt(event.target.value));
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  // Añadir manejadores para navegar entre meses con flechas
  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Efectos
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Log adicional para depuración
  useEffect(() => {
    if (sessions) {
      console.log("SESIONES RECIBIDAS:", sessions.length, sessions);
      
      // Identificar las sesiones donde el usuario es creador
      const userId = localStorage.getItem('userId');
      const createdSessions = sessions.filter(s => 
        s.userId === userId || (s.userId && s.userId._id === userId)
      );
      
      console.log("SESIONES CREADAS POR EL USUARIO:", createdSessions.length, createdSessions);
      
      // Identificar las sesiones donde el usuario es participante
      const participantSessions = sessions.filter(s => {
        // Excluir las sesiones donde es creador
        if (s.userId === userId || (s.userId && s.userId._id === userId)) {
          return false;
        }
        
        // Buscar si es participante
        return s.participants?.some(p => {
          const participantId = p.userId?._id || p.userId;
          return participantId === userId || (participantId && participantId.toString() === userId);
        });
      });
      
      console.log("SESIONES DONDE ES PARTICIPANTE:", participantSessions.length, participantSessions);
    }
  }, [sessions]);

  useEffect(() => {
    if (currentSession) {
      fetchExpenses();
    }
  }, [currentSession, fetchExpenses, selectedMonth, selectedYear]);

  // Manejadores de sesiones
  const handleSelectSession = (session) => {
    console.log('Seleccionando sesión:', session);
    // Verificar que la sesión tenga un ID antes de establecerla como actual
    if (!session || !session._id) {
      console.error('Se intentó seleccionar una sesión sin ID:', session);
      return;
    }
    
    // Verificar si la sesión está bloqueada
    if (isSessionLocked(session)) {
      const status = getSessionStatus(session);
      
      if (status === 'invitation') {
        // Si es una invitación pendiente, mostrar mensaje de que la funcionalidad se ha eliminado
        alert('La funcionalidad de invitaciones ha sido eliminada de la aplicación.');
        return;
      } else if (status === 'waiting') {
        alert('Esta sesión está bloqueada. La funcionalidad de invitaciones ha sido eliminada.');
        return;
      } else if (status === 'pending') {
        alert('La funcionalidad de invitaciones ha sido eliminada de la aplicación.');
        return;
      } else {
        alert('No tienes acceso a esta sesión.');
        return;
      }
    }
    
    // Si la sesión está desbloqueada, establecerla como actual
    setCurrentSession(session);
  };

  const handleAddSession = () => {
    setEditingSession(null);
    setShowSessionForm(true);
  };

  const handleEditSession = (session) => {
    // Solo el creador y administradores pueden editar la sesión
    const userId = localStorage.getItem('userId');
    const userRole = getUserRoleInSession(session, userId);
    
    if (userRole === 'admin') {
      setEditingSession(session);
      setShowSessionForm(true);
    } else {
      alert('No tienes permiso para editar esta sesión. Solo los administradores pueden editar sesiones.');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta sesión?')) {
      try {
        console.log('Intentando eliminar sesión:', sessionId);
        await deleteSession(sessionId);
        
        if (currentSession?._id === sessionId) {
          setCurrentSession(null);
        }
      } catch (error) {
        console.error('Error al eliminar sesión:', error);
        alert(`Error al eliminar la sesión: ${error.response?.data?.msg || error.message}`);
      }
    }
  };

  // Función para obtener el rol del usuario en la sesión actual
  const getUserRoleInSession = (session, userId) => {
    if (!session || !userId) return null;
    
    // Si el usuario es el creador de la sesión
    if (session.userId === userId) {
      return 'admin';
    }
    
    // Buscar al usuario en la lista de participantes
    const participant = session.participants?.find(p => p.userId === userId || (p.userId && p.userId._id === userId));
    return participant ? participant.role : null;
  };

  const handleSessionSubmit = async (sessionData) => {
    try {
      setError(null);
      console.log('Recibiendo datos del formulario:', JSON.stringify(sessionData, null, 2));
      
      if (editingSession) {
        await updateSession(editingSession._id, sessionData);
        if (currentSession?._id === editingSession._id) {
          setCurrentSession(prev => ({ ...prev, ...sessionData }));
        }
      } else {
        console.log('Creando nueva sesión...');
        
        // Validar que haya participantes
        if (!sessionData.participants || !Array.isArray(sessionData.participants)) {
          throw new Error('La lista de participantes no es válida');
        }

        const newSession = await sessionService.createSession(sessionData);
        console.log('Nueva sesión creada:', newSession);
        
        // Actualizar la lista de sesiones con un refresco completo
        fetchSessions();
        
        // Si no hay sesión seleccionada, seleccionar la nueva
        if (!currentSession) {
          setCurrentSession(newSession);
        }
      }
      
      setShowSessionForm(false);
      setEditingSession(null);
      
    } catch (error) {
      console.error('Error al guardar sesión:', error);
      setError(error.response?.data?.msg || error.message || 'Error al guardar la sesión');
    }
  };

  // Manejadores de gastos
  const handleAddExpense = () => {
    setEditingExpense(null);
    setShowExpenseForm(true);
  };

  const handleEditExpense = (expense) => {
    // Verificar los permisos de usuario para editar gastos
    const userId = localStorage.getItem('userId');
    const userRole = getUserRoleInSession(currentSession, userId);
    
    // Administradores y creadores pueden editar cualquier gasto
    // Usuarios normales solo pueden editar sus propios gastos
    if (userRole === 'admin' || expense.user === userId) {
      setEditingExpense(expense);
      setShowExpenseForm(true);
    } else {
      alert('No tienes permiso para editar este gasto.');
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
      
      // Sincronizar solo después de que el gasto se haya guardado correctamente
      try {
        await sessionService.syncToPersonal(currentSession._id);
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

    if (window.confirm('¿Estás seguro de que deseas eliminar este gasto?' + 
      (expense.isRecurring ? '\nEste es un gasto recurrente. Se eliminarán todas las versiones futuras.' : ''))) {
      try {
        // Eliminar el gasto y dejar que el hook maneje la actualización del estado
        await deleteExpense(currentSession._id, expense._id);
        
        // Sincronizar después de eliminar el gasto
        try {
          await sessionService.syncToPersonal(currentSession._id);
        } catch (syncError) {
          console.error('Error en la sincronización después de eliminar:', syncError);
        }
      } catch (error) {
        console.error('Error al eliminar el gasto:', error);
        alert('Error al eliminar el gasto: ' + (error.response?.data?.msg || error.message));
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
      await sessionService.updateDistribution(currentSession._id, distribution);
      
      // Actualizar el estado local con la sesión actualizada
      setCurrentSession(prev => ({
        ...prev,
        allocation: distribution
      }));

      // Recargar la sesión para asegurar que tenemos los datos actualizados
      const response = await sessionService.getSession(currentSession._id);
      setCurrentSession(response.data);

    } catch (error) {
      console.error('Error al actualizar la distribución:', error);
      alert('Error al actualizar la distribución. Por favor, intenta de nuevo.');
    }
  };

  // Manejador para sincronizar gastos compartidos con gastos personales
  const handleSyncToPersonal = async () => {
    if (!currentSession || !currentSession._id) {
      console.error('No hay una sesión seleccionada');
      return;
    }
    
    try {
      const response = await sessionService.syncToPersonal(currentSession._id);
      const result = response.data;
      
      console.log('Resultado de sincronización:', result);
      
      alert(`Sincronización completada.\nGastos procesados: ${result.sync.processed}\nCreados: ${result.sync.created}\nActualizados: ${result.sync.updated}`);
    } catch (error) {
      console.error('Error al sincronizar gastos:', error);
      alert('Error al sincronizar gastos: ' + (error.response?.data?.msg || error.message));
    }
  };

  // Función para obtener estado detallado de una sesión para UI
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
        return 'waiting'; // Cambiado de 'invitation' a 'waiting' - invitaciones eliminadas
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

  // Función para determinar si una sesión está bloqueada para el usuario actual
  const isSessionLocked = (session) => {
    if (!session) return true;
    
    const userId = localStorage.getItem('userId');
    console.log(`Verificando bloqueo para sesión ${session._id}`);
    
    // Si la sesión tiene la propiedad isLocked, usarla directamente
    if (session.hasOwnProperty('isLocked')) {
      console.log(`Estado de bloqueo de la sesión: ${session.isLocked ? 'Bloqueada' : 'Desbloqueada'}`);
      return session.isLocked;
    }
    
    // Si no tiene la propiedad, verificar por el estado de los participantes
    const allAccepted = session.participants?.every(p => p.status === 'accepted');
    console.log(`¿Todos los participantes han aceptado? ${allAccepted}`);
    
    return !allAccepted;
  };
  
  // Función para obtener el color del chip según el estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
      case 'waiting':
        return 'warning';
      case 'invitation':
        return 'info';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  // Función para obtener el texto del estado
  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'pending':
        return 'Pendiente de respuestas';
      case 'waiting':
        return 'Esperando otros participantes';
      case 'invitation':
        return 'Invitación pendiente';
      case 'rejected':
        return 'Rechazada';
      default:
        return 'Desconocido';
    }
  };
  
  if (sessionsLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {!currentSession ? (
        <>
          {error && error.includes('invitación') ? (
            <Alert 
              severity="info" 
              variant="filled"
              sx={{ 
                mb: 3, 
                display: 'flex', 
                alignItems: 'center',
                '& .MuiAlert-icon': {
                  fontSize: '1.5rem'
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                <Typography variant="body1">
                  {error}
                </Typography>
                <Button 
                  variant="contained" 
                  color="warning" 
                  size="small"
                  onClick={() => {
                    // Desplazar a la sección de invitaciones pendientes
                    const pendingSection = document.querySelector('[data-section="pending-invitations"]');
                    if (pendingSection) {
                      pendingSection.scrollIntoView({ behavior: 'smooth' });
                    }
                    setError(null);
                  }}
                >
                  Ver invitaciones
                </Button>
              </Box>
            </Alert>
          ) : error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {sessionsError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {sessionsError}
            </Alert>
          )}

          <SessionList
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onEditSession={handleEditSession}
            onDeleteSession={handleDeleteSession}
            onAddSession={handleAddSession}
            renderSessionStatus={(session) => {
              const status = getSessionStatus(session);
              return (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={getStatusText(status)}
                    color={getStatusColor(status)}
                    size="small"
                    icon={
                      status === 'active' ? <CheckCircleIcon /> :
                      status === 'rejected' ? <CancelIcon /> :
                      <HourglassEmptyIcon />
                    }
                  />
                </Stack>
              );
            }}
          />
        </>
      ) : (
        <Box>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            mb: 4 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                onClick={() => setCurrentSession(null)}
                sx={{ mr: 2 }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h4" component="h1">
                {currentSession.name}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Botones de navegación para sesión permanente */}
              {currentSession.sessionType === 'permanent' && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton 
                    size="small" 
                    color="primary" 
                    onClick={handlePreviousMonth}
                    title="Mes anterior"
                    sx={{ 
                      border: '1px solid', 
                      borderColor: 'divider',
                      borderRadius: 2
                    }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  
                  <Typography variant="subtitle1" sx={{ mx: 2 }}>
                    {monthNames[selectedMonth]} {selectedYear}
                  </Typography>
                  
                  <IconButton 
                    size="small" 
                    color="primary" 
                    onClick={handleNextMonth}
                    title="Mes siguiente"
                    sx={{ 
                      border: '1px solid', 
                      borderColor: 'divider',
                      borderRadius: 2
                    }}
                  >
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                  
                  <IconButton 
                    size="small" 
                    color="primary" 
                    onClick={goToCurrentMonth}
                    title="Ir al mes actual"
                    sx={{ 
                      border: '1px solid', 
                      borderColor: 'divider',
                      borderRadius: 2,
                      ml: 1
                    }}
                  >
                    <TodayIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              
              <Button
                variant="outlined"
                color="primary"
                onClick={handleSyncToPersonal}
                sx={{ borderRadius: 2 }}
              >
                Sincronizar a Gastos Personales
              </Button>
            </Box>
          </Box>
          
          {currentSession.sessionType === 'permanent' && (
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

          <Box sx={{ mb: 4 }}>
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
                participants={[
                  ...new Map(currentSession.participants.map(p => [
                    typeof p.userId === 'object' ? p.userId.toString() : p.userId,
                    {
                      userId: typeof p.userId === 'object' ? p.userId.toString() : p.userId,
                      name: p.name,
                      email: p.email,
                      percentage: currentSession.allocation?.find(
                        a => a.userId.toString() === (typeof p.userId === 'object' ? p.userId.toString() : p.userId)
                      )?.percentage || Math.round(100 / currentSession.participants.length)
                    }
                  ])).values()
                ]}
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
        onSubmit={handleSessionSubmit}
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
      />
    </Container>
  );
};

export default SharedSessions;