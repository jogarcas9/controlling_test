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
  Fab
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
  Remove as RemoveIcon
} from '@mui/icons-material';
import axios from 'axios';
import format from 'date-fns/format';
import es from 'date-fns/locale/es';
import { useTranslation } from 'react-i18next';
import { alpha } from '@mui/material/styles';
import useRealTimeUpdates from '../../hooks/useRealTimeUpdates';
import { RealTimeContext } from '../../App';
import { useTheme, useMediaQuery } from '@mui/material';

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

// Constantes
const _EXPENSE_CATEGORIES = [
  'Alquiler',
  'Gasolina',
  'Gastos hijo',
  'Ocio',
  'Otros',
  'Tarjetas',
  'Préstamos',
  'Comida',
  'Transporte',
  'Servicios'
];

const _INCOME_CATEGORIES = ['Nómina', 'Otros'];

const CATEGORY_ICONS = {
  'Alquiler': <HomeIcon fontSize="small" />,
  'Gasolina': <DirectionsCarIcon fontSize="small" />,
  'Gastos hijo': <MoreHorizIcon fontSize="small" />,
  'Ocio': <SportsEsportsIcon fontSize="small" />,
  'Otros': <MoreHorizIcon fontSize="small" />,
  'Tarjetas': <EuroSymbolIcon fontSize="small" />,
  'Préstamos': <EuroSymbolIcon fontSize="small" />,
  'Comida': <RestaurantIcon fontSize="small" />,
  'Transporte': <DirectionsCarIcon fontSize="small" />,
  'Servicios': <EuroSymbolIcon fontSize="small" />,
  'Nómina': <WorkIcon fontSize="small" />
};

const CATEGORY_COLORS = {
  'Alquiler': '#4caf50',
  'Gasolina': '#f44336',
  'Gastos hijo': '#2196f3',
  'Ocio': '#ff9800',
  'Otros': '#9e9e9e',
  'Tarjetas': '#e91e63',
  'Préstamos': '#9c27b0',
  'Comida': '#8bc34a',
  'Transporte': '#3f51b5',
  'Servicios': '#00bcd4',
  'Nómina': '#4caf50'
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

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

// Funciones auxiliares
const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '0,00 €';
  return amount.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  });
};

const getCategoryColor = (category) => CATEGORY_COLORS[category] || '#9e9e9e';

// Componente de tarjeta para móviles
const ExpenseCard = ({ expense, onView, onEdit, onDelete }) => {
  const date = new Date(expense.date);
  const formattedDate = format(date, 'dd MMM yyyy', { locale: es });
  const icon = CATEGORY_ICONS[expense.category] || <MoreHorizIcon fontSize="small" />;
  const isIncome = expense.type === 'income';
  const isShared = !!expense.sessionReference;
  
  return (
    <Paper 
      sx={{ 
        p: 1.5, 
        mb: 1, 
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 1,
        cursor: 'pointer',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: 4,
          backgroundColor: isIncome 
            ? '#4caf50' 
            : isShared 
              ? '#2196f3' 
              : getCategoryColor(expense.category),
        }
      }}
      onClick={(e) => {
        // Evitar que el click de los botones de acción se propague
        if (e.defaultPrevented) return;
        onView(expense);
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Chip 
            size="small"
            icon={isIncome ? <IncomeIcon fontSize="small" /> : icon}
            label={expense.category}
            sx={{ 
              backgroundColor: isIncome 
                ? 'rgba(76, 175, 80, 0.1)' 
                : isShared 
                  ? 'rgba(33, 150, 243, 0.1)' 
                  : `${getCategoryColor(expense.category)}20`,
              color: isIncome 
                ? '#4caf50' 
                : isShared 
                  ? '#2196f3' 
                  : getCategoryColor(expense.category),
              fontSize: '0.7rem',
              height: 22
            }}
          />
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ ml: 1, fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}
          >
            <CalendarTodayIcon sx={{ fontSize: '0.85rem', mr: 0.5 }} />
            {formattedDate}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex' }}>
          <Tooltip title="Editar">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.preventDefault();
                onEdit(expense);
              }} 
              sx={{ p: 0.5 }}
            >
              <EditIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.preventDefault();
                onDelete(expense._id);
              }} 
              sx={{ p: 0.5 }}
            >
              <DeleteIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Nombre/Descripción del gasto */}
      <Box sx={{ 
        fontWeight: 600, 
        mb: 0.5, 
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Box component="span" sx={{ maxWidth: 'calc(100% - 70px)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {expense.name || expense.description}
        </Box>
        {(isIncome || isShared) && (
          <Box sx={{ ml: 1, display: 'flex' }}>
            {isIncome && (
              <Chip
                size="small"
                label="Ingreso"
                color="success"
                sx={{ height: 18, fontSize: '0.6rem' }}
              />
            )}
            {isShared && !isIncome && (
              <Chip
                size="small"
                label="Compartido"
                color="info"
                sx={{ height: 18, fontSize: '0.6rem' }}
              />
            )}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography 
          variant="body1" 
          sx={{ 
            fontWeight: 700, 
            color: isIncome ? 'success.main' : 'error.main',
            fontSize: '0.9rem'
          }}
        >
          {isIncome ? '+' : '-'}{formatAmount(expense.amount)}
        </Typography>
        
        {expense.isRecurring && (
          <Tooltip title="Gasto recurrente">
            <Chip
              icon={<TimerIcon fontSize="small" />}
              label="Recurrente"
              size="small"
              sx={{ 
                height: 20, 
                fontSize: '0.6rem',
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                color: 'primary.main'
              }}
            />
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
};

const PersonalExpenses = () => {
  const { t } = useTranslation();
  const currentDate = new Date();
  const theme = useTheme();
  
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
      
      if (expenseToDelete?.sessionReference?.sessionId) {
        setError('No se pueden eliminar gastos que provienen de una sesión compartida');
        return;
      }

      let confirmMessage = '¿Estás seguro de que deseas eliminar este gasto?';
      let deleteAllRecurring = false;
      
      // Si es un gasto recurrente, preguntar si quiere eliminar todas las instancias
      if (expenseToDelete?.isRecurring) {
        const confirmRecurring = window.confirm(
          '¿Deseas eliminar este gasto recurrente y todas sus instancias futuras?'
        );
        
        if (confirmRecurring) {
          deleteAllRecurring = true;
          confirmMessage = '¿Estás seguro? Esto eliminará este gasto y todas sus instancias futuras.';
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
              
              // Prioridad 2: Gastos compartidos (si tiene sessionReference es compartido)
              if (a.type !== 'income' && b.type !== 'income') {
                const aIsShared = !!a.sessionReference;
                const bIsShared = !!b.sessionReference;
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
                
                // Prioridad 2: Gastos compartidos (si tiene sessionReference es compartido)
                if (a.type !== 'income' && b.type !== 'income') {
                  const aIsShared = !!a.sessionReference;
                  const bIsShared = !!b.sessionReference;
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
                const isShared = !!expense.sessionReference;

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
                        {isIncome && (
                          <Chip
                            size="small"
                            icon={<IncomeIcon fontSize="small" />}
                            label="Ingreso"
                            color="success"
                            sx={{ fontSize: '0.7rem', ml: 1 }}
                          />
                        )}
                        {isShared && !isIncome && (
                          <Chip
                            size="small"
                            label="Compartido"
                            color="info"
                            sx={{ fontSize: '0.7rem', ml: 1 }}
                          />
                        )}
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

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 0.5, sm: 1 }, px: { xs: 0, sm: 0.5 } }}>
      <Box sx={{ width: '100%', p: { xs: 0.5, sm: 1 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h4" component="h1">
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
          {/* Navegador de meses a la izquierda en escritorio */}
          {!openExpenseDialog && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: { xs: 2, md: 0 } }}>
              <IconButton
                onClick={() => {
                  console.log('Click en flecha izquierda (retroceder mes)');
                  handlePreviousMonth();
                }}
                color="primary"
                size="large"
                sx={{
                  transition: 'transform 0.1s',
                  '&:active': { transform: 'scale(0.92)' },
                  zIndex: 2000,
                  pointerEvents: 'auto'
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <Typography variant="h6" sx={{ minWidth: 100, textAlign: 'center', fontWeight: 'bold' }}>
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </Typography>
              <IconButton
                onClick={handleNextMonth}
                color="primary"
                size="large"
                sx={{
                  transition: 'transform 0.1s',
                  '&:active': { transform: 'scale(0.92)' },
                  zIndex: 2000,
                  pointerEvents: 'auto'
                }}
              >
                <ChevronRightIcon />
              </IconButton>
              <Button
                variant="outlined"
                size="small"
                startIcon={<TodayIcon />}
                onClick={goToCurrentMonth}
                sx={{ ml: 2, borderRadius: 2, fontWeight: 'bold' }}
              >
                Hoy
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
                  zIndex: 10001
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
                  zIndex: 10001
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
      </Box>
      
      {renderExpensesList()}

      {/* Diálogo para crear/editar gastos */}
      <Dialog
        open={openExpenseDialog}
        onClose={() => !submitting && closeDialog()}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0px 8px 24px rgba(0,0,0,0.15)',
            overflow: 'visible'
          }
        }}
      >
        <DialogTitle
          sx={{
            py: 2,
            px: 3, 
            bgcolor: expenseData.type === 'income' ? 'success.light' : 'primary.main',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Typography variant="h6" component="div">{selectedExpense ? 'Editar' : 'Añadir'} {expenseData.type === 'income' ? 'Ingreso' : 'Gasto'}</Typography>
          <IconButton
            aria-label="close"
            onClick={() => !submitting && closeDialog()}
            sx={{
              color: 'white',
              width: 32,
              height: 32
            }}
            disabled={submitting}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 4 }}>
          <Box component="form" onSubmit={_handleSubmit} ref={_formRef} sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              {/* Importe */}
              <Grid item xs={12} sm={6}>
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
                    startAdornment: <InputAdornment position="start">€</InputAdornment>
                  }}
                  inputProps={{
                    step: "0.01",
                    min: 0
                  }}
                  sx={{ marginBottom: { xs: 2, sm: 0 } }}
                />
              </Grid>
              
              {/* Categoría */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth variant="outlined" sx={{ marginBottom: { xs: 2, sm: 0 } }}>
                  <InputLabel 
                    id="category-label" 
                    required
                    shrink={true}
                    style={{ display: 'none' }} // Ocultar label visualmente
                  >
                    Categoría *
                  </InputLabel>
                  <Select
                    labelId="category-label"
                    value={expenseData.category}
                    name="category"
                    onChange={_handleExpenseChange}
                    disabled={submitting}
                    required
                    displayEmpty
                    renderValue={selected => selected || "Categoría *"}
                  >
                    <MenuItem value="" disabled>
                      <em>Categoría *</em>
                    </MenuItem>
                    {expenseData.type === 'income' ? (
                      _INCOME_CATEGORIES.map(cat => (
                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                      ))
                    ) : (
                      _EXPENSE_CATEGORIES.map(cat => (
                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
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
                  placeholder="Nombre"
                  sx={{ marginBottom: { xs: 2, sm: 0 } }}
                />
              </Grid>
              
              {/* Fecha */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  variant="outlined"
                  name="date"
                  type="date"
                  value={expenseData.date}
                  onChange={_handleExpenseChange}
                  disabled={submitting}
                  required
                  placeholder="Fecha *"
                  inputProps={{
                    style: { height: isMobile ? '24px' : 'auto' }
                  }}
                  sx={{ marginBottom: { xs: 2, sm: 0 } }}
                />
              </Grid>
              
              {/* Switch para gasto recurrente */}
              <Grid item xs={12} sm={6}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 1.5, 
                    display: 'flex', 
                    alignItems: 'center',
                    height: '56px',
                    mb: { xs: 2, sm: 0 }
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={expenseData.isRecurring}
                        onChange={_handleRecurringChange}
                        name="isRecurring"
                        color="primary"
                        disabled={submitting}
                      />
                    }
                    label="Es un gasto recurrente"
                    sx={{ m: 0 }}
                  />
                </Paper>
                
                {expenseData.isRecurring && (
                  <TextField
                    fullWidth
                    variant="outlined"
                    margin="normal"
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
                    helperText="Día del mes en que se repetirá este gasto"
                    sx={{ mt: 2 }}
                  />
                )}
              </Grid>
              
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
                  placeholder="Descripción"
                />
              </Grid>
            </Grid>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button 
            onClick={closeDialog} 
            disabled={submitting}
            color="inherit"
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button 
            onClick={_handleSubmit} 
            variant="contained" 
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
            color={expenseData.type === 'income' ? 'success' : 'primary'}
            sx={{ ml: 1 }}
          >
            {submitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para visualizar detalles del gasto */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0px 8px 24px rgba(0,0,0,0.15)',
          }
        }}
      >
        {selectedExpense && (
          <>
            <DialogTitle sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid',
              borderColor: 'divider',
              p: 2,
              bgcolor: selectedExpense.type === 'income' ? 'success.light' : 'error.light',
              color: 'white'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }} component="div">
                {selectedExpense.type === 'income' ? (
                  <IncomeIcon sx={{ mr: 1 }} />
                ) : (
                  <ExpenseIcon sx={{ mr: 1 }} />
                )}
                {selectedExpense.type === 'income' ? 'Detalle del Ingreso' : 'Detalle del Gasto'}
              </Box>
              <IconButton
                aria-label="close"
                onClick={() => setOpenViewDialog(false)}
                sx={{
                  color: 'white'
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <Box sx={{ p: 1 }}>
                <Grid container spacing={3}>
                  {/* Nombre */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Nombre</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium', mt: 0.5 }}>
                      {selectedExpense.name || '-'}
                    </Typography>
                  </Grid>
                  
                  {/* Monto */}
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Importe</Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: selectedExpense.type === 'income' ? 'success.main' : 'error.main',
                        mt: 0.5,
                        fontSize: '1.1rem'
                      }}
                    >
                      {selectedExpense.type === 'income' ? '+' : '-'}{formatAmount(selectedExpense.amount)}
                    </Typography>
                  </Grid>
                  
                  {/* Categoría */}
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Categoría</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <Chip
                        icon={CATEGORY_ICONS[selectedExpense.category] || <MoreHorizIcon fontSize="small" />}
                        label={selectedExpense.category}
                        sx={{
                          backgroundColor: `${getCategoryColor(selectedExpense.category)}20`,
                          color: getCategoryColor(selectedExpense.category)
                        }}
                      />
                    </Box>
                  </Grid>
                  
                  {/* Fecha */}
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Fecha</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, display: 'flex', alignItems: 'center' }}>
                      <CalendarTodayIcon sx={{ fontSize: '1rem', mr: 0.5 }} />
                      {format(new Date(selectedExpense.date), 'dd MMM yyyy', { locale: es })}
                    </Typography>
                  </Grid>
                  
                  {/* Es recurrente */}
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Recurrente</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {selectedExpense.isRecurring ? (
                        <Chip
                          icon={<TimerIcon fontSize="small" />}
                          label="Sí"
                          color="primary"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          label="No"
                          variant="outlined"
                          color="default"
                        />
                      )}
                    </Box>
                  </Grid>
                  
                  {/* Día recurrente */}
                  {selectedExpense.isRecurring && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Día del mes para recurrencia
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.5 }}>
                        {selectedExpense.recurringDay || 'No especificado'}
                      </Typography>
                    </Grid>
                  )}
                  
                  {/* Descripción */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Descripción</Typography>
                    <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, whiteSpace: 'pre-wrap', minHeight: '60px' }}>
                      <Typography variant="body2">
                        {selectedExpense.description || '-'}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button onClick={() => handleEdit(selectedExpense)} color="primary" startIcon={<EditIcon />} variant="outlined">
                Editar
              </Button>
              <Button onClick={() => setOpenViewDialog(false)} color="inherit" sx={{ ml: 1 }}>
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default PersonalExpenses;