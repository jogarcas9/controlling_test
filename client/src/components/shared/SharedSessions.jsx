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
  MenuItem
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Today as TodayIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';

import SessionList from './SessionList';
import SessionForm from './SessionForm';
import ExpenseList from './ExpenseList';
import ExpenseForm from './ExpenseForm';
import DistributionTable from './DistributionTable';

import { useSessions, useExpenses, useDistribution } from '../../hooks';
import * as sharedSessionService from '../../services/sharedSessionService';
import * as expenseService from '../../services/expenseService';
import { formatMonthYear } from '../../utils/dateHelpers';

const SharedSessions = () => {
  // Estados locales
  const [currentSession, setCurrentSession] = useState(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  
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
    inviteParticipants
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

  // Manejadores de sesiones
  const handleSelectSession = (session) => {
    console.log('Seleccionando sesión:', session);
    // Verificar que la sesión tenga un ID antes de establecerla como actual
    if (session && session._id) {
      if (session.isLocked) {
        // Si la sesión está bloqueada, mostrar un mensaje
        alert('Esta sesión está pendiente de confirmación por parte de los participantes. No se puede acceder hasta que todos los participantes acepten la invitación.');
        return;
      }
      setCurrentSession(session);
    } else {
      console.error('Se intentó seleccionar una sesión sin ID:', session);
    }
  };

  const handleAddSession = () => {
    setEditingSession(null);
    setShowSessionForm(true);
  };

  const handleEditSession = (session) => {
    // Solo el creador y administradores pueden editar la sesión
    const userId = localStorage.getItem('userId');
    const userRole = getUserRoleInSession(session, userId);
    
    if (userRole === 'Creador' || userRole === 'Administrador') {
      setEditingSession(session);
      setShowSessionForm(true);
    } else {
      alert('No tienes permiso para editar esta sesión. Solo los administradores pueden editar sesiones.');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    // Eliminamos la verificación de roles para permitir que cualquier usuario pueda eliminar sesiones
    
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
    if (session.user === userId) {
      return 'Creador';
    }
    
    // Buscar al usuario en la lista de participantes
    const participant = session.participants?.find(p => p.userId === userId || (p.userId && p.userId._id === userId));
    return participant ? participant.role : null;
  };

  const handleSessionSubmit = async (sessionData) => {
    try {
      console.log('Recibiendo datos del formulario:', JSON.stringify(sessionData, null, 2));
      
      if (editingSession) {
        await updateSession(editingSession._id, sessionData);
        if (currentSession?._id === editingSession._id) {
          setCurrentSession(prev => ({ ...prev, ...sessionData }));
        }
      } else {
        console.log('Creando nueva sesión...');
        // Asegurarnos de que los participantes tengan el formato correcto
        const formattedData = {
          ...sessionData,
          participants: sessionData.participants.map(p => ({
            email: p.email,
            canEdit: p.canEdit || false,
            canDelete: p.canDelete || false
          }))
        };
        
        const response = await createSession(formattedData);
        
        // Extraer los datos de la sesión (puede estar en .data o directo)
        const newSession = response.data || response;
        console.log('Sesión creada:', JSON.stringify(newSession, null, 2));
        
        // Asegurarse que tenemos un ID de sesión válido
        const sessionId = newSession._id;
        if (!sessionId) {
          console.error('La respuesta no incluye un ID de sesión válido:', newSession);
          throw new Error('No se pudo obtener el ID de la sesión creada');
        }
        
        // Enviar invitaciones a los participantes con roles
        if (formattedData.participants && formattedData.participants.length > 0) {
          try {
            // Pasar la lista de participantes completa con sus permisos
            const inviteResponse = await inviteParticipants(sessionId, formattedData.participants);
            console.log('Respuesta de invitación:', inviteResponse);
            
            // Mostrar mensaje de éxito
            alert(`Invitaciones enviadas correctamente a ${formattedData.participants.length} participantes.`);
          } catch (inviteError) {
            console.error('Error al enviar invitaciones:', inviteError);
            alert('Error al enviar invitaciones: ' + (inviteError.response?.data?.msg || inviteError.message));
          }
        }
        
        // Recargar la lista de sesiones sin seleccionar la nueva
        await fetchSessions();
      }
      setShowSessionForm(false);
      setEditingSession(null);
    } catch (error) {
      console.error('Error al guardar la sesión:', error);
      alert('Error al guardar la sesión: ' + (error.response?.data?.msg || error.message));
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
    if (userRole === 'Administrador' || userRole === 'Creador' || expense.user === userId) {
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

    if (window.confirm('¿Estás seguro de que deseas eliminar este gasto?' + 
      (expense.isRecurring ? '\nEste es un gasto recurrente. Se eliminarán todas las versiones futuras.' : ''))) {
      try {
        // Eliminar el gasto y dejar que el hook maneje la actualización del estado
        await deleteExpense(expense._id);
        
        // Sincronizar después de eliminar el gasto
        try {
          await sharedSessionService.syncToPersonal(currentSession._id);
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
      await sharedSessionService.updateDistribution(currentSession._id, distribution);
      
      // Actualizar el estado local con la sesión actualizada
      setCurrentSession(prev => ({
        ...prev,
        allocation: distribution
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
      console.error('No hay una sesión seleccionada');
      return;
    }
    
    try {
      const response = await sharedSessionService.syncToPersonal(currentSession._id);
      const result = response.data;
      
      console.log('Resultado de sincronización:', result);
      
      alert(`Sincronización completada.\nGastos procesados: ${result.sync.processed}\nCreados: ${result.sync.created}\nActualizados: ${result.sync.updated}`);
    } catch (error) {
      console.error('Error al sincronizar gastos:', error);
      alert('Error al sincronizar gastos: ' + (error.response?.data?.msg || error.message));
    }
  };

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
    <Container maxWidth={false} sx={{ px: 0, pt: 3 }}>
      {sessionsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {sessionsError}
        </Alert>
      )}

      {!currentSession ? (
        <SessionList
          sessions={sessions}
          onSelectSession={handleSelectSession}
          onEditSession={handleEditSession}
          onDeleteSession={handleDeleteSession}
          onAddSession={handleAddSession}
        />
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