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
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import axios from 'axios';
import format from 'date-fns/format';
import es from 'date-fns/locale/es';
import { useTranslation } from 'react-i18next';

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
          backgroundColor: isIncome ? '#4caf50' : getCategoryColor(expense.category),
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
              backgroundColor: isIncome ? 'rgba(76, 175, 80, 0.1)' : `${getCategoryColor(expense.category)}20`,
              color: isIncome ? '#4caf50' : getCategoryColor(expense.category),
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
        {expense.description}
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
  const isMobile = window.matchMedia('(max-width: 600px)').matches;

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

  const goToCurrentMonth = () => {
    setSelectedMonth(currentDate.getMonth());
    setSelectedYear(currentDate.getFullYear());
  };

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

      const { data } = await axios.get('/api/personal-expenses', {
        headers: { 'x-auth-token': token },
        params: { month: selectedMonth, year: selectedYear }
      });

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

      if (!window.confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay token de autenticación');

      await axios.delete(`/api/personal-expenses/${id}`, {
        headers: { 'x-auth-token': token }
      });

      await fetchExpenses();
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
      category: type === 'income' ? 'Nómina' : 'Otros'
    }));
    setOpenExpenseDialog(true);
  }, [resetForm]);

  const handleEdit = useCallback((expense) => {
    setSelectedExpense(expense);
    setExpenseData({
      amount: expense.amount || '',
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
    fetchExpenses();
  }, [fetchExpenses]);

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

    if (expenses.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No hay movimientos registrados para este mes.
        </Alert>
      );
    }

    if (isMobile) {
      return (
        <Box sx={{ mt: 2 }}>
          {expenses.map(expense => (
            <ExpenseCard
              key={expense._id}
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
              <TableCell>Fecha</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Importe</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map(expense => {
              const date = new Date(expense.date);
              const formattedDate = format(date, 'dd MMM yyyy', { locale: es });
              const icon = CATEGORY_ICONS[expense.category] || <MoreHorizIcon fontSize="small" />;
              const isIncome = expense.type === 'income';

              return (
                <TableRow key={expense._id}>
                  <TableCell>{formattedDate}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {expense.description}
                      {expense.isRecurring && (
                        <Tooltip title="Movimiento recurrente">
                          <TimerIcon fontSize="small" color="primary" sx={{ ml: 1 }} />
                        </Tooltip>
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
                  <TableCell>
                    <Chip
                      size="small"
                      icon={isIncome ? <IncomeIcon fontSize="small" /> : <ExpenseIcon fontSize="small" />}
                      label={isIncome ? "Ingreso" : "Gasto"}
                      color={isIncome ? "success" : "error"}
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </TableCell>
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
        
        <Box sx={{ display: 'flex' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              openNewExpense('expense');
            }}
            startIcon={<AddIcon />}
            size={isMobile ? "small" : "medium"}
            sx={{ mr: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          >
            {isMobile ? 'Gasto' : 'Nuevo Gasto'}
          </Button>
          
          <Button
            variant="outlined"
            color="success"
            onClick={() => {
              openNewExpense('income');
            }}
            startIcon={<AddIcon />}
            size={isMobile ? "small" : "medium"}
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
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
          {/* Reemplazamos los selectores de mes y año por un controlador de fechas compacto */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'flex-start'
            }}>
              <IconButton 
                size="small" 
                color="primary" 
                onClick={handlePreviousMonth}
                title="Mes anterior"
                sx={{ 
                  border: '1px solid', 
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: isMobile ? 0.5 : 0.75,
                  mr: 1
                }}
              >
                <ChevronLeftIcon fontSize={isMobile ? "small" : "small"} />
              </IconButton>
              
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  mx: 1,
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  fontWeight: 'medium',
                  whiteSpace: 'nowrap'
                }}
              >
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </Typography>
              
              <IconButton 
                size="small" 
                color="primary" 
                onClick={handleNextMonth}
                title="Mes siguiente"
                sx={{ 
                  border: '1px solid', 
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: isMobile ? 0.5 : 0.75,
                  ml: 1
                }}
              >
                <ChevronRightIcon fontSize={isMobile ? "small" : "small"} />
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
                  ml: 1,
                  p: isMobile ? 0.5 : 0.75
                }}
              >
                <TodayIcon fontSize={isMobile ? "small" : "small"} />
              </IconButton>
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

      {/* Formulario de gastos/ingresos */}
      <Dialog
        open={openExpenseDialog}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle id="expense-dialog-title">
          {selectedExpense ? 'Editar' : 'Nuevo'} {expenseData.type === 'income' ? 'Ingreso' : 'Gasto'}
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="amount"
                label="Importe"
                type="number"
                fullWidth
                required
                value={expenseData.amount}
                onChange={handleExpenseChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Categoría</InputLabel>
                <Select
                  name="category"
                  value={expenseData.category}
                  onChange={handleExpenseChange}
                  label="Categoría"
                >
                  {(expenseData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(category => (
                    <MenuItem key={category} value={category}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {CATEGORY_ICONS[category]}
                        <Box sx={{ ml: 1 }}>{category}</Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="description"
                label="Descripción"
                fullWidth
                required
                value={expenseData.description}
                onChange={handleExpenseChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                name="date"
                label="Fecha"
                type="date"
                fullWidth
                required
                value={expenseData.date}
                onChange={handleExpenseChange}
                InputLabelProps={{ shrink: true }}
              />
              <FormHelperText>
                Se guardará como {expenseData.type === 'income' ? 'ingreso' : 'gasto'} del mes{' '}
                {new Date(expenseData.date).toLocaleDateString('es-ES', { month: 'long' })}
              </FormHelperText>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={expenseData.isRecurring}
                    onChange={handleRecurringChange}
                  />
                }
                label="Es recurrente (se repite cada mes)"
              />
            </Grid>

            {expenseData.isRecurring && (
              <Grid item xs={12} sm={6}>
                <TextField
                  name="recurringDay"
                  label="Día del mes"
                  type="number"
                  fullWidth
                  value={expenseData.recurringDay}
                  onChange={handleExpenseChange}
                  InputProps={{
                    inputProps: { min: 1, max: 31 }
                  }}
                  helperText="Día del mes en que se repite este gasto"
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color={expenseData.type === 'income' ? 'success' : 'primary'}
            disabled={submitting}
          >
            {submitting ? 'Guardando...' : (selectedExpense ? 'Actualizar' : 'Guardar')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PersonalExpenses;