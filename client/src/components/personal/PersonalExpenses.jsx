import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  FormHelperText,
  InputAdornment,
  FormControlLabel,
  Switch,
  Tooltip,
  Fab,
  Divider,
  Checkbox,
  Slide
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowUpward as IncomeIcon,
  ArrowDownward as ExpenseIcon,
  Restaurant as RestaurantIcon,
  DirectionsCar as DirectionsCarIcon,
  Home as HomeIcon,
  SportsEsports as SportsEsportsIcon,
  EuroSymbol as EuroSymbolIcon,
  MoreHoriz as MoreHorizIcon,
  CalendarToday as CalendarTodayIcon,
  Timer as TimerIcon,
  Work as WorkIcon,
  Today as TodayIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  FiberManualRecord as FiberManualRecordIcon,
  Remove as RemoveIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import axios from 'axios';
import format from 'date-fns/format';
import es from 'date-fns/locale/es';
import { useTranslation } from 'react-i18next';
import { alpha } from '@mui/material/styles';
import useRealTimeUpdates from '../../hooks/useRealTimeUpdates';
import { RealTimeContext } from '../../App';
import { useTheme, useMediaQuery } from '@mui/material';
import { useLocation } from 'react-router-dom';

// Importar componentes y utilidades personalizadas
import ExpenseCard from './ExpenseCard';
import { 
  EXPENSE_CATEGORIES, 
  INCOME_CATEGORIES, 
  CATEGORY_ICONS, 
  CATEGORY_COLORS, 
  MONTH_NAMES,
  formatAmount,
  isSharedExpense,
  generateExpenseKey,
  getCategoryColor
} from '../../utils/expenseUtils';

// Renombrando variables no utilizadas para evitar advertencias
const _Dialog = Dialog;
const _DialogTitle = DialogTitle;
const _DialogContent = DialogContent;
const _DialogActions = DialogActions;
const _TextField = TextField;
const _FormControl = FormControl;
const _InputLabel = InputLabel;
const _Select = Select;
const _MenuItem = MenuItem;
const _Grid = Grid;
const _FormHelperText = FormHelperText;
const _InputAdornment = InputAdornment;
const _FormControlLabel = FormControlLabel;
const _Switch = Switch;
const _ExpenseIcon = ExpenseIcon;
const _CloseIcon = CloseIcon;

const INITIAL_EXPENSE_DATA = {
  amount: '',
  name: '',
  description: '',
  category: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  type: 'expense',
  isRecurring: false,
  recurringDay: ''
};

const SlideTransition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const PersonalExpenses = () => {
  const { t } = useTranslation();
  const currentDate = new Date();
  const theme = useTheme();
  const location = useLocation();
  
  // Añadir el contexto de tiempo real
  const { showNotification } = React.useContext(RealTimeContext);
  
  // Mejorar la detección de móvil usando useMediaQuery de Material UI
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // Estados
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseData, setExpenseData] = useState(INITIAL_EXPENSE_DATA);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [categories, setCategories] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [editingExpense, setEditingExpense] = useState(null);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const _formRef = React.useRef(null);

  // Nuevo estado para actualización en tiempo real
  const [lastRefreshTime, setLastRefreshTime] = useState(null);

  // Funciones de utilidad
  const resetForm = useCallback(() => {
    setExpenseData(INITIAL_EXPENSE_DATA);
    setSelectedExpense(null);
    setError(null);
  }, []);

  const closeDialog = useCallback(() => {
    setOpenExpenseDialog(false);
    resetForm();
  }, [resetForm]);

  // Funciones principales
  const fetchExpenses = useCallback(async () => {
    if (loading) {
      console.log('Carga en proceso, evitando duplicación');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Convertir el mes de 0-11 a 1-12 para la API
      const apiMonth = selectedMonth + 1;
      console.log(`Consultando gastos para mes: ${apiMonth}, año: ${selectedYear}`);

      const { data } = await axios.get('/api/personal-expenses', {
        headers: { 'x-auth-token': token },
        params: { month: apiMonth, year: selectedYear }
      });

      console.log('Datos recibidos de la API:', data);

      // Filtrar duplicados basados en una combinación única de propiedades
      const uniqueExpenses = data.reduce((acc, current) => {
        const key = `${current.amount}-${current.category}-${current.date}-${current.description}`;
        if (!acc.has(key)) {
          acc.set(key, current);
        } else {
          console.log('Gasto duplicado detectado:', current);
        }
        return acc;
      }, new Map());

      setExpenses(Array.from(uniqueExpenses.values()));
    } catch (err) {
      console.error('Error al cargar gastos:', err);
      setError('Error al cargar los gastos: ' + (err.response?.data?.msg || 'Error de conexión'));
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  // Configurar actualizaciones en tiempo real
  const { isConnected, lastUpdate } = useRealTimeUpdates({
    onExpenseAdded: useCallback((data) => {
      console.log('Nuevo gasto detectado:', data);
      // Verificar si el gasto pertenece al mes actual antes de refrescar
      try {
        if (data && data.date) {
          const expenseDate = new Date(data.date);
          const expenseMonth = expenseDate.getMonth();
          const expenseYear = expenseDate.getFullYear();
          
          if (expenseMonth === selectedMonth && expenseYear === selectedYear) {
            console.log('Refrescando datos automáticamente por nuevo gasto en el mes actual');
            // Usamos un timeout para evitar múltiples refrescos simultáneos
            setTimeout(() => fetchExpenses(), 300);
          }
        }
      } catch (error) {
        console.error('Error procesando evento onExpenseAdded:', error);
      }
    }, [fetchExpenses, selectedMonth, selectedYear]),
    
    onExpenseUpdated: useCallback((data) => {
      console.log('Gasto actualizado detectado:', data);
      // Verificar si el gasto pertenece al mes actual antes de refrescar
      try {
        if (data && data.date) {
          const expenseDate = new Date(data.date);
          const expenseMonth = expenseDate.getMonth();
          const expenseYear = expenseDate.getFullYear();
          
          if (expenseMonth === selectedMonth && expenseYear === selectedYear) {
            console.log('Refrescando datos automáticamente por actualización de gasto en el mes actual');
            // Usamos un timeout para evitar múltiples refrescos simultáneos
            setTimeout(() => fetchExpenses(), 300);
          }
        }
      } catch (error) {
        console.error('Error procesando evento onExpenseUpdated:', error);
      }
    }, [fetchExpenses, selectedMonth, selectedYear]),
    
    onExpenseDeleted: useCallback((data) => {
      console.log('Eliminación de gasto detectada:', data);
      try {
        // Para eliminaciones, usamos un flag para controlar si ya estamos refrescando
        if (!loading) {
          console.log('Refrescando datos automáticamente por eliminación de gasto');
          // Usamos un timeout para evitar múltiples refrescos simultáneos
          setTimeout(() => fetchExpenses(), 300);
        }
      } catch (error) {
        console.error('Error procesando evento onExpenseDeleted:', error);
      }
    }, [fetchExpenses, loading])
  });

  // Actualizar la marca de tiempo cuando se refresca
  useEffect(() => {
    if (lastUpdate) {
      setLastRefreshTime(lastUpdate);
    }
  }, [lastUpdate]);

  // Añadir manejadores para navegar entre meses con flechas
  const handlePreviousMonth = useCallback(() => {
    console.log("Ejecutando handlePreviousMonth", { selectedMonth, selectedYear });
    
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prevYear => prevYear - 1);
    } else {
      setSelectedMonth(prevMonth => prevMonth - 1);
    }
  }, [selectedMonth, selectedYear]);

  const handleNextMonth = useCallback(() => {
    console.log("Ejecutando handleNextMonth", { selectedMonth, selectedYear });
    
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prevYear => prevYear + 1);
    } else {
      setSelectedMonth(prevMonth => prevMonth + 1);
    }
  }, [selectedMonth, selectedYear]);

  const goToCurrentMonth = useCallback(() => {
    console.log("Ejecutando goToCurrentMonth");
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  }, []);

  // Manejadores de eventos
  const _handleExpenseChange = useCallback((e) => {
    const { name, value } = e.target;
    setExpenseData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const _handleRecurringChange = useCallback((e) => {
    const isRecurring = e.target.checked;
    setExpenseData(prev => ({
      ...prev,
      isRecurring,
      recurringDay: isRecurring ? new Date(prev.date).getDate().toString() : ''
    }));
  }, []);

  // Función para actualizar la fecha del formulario basada en el mes seleccionado
  const getInitialDateForSelectedMonth = useCallback(() => {
    const date = new Date();
    date.setMonth(selectedMonth);
    date.setFullYear(selectedYear);
    // Mantener el día actual pero ajustarlo si es mayor que los días del mes seleccionado
    const currentDay = date.getDate();
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    date.setDate(Math.min(currentDay, lastDayOfMonth));
    
    return format(date, 'yyyy-MM-dd');
  }, [selectedMonth, selectedYear]);

  // Función para mostrar correctamente el nombre del mes en dispositivos móviles
  const getShortMonthName = (monthIndex) => {
    return MONTH_NAMES[monthIndex].substring(0, 3);
  };

  // Función para generar una key única para cada gasto
  const generateExpenseKey = useCallback((expense) => {
    const timestamp = new Date(expense.date).getTime();
    const randomSuffix = Math.random().toString(36).substring(7);
    return `${expense._id}-${timestamp}-${expense.amount}-${randomSuffix}`;
  }, []);

  const _handleSubmit = async (e) => {
    e?.preventDefault();
    
    // Control estricto para prevenir múltiples envíos
    if (submitting) {
      console.log('Envío en proceso, evitando duplicación');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      amount: parseFloat(expenseData.amount),
      category: expenseData.category,
      name: expenseData.name || expenseData.description,
      description: expenseData.description,
      date: new Date(expenseData.date),
      type: expenseData.type,
      isRecurring: expenseData.isRecurring,
      recurringDay: expenseData.isRecurring ? 
        (expenseData.recurringDay || new Date(expenseData.date).getDate()) : 
        null
    };

    try {
      // Validaciones adicionales para prevenir datos inválidos
      if (!payload.amount || isNaN(payload.amount)) {
        throw new Error('El importe no es válido');
      }
      if (!payload.category) {
        throw new Error('La categoría es requerida');
      }
      if (!payload.date || isNaN(payload.date.getTime())) {
        throw new Error('La fecha no es válida');
      }

      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      let response;
      if (selectedExpense) {
        response = await axios.put(
          `/api/personal-expenses/${selectedExpense._id}`,
          payload,
          { 
            headers: { 'x-auth-token': token },
            timeout: 10000
          }
        );
      } else {
        response = await axios.post(
          '/api/personal-expenses',
          payload,
          { 
            headers: { 'x-auth-token': token },
            timeout: 10000
          }
        );
      }

      // Solo proceder si la respuesta fue exitosa
      if (response?.status === 200 || response?.status === 201) {
        closeDialog();
        // Usar Promise para asegurar el orden correcto de operaciones
        await new Promise(resolve => setTimeout(resolve, 100));
        await fetchExpenses();
      }
    } catch (err) {
      console.error('Error al guardar:', err);
      
      if (err.response?.status === 409) {
        const confirm = window.confirm(
          'Ya existe un gasto similar para esta fecha. ¿Deseas crearlo de todos modos?'
        );
        
        if (confirm) {
          try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
              '/api/personal-expenses',
              { ...payload, forceSave: true },
              { 
                headers: { 'x-auth-token': token },
                timeout: 10000
              }
            );
            
            if (response?.status === 200 || response?.status === 201) {
              closeDialog();
              await new Promise(resolve => setTimeout(resolve, 100));
              await fetchExpenses();
              return;
            }
          } catch (retryErr) {
            setError('Error al guardar el gasto: ' + (retryErr.response?.data?.msg || 'Error desconocido'));
          }
        }
      } else {
        setError('Error al guardar el gasto: ' + (err.response?.data?.msg || err.message || 'Error desconocido'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      // Verificar si el gasto proviene de una sesión compartida
      const expenseToDelete = expenses.find(expense => expense._id === id);
      
      if (!expenseToDelete) {
        setError('No se pudo encontrar el gasto a eliminar');
        return;
      }
      
      // Verificar si es un gasto de sesión compartida con isFromSharedSession
      if (expenseToDelete.isFromSharedSession) {
        setError('No se pueden eliminar gastos que provienen de una sesión compartida');
        return;
      }

      let confirmMessage = '¿Estás seguro de que deseas eliminar este gasto?';
      let deleteAllRecurring = false;
      
      // Si es un gasto recurrente, preguntar si quiere eliminar todas las instancias
      if (expenseToDelete?.isRecurring) {
        const isIncome = expenseToDelete.type === 'income';
        const confirmRecurring = window.confirm(
          `¿Deseas eliminar este ${isIncome ? 'ingreso' : 'gasto'} recurrente y todas sus instancias futuras?`
        );
        
        if (confirmRecurring) {
          deleteAllRecurring = true;
          confirmMessage = `¿Estás seguro? Esto eliminará este ${isIncome ? 'ingreso' : 'gasto'} y todas sus instancias futuras.`;
        }
      }
      
      if (!window.confirm(confirmMessage)) {
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      // Construir URL con los parámetros de eliminación según corresponda
      let deleteUrl = `/api/personal-expenses/${id}`;
      if (deleteAllRecurring) {
        deleteUrl += `?deleteAllRecurring=true&deleteFutureOnly=true`;
      }

      await axios.delete(deleteUrl, {
        headers: { 'x-auth-token': token }
      });

      // Recargar la lista de gastos
      await fetchExpenses();
      
      // Mostrar mensaje de éxito
      setError(null);
    } catch (err) {
      console.error('Error al eliminar:', err);
      setError('Error al eliminar el gasto: ' + (err.response?.data?.msg || 'Error desconocido'));
    }
  };

  const _openNewExpense = useCallback((type = 'expense') => {
    console.log(`Abriendo formulario para: ${type}`);
    resetForm();
    setExpenseData(prev => ({
      ...prev,
      type,
      category: type === 'income' ? 'Nómina' : 'Otros',
      date: getInitialDateForSelectedMonth()
    }));
    setOpenExpenseDialog(true);
  }, [resetForm, getInitialDateForSelectedMonth]);

  const handleViewExpense = useCallback((expense) => {
    setSelectedExpense(expense);
    setOpenViewDialog(true);
  }, []);

  const handleEdit = useCallback((expense) => {
    setSelectedExpense(expense);
    setExpenseData({
      amount: expense.amount || '',
      name: expense.name || '',
      description: expense.description || '',
      category: expense.category || '',
      date: expense.date ? format(new Date(expense.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      type: expense.type || 'expense',
      isRecurring: Boolean(expense.isRecurring),
      recurringDay: expense.recurringDay || ''
    });
    setOpenExpenseDialog(true);
  }, []);

  // Efectos
  useEffect(() => {
    console.log(`useEffect: Cargando gastos para mes ${selectedMonth + 1}/${selectedYear}`);
    fetchExpenses();
  }, [selectedMonth, selectedYear]);

  // Comprobar si hay que abrir un diálogo al cargar (desde el Dashboard)
  useEffect(() => {
    if (location.state?.openExpenseDialog && location.state?.expenseType) {
      const expenseType = location.state.expenseType;
      console.log(`Abriendo formulario desde navegación para: ${expenseType}`);
      
      // Pequeño delay para que renderice primero la UI
      setTimeout(() => {
        _openNewExpense(expenseType);
      }, 300);
      
      // Limpiar el estado para evitar que se abra de nuevo si se recarga la página
      window.history.replaceState({}, document.title);
    }
  }, [location, _openNewExpense]);

  // Cálculos derivados
  const _totals = expenses.reduce((acc, expense) => {
    const amount = Number(expense.amount || 0);
    if (expense.type === 'income') {
      acc.income += amount;
    } else {
      acc.expenses += amount;
    }
    acc.balance = acc.income - acc.expenses;
    return acc;
  }, { income: 0, expenses: 0, balance: 0 });

  // Renombrar totals para usarlo en la UI
  const totals = _totals;

  // Función para renderizar el panel de resumen financiero
  const renderFinancialSummary = () => {
    return (
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 2, sm: 3 }, 
          mb: 2, 
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'row', md: 'column' },
                alignItems: { xs: 'center', md: 'flex-start' },
                justifyContent: { xs: 'space-between', md: 'flex-start' },
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.success.main, 0.1),
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 0, md: 1 } }}>
                <ArrowUpwardIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="subtitle1" color="text.secondary" fontWeight="medium">
                  Total Ingresos
                </Typography>
              </Box>
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                sx={{ fontWeight: 'bold', color: 'success.main', mt: { xs: 0, md: 1 } }}
              >
                {formatAmount(totals.income)}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'row', md: 'column' },
                alignItems: { xs: 'center', md: 'flex-start' },
                justifyContent: { xs: 'space-between', md: 'flex-start' },
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.error.main, 0.1),
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 0, md: 1 } }}>
                <ArrowDownwardIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="subtitle1" color="text.secondary" fontWeight="medium">
                  Total Gastos
                </Typography>
              </Box>
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                sx={{ fontWeight: 'bold', color: 'error.main', mt: { xs: 0, md: 1 } }}
              >
                {formatAmount(totals.expenses)}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'row', md: 'column' },
                alignItems: { xs: 'center', md: 'flex-start' },
                justifyContent: { xs: 'space-between', md: 'flex-start' },
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(
                  totals.balance >= 0 ? theme.palette.info.main : theme.palette.warning.main, 
                  0.1
                ),
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 0, md: 1 } }}>
                <EuroSymbolIcon 
                  sx={{ 
                    mr: 1, 
                    color: totals.balance >= 0 ? 'info.main' : 'warning.main'
                  }} 
                />
                <Typography variant="subtitle1" color="text.secondary" fontWeight="medium">
                  Balance
                </Typography>
              </Box>
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                sx={{ 
                  fontWeight: 'bold', 
                  color: totals.balance >= 0 ? 'info.main' : 'warning.main',
                  mt: { xs: 0, md: 1 }
                }}
              >
                {formatAmount(totals.balance)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  // Función para renderizar la tabla o las tarjetas según el dispositivo
  const renderExpensesList = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={40} />
        </Box>
      );
    }

    console.log(`Renderizando lista de gastos: ${expenses.length} elementos`);
    
    if (!expenses || expenses.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No hay movimientos registrados para este mes.
        </Alert>
      );
    }

    if (isMobile) {
      return (
        <Box sx={{ mt: 2 }}>
          {/* Lista de gastos en formato de tarjetas para móviles */}
          {expenses
            .sort((a, b) => {
              // Prioridad 1: Ingresos
              if (a.type === 'income' && b.type !== 'income') return -1;
              if (a.type !== 'income' && b.type === 'income') return 1;
              
              // Prioridad 2: Gastos compartidos (usando isFromSharedSession)
              if (a.type !== 'income' && b.type !== 'income') {
                const aIsShared = a.isFromSharedSession === true;
                const bIsShared = b.isFromSharedSession === true;
                if (aIsShared && !bIsShared) return -1;
                if (!aIsShared && bIsShared) return 1;
              }
              
              // Por defecto, ordenar por fecha (más reciente primero)
              return new Date(b.date) - new Date(a.date);
            })
            .map(expense => (
              <ExpenseCard
                key={expense._id || generateExpenseKey(expense)}
                expense={expense}
                onView={handleViewExpense}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
        </Box>
      );
    }

    return (
      <TableContainer component={Paper} sx={{ mt: 2, borderRadius: 2, boxShadow: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell align="center">Categoría</TableCell>
              <TableCell align="center">Fecha</TableCell>
              <TableCell align="center">Monto</TableCell>
              <TableCell align="center">Recurrente</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Ordenar los gastos: primero ingresos, luego gastos compartidos, finalmente el resto */}
            {expenses
              .sort((a, b) => {
                // Prioridad 1: Ingresos
                if (a.type === 'income' && b.type !== 'income') return -1;
                if (a.type !== 'income' && b.type === 'income') return 1;
                
                // Prioridad 2: Gastos compartidos (usando isFromSharedSession)
                if (a.type !== 'income' && b.type !== 'income') {
                  const aIsShared = a.isFromSharedSession === true;
                  const bIsShared = b.isFromSharedSession === true;
                  if (aIsShared && !bIsShared) return -1;
                  if (!aIsShared && bIsShared) return 1;
                }
                
                // Por defecto, ordenar por fecha (más reciente primero)
                return new Date(b.date) - new Date(a.date);
              })
              .map(expense => {
                const date = new Date(expense.date);
                const formattedDate = format(date, 'dd MMM yyyy', { locale: es });
                const icon = CATEGORY_ICONS[expense.category] || <MoreHorizIcon fontSize="small" />;
                const isIncome = expense.type === 'income';
                const isShared = expense.isFromSharedSession === true;

                return (
                  <TableRow 
                    key={expense._id || generateExpenseKey(expense)}
                    sx={{
                      // Destacar visualmente según el tipo
                      bgcolor: isIncome 
                        ? alpha('#4caf50', 0.05)  // Verde claro para ingresos
                        : isShared 
                          ? alpha('#2196f3', 0.05)  // Azul claro para compartidos
                          : 'inherit',  // Color normal para el resto
                      cursor: 'pointer' // Indicar que es clickeable
                    }}
                    onClick={(e) => {
                      // Evitar que el click de los botones de acción se propague
                      if (e.defaultPrevented) return;
                      handleViewExpense(expense);
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {expense.name || expense.description}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        icon={icon}
                        label={expense.category}
                        sx={{
                          backgroundColor: `${getCategoryColor(expense.category)}20`,
                          color: getCategoryColor(expense.category)
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">{formattedDate}</TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          fontWeight: 'bold',
                          color: isIncome ? 'success.main' : 'error.main',
                          fontSize: '0.875rem'
                        }}
                      >
                        {isIncome ? '+' : '-'}{formatAmount(expense.amount)}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {expense.isRecurring ? (
                        <Chip
                          size="small"
                          icon={<TimerIcon fontSize="small" />}
                          label="Sí"
                          color="primary"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="No"
                          variant="outlined"
                          color="default"
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {/* Solo mostrar botones si no es un gasto de sesión compartida */}
                      {!isShared && (
                        <>
                          <Tooltip title="Editar">
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(expense);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton 
                              size="small" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(expense._id);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Función para refrescar manualmente
  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchExpenses();
      setLastRefreshTime(new Date());
      showNotification('Datos actualizados correctamente', 'success');
    } catch (error) {
      console.error('Error al refrescar datos:', error);
      showNotification('Error al refrescar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = useCallback((type) => {
    console.log(`Abriendo formulario para: ${type}`);
    _openNewExpense(type);
  }, [_openNewExpense]);

  // Componente para mostrar detalles de un gasto
  const renderExpenseDetails = () => {
    if (!selectedExpense) return null;
    
    const isIncome = selectedExpense.type === 'income';
    const isShared = selectedExpense.isFromSharedSession === true;
    const date = new Date(selectedExpense.date);
    
    return (
      <Dialog 
        open={openViewDialog} 
        onClose={() => setOpenViewDialog(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            zIndex: theme.zIndex.modal + 1
          },
          zIndex: theme.zIndex.modal + 1
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Detalle del {isIncome ? 'Ingreso' : isShared ? 'Gasto Compartido' : 'Gasto'}
          </Typography>
          {selectedExpense.date && (
            <Chip 
              icon={<CalendarTodayIcon />} 
              label={format(date, 'dd MMM yyyy', { locale: es })}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ mb: 1, fontWeight: 500 }}>
              {selectedExpense.name}
              {isShared && (
                <Chip 
                  label="Compartido" 
                  size="small" 
                  color="info" 
                  sx={{ ml: 1, fontSize: '0.7rem' }}
                />
              )}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {selectedExpense.description}
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Categoría
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Chip 
                    size="small"
                    label={selectedExpense.category}
                    sx={{
                      backgroundColor: `${getCategoryColor(selectedExpense.category)}20`,
                      color: getCategoryColor(selectedExpense.category)
                    }}
                    icon={CATEGORY_ICONS[selectedExpense.category]}
                  />
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Monto
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: isIncome ? 'success.main' : 'error.main',
                    mt: 0.5
                  }}
                >
                  {isIncome ? '+' : '-'}{formatAmount(selectedExpense.amount)}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Tipo
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {isIncome ? 'Ingreso' : 'Gasto'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Fecha
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {format(date, 'dd MMMM yyyy', { locale: es })}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Recurrente
                </Typography>
                <Typography variant="body1" sx={{ mt: 0.5 }}>
                  {selectedExpense.isRecurring ? 'Sí' : 'No'}
                </Typography>
              </Grid>
              
              {isShared && selectedExpense.sessionReference && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle1" fontWeight="medium" sx={{ mt: 1 }}>
                      Información de Gasto Compartido
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Sesión
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                      {selectedExpense.sessionReference.sessionName || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Porcentaje
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 0.5 }}>
                      {selectedExpense.sessionReference.percentage?.toFixed(2) || 0}%
                    </Typography>
                  </Grid>
                  {selectedExpense.sessionReference.totalAmount && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Monto Total de la Sesión
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 0.5 }}>
                          {formatAmount(selectedExpense.sessionReference.totalAmount)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Tu Parte (calculada)
                        </Typography>
                        <Typography variant="body1" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                          {formatAmount(selectedExpense.amount)} ({selectedExpense.sessionReference.percentage?.toFixed(2) || 0}%)
                        </Typography>
                      </Grid>
                    </>
                  )}
                  {selectedExpense.sessionReference.year && selectedExpense.sessionReference.month !== undefined && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Período
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {format(new Date(selectedExpense.sessionReference.year, selectedExpense.sessionReference.month, 1), 'MMMM yyyy', { locale: es })}
                      </Typography>
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          {/* Solo mostrar botón de editar si NO es un gasto compartido */}
          {!isShared && (
            <Button 
              onClick={() => handleEdit(selectedExpense)} 
              color="primary"
              startIcon={<EditIcon />}
            >
              Editar
            </Button>
          )}
          <Button 
            onClick={() => setOpenViewDialog(false)} 
            color="inherit"
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderExpenseDialog = () => {
    const isIncome = expenseData.type === 'income';
    const headerColor = isIncome ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1);
    const headerTextColor = theme.palette.getContrastText(headerColor);

    return (
      <Dialog
        open={openExpenseDialog}
        onClose={closeDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        TransitionComponent={SlideTransition}
        PaperProps={{
          elevation: isMobile ? 0 : 3,
          sx: {
            borderRadius: isMobile ? '16px 16px 0 0' : 2,
            height: isMobile ? '90vh' : 'auto',
            m: isMobile ? '10vh 0 0 0' : 2,
            position: isMobile ? 'fixed' : 'static',
            bottom: 0,
            maxHeight: isMobile ? '90vh' : '95vh',
            overflow: 'auto',
            bgcolor: theme.palette.background.paper
          }
        }}
      >
        <Box 
          sx={{ 
            position: 'sticky',
            top: 0,
            zIndex: 1,
            bgcolor: expenseData.type === 'income' 
              ? alpha(theme.palette.success.main, 0.1)
              : alpha(theme.palette.error.main, 0.1),
            borderRadius: isMobile ? '16px 16px 0 0' : '4px 4px 0 0'
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 2,
              color: expenseData.type === 'income' 
                ? theme.palette.success.main
                : theme.palette.error.main
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {expenseData.type === 'income' 
                ? <ArrowUpwardIcon color="success" /> 
                : <ArrowDownwardIcon color="error" />}
              <Typography variant="h6">
                {expenseData.type === 'income' ? 'Nuevo Ingreso' : 'Nuevo Gasto'}
              </Typography>
            </Box>
            <IconButton
              edge="end"
              onClick={closeDialog}
              sx={{
                color: expenseData.type === 'income' 
                  ? theme.palette.success.main
                  : theme.palette.error.main
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
        </Box>

        <DialogContent sx={{ p: isMobile ? 2 : 3, pt: isMobile ? 3 : 3 }}>
          <Box component="form" onSubmit={_handleSubmit} ref={_formRef}>
            <Grid container spacing={isMobile ? 2 : 3}>
              {/* Importe */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  variant="outlined"
                  name="amount"
                  type="number"
                  value={expenseData.amount}
                  onChange={_handleExpenseChange}
                  disabled={submitting}
                  required
                  placeholder="Importe *"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EuroSymbolIcon color={expenseData.type === 'income' ? "success" : "error"} />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    step: "0.01",
                    min: 0
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
              
              {/* Categoría */}
              <Grid item xs={12}>
                <FormControl fullWidth variant="outlined">
                  <Select
                    value={expenseData.category}
                    name="category"
                    onChange={_handleExpenseChange}
                    disabled={submitting}
                    required
                    displayEmpty
                    renderValue={selected => selected || "Categoría *"}
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }
                    }}
                  >
                    <MenuItem value="" disabled>
                      <em>Categoría *</em>
                    </MenuItem>
                    {expenseData.type === 'income' ? (
                      INCOME_CATEGORIES.map(cat => (
                        <MenuItem key={cat} value={cat}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {CATEGORY_ICONS[cat] || <FiberManualRecordIcon />}
                            {cat}
                          </Box>
                        </MenuItem>
                      ))
                    ) : (
                      EXPENSE_CATEGORIES.map(cat => (
                        <MenuItem key={cat} value={cat}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {CATEGORY_ICONS[cat] || <FiberManualRecordIcon />}
                            {cat}
                          </Box>
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Nombre */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  variant="outlined"
                  name="name"
                  value={expenseData.name}
                  onChange={_handleExpenseChange}
                  disabled={submitting}
                  required
                  placeholder={`Nombre del ${expenseData.type === 'income' ? 'ingreso' : 'gasto'} *`}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
              
              {/* Fecha */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  variant="outlined"
                  name="date"
                  type="date"
                  value={expenseData.date}
                  onChange={_handleExpenseChange}
                  disabled={submitting}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <CalendarTodayIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>

              {/* Recurrente */}
              <Grid item xs={12}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: alpha(expenseData.type === 'income' ? theme.palette.success.main : theme.palette.error.main, 0.05),
                    borderRadius: 2
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={expenseData.isRecurring}
                        onChange={(e) => {
                          _handleExpenseChange({
                            target: {
                              name: 'isRecurring',
                              value: e.target.checked
                            }
                          });
                        }}
                        color={expenseData.type === 'income' ? "success" : "error"}
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {`¿Es un ${expenseData.type === 'income' ? 'ingreso' : 'gasto'} recurrente?`}
                      </Typography>
                    }
                  />
                </Paper>
              </Grid>

              {/* Campo de día recurrente */}
              {expenseData.isRecurring && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    name="recurringDay"
                    type="number"
                    value={expenseData.recurringDay}
                    onChange={_handleExpenseChange}
                    disabled={submitting}
                    placeholder="Día del mes para recurrencia"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">del mes</InputAdornment>,
                    }}
                    inputProps={{
                      min: 1,
                      max: 31,
                    }}
                    helperText={`Día del mes en que se repetirá este ${expenseData.type === 'income' ? 'ingreso' : 'gasto'}`}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'background.paper',
                        borderRadius: 2
                      }
                    }}
                  />
                </Grid>
              )}
              
              {/* Descripción */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  variant="outlined"
                  name="description"
                  value={expenseData.description}
                  onChange={_handleExpenseChange}
                  disabled={submitting}
                  multiline
                  rows={3}
                  placeholder="Descripción (opcional)"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>
            </Grid>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions 
          sx={{ 
            p: 2, 
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            position: 'sticky',
            bottom: 0,
            zIndex: 1
          }}
        >
          <Button 
            onClick={closeDialog} 
            disabled={submitting}
            sx={{
              borderRadius: 2,
              px: 3
            }}
          >
            Cancelar
          </Button>
          <Button 
            onClick={_handleSubmit} 
            variant="contained" 
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
            color={expenseData.type === 'income' ? 'success' : 'error'}
            sx={{
              borderRadius: 2,
              px: 3
            }}
          >
            {submitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ width: '100%', p: { xs: 0.5, sm: 1 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography 
            variant="h4" 
            component="h1"
            className="page-title"
          >
            Gastos Personales
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Indicador de conexión en tiempo real */}
            <Tooltip title={isConnected ? 'Actualización automática activada' : 'Sin conexión en tiempo real'}>
              <FiberManualRecordIcon 
                sx={{ 
                  color: isConnected ? 'success.main' : 'error.main',
                  mr: 1,
                  fontSize: '0.8rem'
                }} 
              />
            </Tooltip>
            
            {/* Tiempo desde la última actualización */}
            {lastRefreshTime && (
              <Typography variant="caption" sx={{ mr: 2, color: 'text.secondary' }}>
                Actualizado: {new Date(lastRefreshTime).toLocaleTimeString()}
              </Typography>
            )}
            
            {/* Botón de refresco manual - Siempre visible */}
            <Tooltip title="Refrescar datos">
              <IconButton onClick={handleRefresh} disabled={loading} size="small" sx={{ mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        {/* Layout responsive para navegador de meses y botones */}
        <Box
          sx={{
            display: { xs: 'block', md: 'flex' },
            alignItems: 'center',
            justifyContent: { xs: 'center', md: 'space-between' },
            mb: 2,
            mt: 1,
            width: '100%'
          }}
        >
          {/* Navegador de meses mejorado para móviles y escritorio */}
          {!openExpenseDialog && (
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
                onClick={() => {
                  console.log('Click en flecha izquierda (retroceder mes)');
                  handlePreviousMonth();
                }}
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
                {isMobile ? getShortMonthName(selectedMonth) : MONTH_NAMES[selectedMonth]} {selectedYear}
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
          {/* Botones a la derecha en escritorio */}
          {!openExpenseDialog && (
            <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'center', md: 'flex-end' }, width: { xs: '100%', md: 'auto' } }}>
              <Button
                variant="contained"
                color="error"
                startIcon={<RemoveIcon />}
                onClick={() => {
                  _openNewExpense('expense');
                }}
                sx={{
                  borderRadius: 3,
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  px: 3,
                  py: 1.2,
                  bgcolor: 'error.main',
                  boxShadow: '0 2px 8px rgba(229, 57, 53, 0.10)',
                  '&:hover': {
                    bgcolor: 'error.dark',
                    transform: 'scale(1.04)',
                    transition: 'transform 0.1s',
                  },
                  minWidth: 120,
                  transition: 'transform 0.1s',
                  zIndex: 1
                }}
                TouchRippleProps={{
                  style: { color: '#fff' }
                }}
              >
                Gasto
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                onClick={() => {
                  _openNewExpense('income');
                }}
                sx={{
                  borderRadius: 3,
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  px: 3,
                  py: 1.2,
                  bgcolor: 'success.main',
                  boxShadow: '0 2px 8px rgba(50, 202, 128, 0.10)',
                  '&:hover': {
                    bgcolor: 'success.dark',
                    transform: 'scale(1.04)',
                    transition: 'transform 0.1s',
                  },
                  minWidth: 120,
                  transition: 'transform 0.1s',
                  zIndex: 1
                }}
                TouchRippleProps={{
                  style: { color: '#fff' }
                }}
              >
                Ingreso
              </Button>
            </Box>
          )}
        </Box>
        
        {/* Panel de resumen financiero */}
        {!loading && expenses.length > 0 && renderFinancialSummary()}
      
        {renderExpensesList()}

        {renderExpenseDialog()}
        {renderExpenseDetails()}
      </Box>
    </Container>
  );
};

export default PersonalExpenses;