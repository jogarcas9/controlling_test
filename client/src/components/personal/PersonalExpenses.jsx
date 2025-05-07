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
  Tooltip
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
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';
import format from 'date-fns/format';
import es from 'date-fns/locale/es';
import { useTranslation } from 'react-i18next';
import { alpha } from '@mui/material/styles';

// Constantes
const EXPENSE_CATEGORIES = [
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

const INCOME_CATEGORIES = ['Nómina', 'Otros'];

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
const ExpenseCard = ({ expense, onEdit, onDelete }) => {
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
            <IconButton size="small" onClick={() => onEdit(expense)} sx={{ p: 0.5 }}>
              <EditIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton size="small" onClick={() => onDelete(expense._id)} sx={{ p: 0.5 }}>
              <DeleteIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Typography 
        variant="body2" 
        sx={{ 
          fontWeight: 600, 
          mb: 0.5, 
          fontSize: '0.8rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {expense.name || expense.description}
        {(isIncome || isShared) && (
          <Box component="span" sx={{ ml: 1 }}>
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
      </Typography>

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
  
  // Mejorar la detección de móvil usando useMediaQuery en lugar de window.matchMedia
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Esta función se ejecutará tanto en el renderizado inicial como al cambiar el tamaño de la ventana
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 600);
    };
    
    // Comprobar inicialmente
    checkMobile();
    
    // Agregar listener para cambios de tamaño
    window.addEventListener('resize', checkMobile);
    
    // Limpiar el listener cuando el componente se desmonte
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Estados
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseData, setExpenseData] = useState(INITIAL_EXPENSE_DATA);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

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

  // Añadir manejadores para navegar entre meses con flechas
  const handlePreviousMonth = useCallback((e) => {
    // Detener eventos predeterminados para evitar doble ejecución en táctiles
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("Ejecutando handlePreviousMonth", {selectedMonth, selectedYear});
    
    if (selectedMonth === 0) {
      console.log("Cambiando a diciembre del año anterior");
      setSelectedMonth(11);
      setSelectedYear(prevYear => prevYear - 1);
    } else {
      console.log(`Cambiando de ${selectedMonth} a ${selectedMonth - 1}`);
      setSelectedMonth(prevMonth => prevMonth - 1);
    }
  }, [selectedMonth, selectedYear]);

  const handleNextMonth = useCallback((e) => {
    // Detener eventos predeterminados para evitar doble ejecución en táctiles
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("Ejecutando handleNextMonth", {selectedMonth, selectedYear});
    
    if (selectedMonth === 11) {
      console.log("Cambiando a enero del año siguiente");
      setSelectedMonth(0);
      setSelectedYear(prevYear => prevYear + 1);
    } else {
      console.log(`Cambiando de ${selectedMonth} a ${selectedMonth + 1}`);
      setSelectedMonth(prevMonth => prevMonth + 1);
    }
  }, [selectedMonth, selectedYear]);

  const goToCurrentMonth = useCallback((e) => {
    // Prevenir comportamiento predeterminado para evitar problemas táctiles
    e?.preventDefault();
    console.log("Ejecutando goToCurrentMonth");
    
    // Agregar un pequeño retraso para móviles
    setTimeout(() => {
      const now = new Date();
      setSelectedMonth(now.getMonth());
      setSelectedYear(now.getFullYear());
      console.log("Volviendo al mes actual");
    }, 50);
  }, []);

  // Manejadores de eventos
  const handleExpenseChange = useCallback((e) => {
    const { name, value } = e.target;
    setExpenseData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleRecurringChange = useCallback((e) => {
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

  // Función para generar una key única para cada gasto
  const generateExpenseKey = useCallback((expense) => {
    const timestamp = new Date(expense.date).getTime();
    const randomSuffix = Math.random().toString(36).substring(7);
    return `${expense._id}-${timestamp}-${expense.amount}-${randomSuffix}`;
  }, []);

  const handleSubmit = async (e) => {
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

  const openNewExpense = useCallback((type = 'expense') => {
    resetForm();
    setExpenseData(prev => ({
      ...prev,
      type,
      category: type === 'income' ? 'Nómina' : 'Otros',
      date: getInitialDateForSelectedMonth()
    }));
    setOpenExpenseDialog(true);
  }, [resetForm, getInitialDateForSelectedMonth]);

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
  }, [fetchExpenses, selectedMonth, selectedYear]);

  // Cálculos derivados
  const totals = expenses.reduce((acc, expense) => {
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
              <TableCell>Categoría</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell>Recurrente</TableCell>
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
                          : 'inherit'  // Color normal para el resto
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
                    <TableCell>
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
                    <TableCell>{formattedDate}</TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 'bold',
                          color: isIncome ? 'success.main' : 'error.main'
                        }}
                      >
                        {isIncome ? '+' : '-'}{formatAmount(expense.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
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
                        <IconButton size="small" onClick={() => handleEdit(expense)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" onClick={() => handleDelete(expense._id)}>
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

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 1.5, sm: 3 }, px: { xs: 1, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 1.5, sm: 2 } }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontSize: { xs: '1.3rem', sm: '1.75rem' }, 
            fontWeight: 'bold' 
          }}
        >
          {t('personalExpenses')}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Botón GASTO simple y directo */}
          <Button
            variant="contained"
            color="primary"
            onClick={openNewExpense.bind(null, 'expense')}
            startIcon={<AddIcon />}
            sx={{ height: 40, fontSize: '0.85rem' }}
          >
            {isMobile ? 'Gasto' : 'Nuevo Gasto'}
          </Button>
          
          {/* Botón INGRESO simple y directo */}
          <Button
            variant="outlined"
            color="success"
            onClick={openNewExpense.bind(null, 'income')}
            startIcon={<AddIcon />}
            sx={{ height: 40, fontSize: '0.85rem' }}
          >
            {isMobile ? 'Ingreso' : 'Nuevo Ingreso'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, mb: 2 }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            {/* Navegación de mes mejorada para móviles */}
            <Box sx={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              p: 0.5,
              backgroundColor: 'background.paper'
            }}>
              {/* Botón MES ANTERIOR - Implementación mejorada para móviles */}
              <Box
                component="div"
                role="button"
                aria-label="Mes anterior"
                onClick={handlePreviousMonth}
                onTouchEnd={handlePreviousMonth}
                sx={{ 
                  minWidth: 40, 
                  width: 40, 
                  height: 38, 
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  cursor: 'pointer',
                  userSelect: 'none',
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  transition: 'background-color 0.2s',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.08)'
                  },
                  '&:active': {
                    backgroundColor: 'rgba(0, 0, 0, 0.12)'
                  }
                }}
              >
                <ChevronLeftIcon />
              </Box>
              
              {/* Selector de MES */}
              <Box
                component="div"
                role="button"
                aria-label="Mes actual"
                onClick={goToCurrentMonth}
                sx={{ 
                  flex: 1, 
                  height: 38, 
                  maxWidth: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 'medium',
                  borderRadius: 1.5,
                  mx: 0.5,
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  },
                  '&:active': {
                    backgroundColor: 'action.selected'
                  }
                }}
              >
                {isMobile ? getShortMonthName(selectedMonth) : MONTH_NAMES[selectedMonth]} {selectedYear}
              </Box>
              
              {/* Botón MES SIGUIENTE */}
              <Box
                component="div"
                role="button"
                aria-label="Mes siguiente"
                onClick={handleNextMonth}
                onTouchEnd={handleNextMonth}
                sx={{ 
                  minWidth: 40, 
                  width: 40, 
                  height: 38, 
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  cursor: 'pointer',
                  userSelect: 'none',
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  transition: 'background-color 0.2s',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.08)'
                  },
                  '&:active': {
                    backgroundColor: 'rgba(0, 0, 0, 0.12)'
                  }
                }}
              >
                <ChevronRightIcon />
              </Box>
              
              {/* Botón HOY (sólo en desktop) */}
              <Box
                component="div"
                role="button"
                aria-label="Ir a hoy"
                onClick={goToCurrentMonth}
                sx={{ 
                  minWidth: 40, 
                  width: 40, 
                  height: 38, 
                  borderRadius: 1.5,
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  justifyContent: 'center',
                  ml: 0.5,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              >
                <TodayIcon />
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={9}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: { xs: 'space-between', md: 'flex-end' }, 
              alignItems: 'center', 
              mt: { xs: 1, sm: 0 },
              gap: { xs: 1, md: 4 }
            }}>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'success.main',
                  fontSize: { xs: '0.8rem', sm: '0.9rem' }
                }}
              >
                {t('incomes')}: {formatAmount(
                  expenses
                    .filter(exp => exp.type === 'income')
                    .reduce((sum, exp) => sum + exp.amount, 0)
                )}
              </Typography>
              
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'error.main',
                  fontSize: { xs: '0.8rem', sm: '0.9rem' }
                }}
              >
                {t('expenses')}: {formatAmount(
                  expenses
                    .filter(exp => exp.type === 'expense')
                    .reduce((sum, exp) => sum + exp.amount, 0)
                )}
              </Typography>
              
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: totals.balance >= 0 ? 'success.main' : 'error.main',
                  fontSize: { xs: '0.9rem', sm: '1rem' }
                }}
              >
                {t('balance')}: {formatAmount(totals.balance)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {renderExpensesList()}

      {/* Formulario de gastos/ingresos - NUEVA IMPLEMENTACIÓN */}
      <Dialog
        open={openExpenseDialog}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        PaperProps={{
          elevation: 3,
          sx: { 
            borderRadius: isMobile ? 0 : 2,
            height: isMobile ? '100%' : 'auto',
            m: isMobile ? 0 : 2,
            maxHeight: isMobile ? '100vh' : '95vh',
            overflow: 'auto'
          }
        }}
      >
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Cabecera del formulario */}
          <Box 
            sx={{ 
              px: 3, 
              py: 2.5, 
              borderBottom: 1, 
              borderColor: 'divider',
              backgroundColor: theme => expenseData.type === 'income' 
                ? alpha(theme.palette.success.main, 0.05)
                : alpha(theme.palette.primary.main, 0.05),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1
            }}
          >
            <Typography variant="h6" fontWeight="medium">
              {selectedExpense ? 'Editar' : 'Nuevo'} {expenseData.type === 'income' ? 'Ingreso' : 'Gasto'}
            </Typography>
            <IconButton edge="end" onClick={closeDialog} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>
          
          {/* Contenido del formulario */}
          <Box sx={{ 
            p: 3, 
            flexGrow: 1, 
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Mensaje de error si existe */}
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 1 }}>
                {error}
              </Alert>
            )}
            
            {/* Importe */}
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="subtitle2" 
                component="label" 
                htmlFor="amount" 
                sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
              >
                Importe
              </Typography>
              <TextField
                id="amount"
                name="amount"
                value={expenseData.amount}
                onChange={handleExpenseChange}
                type="number"
                fullWidth
                required
                placeholder="0.00"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography color="text.secondary">€</Typography>
                    </InputAdornment>
                  ),
                  sx: { py: 1.5, backgroundColor: 'background.paper' }
                }}
              />
            </Box>
            
            {/* Nombre */}
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="subtitle2" 
                component="label" 
                htmlFor="name" 
                sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
              >
                Nombre
              </Typography>
              <TextField
                id="name"
                name="name"
                value={expenseData.name}
                onChange={handleExpenseChange}
                fullWidth
                required
                placeholder="Nombre del gasto"
                variant="outlined"
                InputProps={{
                  sx: { py: 1.5, backgroundColor: 'background.paper' }
                }}
              />
            </Box>
            
            {/* Categoría */}
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="subtitle2" 
                component="label" 
                htmlFor="category" 
                sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
              >
                Categoría
              </Typography>
              <FormControl
                fullWidth
                variant="outlined"
                required
              >
                <Select
                  id="category"
                  name="category"
                  value={expenseData.category}
                  onChange={handleExpenseChange}
                  displayEmpty
                  sx={{
                    backgroundColor: 'background.paper',
                    '& .MuiSelect-select': { py: 1.5 }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: { maxHeight: 300, borderRadius: 1 }
                    },
                    anchorOrigin: {
                      vertical: 'bottom',
                      horizontal: 'left',
                    },
                    transformOrigin: {
                      vertical: 'top',
                      horizontal: 'left',
                    },
                    sx: { zIndex: 9999 }
                  }}
                  renderValue={(selected) => {
                    if (!selected) {
                      return <Typography color="text.secondary">Seleccionar categoría</Typography>;
                    }
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {CATEGORY_ICONS[selected] && (
                          <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                            {CATEGORY_ICONS[selected]}
                          </Box>
                        )}
                        {selected}
                      </Box>
                    );
                  }}
                >
                  {(expenseData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((category) => (
                    <MenuItem key={category} value={category}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {CATEGORY_ICONS[category] && (
                          <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                            {CATEGORY_ICONS[category]}
                          </Box>
                        )}
                        {category}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            {/* Descripción */}
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="subtitle2" 
                component="label" 
                htmlFor="description" 
                sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
              >
                Descripción
              </Typography>
              <TextField
                id="description"
                name="description"
                value={expenseData.description}
                onChange={handleExpenseChange}
                fullWidth
                placeholder="Descripción del gasto (opcional)"
                variant="outlined"
                InputProps={{
                  sx: { py: 1.5, backgroundColor: 'background.paper' }
                }}
              />
            </Box>
            
            {/* Fecha */}
            <Box sx={{ mb: 3 }}>
              <Typography 
                variant="subtitle2" 
                component="label" 
                htmlFor="date" 
                sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
              >
                Fecha
              </Typography>
              <TextField
                id="date"
                name="date"
                type="date"
                value={expenseData.date}
                onChange={handleExpenseChange}
                fullWidth
                required
                variant="outlined"
                InputProps={{
                  sx: { py: 1.5, backgroundColor: 'background.paper' }
                }}
              />
              <Typography variant="caption" sx={{ display: 'block', mt: 1, ml: 1, color: 'text.secondary' }}>
                Se guardará como {expenseData.type === 'income' ? 'ingreso' : 'gasto'} del mes{' '}
                {new Date(expenseData.date).toLocaleDateString('es-ES', { month: 'long' })}
              </Typography>
            </Box>
            
            {/* Es recurrente */}
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={expenseData.isRecurring}
                    onChange={handleRecurringChange}
                    name="isRecurring"
                    color={expenseData.type === 'income' ? 'success' : 'primary'}
                  />
                }
                label={
                  <Typography variant="body2">
                    Es {expenseData.type === 'income' ? 'ingreso' : 'gasto'} recurrente (se repite cada mes)
                  </Typography>
                }
              />
            </Box>
            
            {/* Día del mes (condicional) */}
            {expenseData.isRecurring && (
              <Box sx={{ mb: 2 }}>
                <Typography 
                  variant="subtitle2" 
                  component="label" 
                  htmlFor="recurringDay" 
                  sx={{ display: 'block', mb: 1, color: 'text.secondary' }}
                >
                  Día del mes
                </Typography>
                <TextField
                  id="recurringDay"
                  name="recurringDay"
                  type="number"
                  value={expenseData.recurringDay}
                  onChange={handleExpenseChange}
                  InputProps={{
                    inputProps: { min: 1, max: 31 },
                    sx: { 
                      py: 1.5, 
                      backgroundColor: 'background.paper',
                      width: { xs: '100%', sm: '50%' }
                    }
                  }}
                />
                <Typography variant="caption" sx={{ display: 'block', mt: 1, ml: 1, color: 'text.secondary' }}>
                  Día del mes en que se repite este {expenseData.type === 'income' ? 'ingreso' : 'gasto'}
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Botones de acción */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              p: 3, 
              borderTop: 1, 
              borderColor: 'divider',
              backgroundColor: theme => alpha(theme.palette.background.default, 0.5),
              position: 'sticky',
              bottom: 0,
              zIndex: 10
            }}
          >
            <Button
              onClick={closeDialog}
              sx={{ 
                py: 1.5, 
                px: 3, 
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '0.95rem'
              }}
              disabled={submitting}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              variant="contained"
              color={expenseData.type === 'income' ? 'success' : 'primary'}
              disabled={submitting}
              sx={{ 
                py: 1.5, 
                px: 4, 
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 'medium'
              }}
            >
              {submitting ? 'Guardando...' : (selectedExpense ? 'Actualizar' : 'Guardar')}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Container>
  );
};

export default PersonalExpenses;