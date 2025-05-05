import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  CircularProgress, 
  Alert, 
  Grid, 
  Card, 
  CardContent, 
  IconButton, 
  Tooltip,
  useTheme,
  alpha,
  Avatar,
  useMediaQuery,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { 
  Add as AddIcon, 
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  DateRange as DateRangeIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import ExpensesTable from '../personal/ExpensesTable';
import { useTranslation } from 'react-i18next';
import { getMonthlyExpenses } from '../../services/personalExpenseService';

const PersonalExpenses = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [refreshing, setRefreshing] = useState(false);

  // Estado para menú de filtros
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  
  // Formatear la fecha actual
  const currentDate = new Date();
  const capitalizedMonth = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric'
  }).format(currentDate).replace(/^\w/, c => c.toUpperCase());

  // Función para formatear cantidades monetarias
  const formatAmount = (amount) => {
    try {
      if (amount === null || amount === undefined) return '0,00 €';
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      console.error('Error al formatear cantidad:', error);
      return '0,00 €';
    }
  };

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Solicitando gastos personales del mes actual...');
      const data = await getMonthlyExpenses();
      console.log('Gastos personales recibidos:', data);
      if (data && Array.isArray(data)) {
        console.log(`Cantidad de gastos: ${data.length}`);
        
        // Verificar si hay gastos provenientes de asignaciones
        const gastosDeAsignaciones = data.filter(g => g.allocationId);
        console.log(`Gastos de asignaciones: ${gastosDeAsignaciones.length}`);
        
        if (gastosDeAsignaciones.length > 0) {
          console.log('Ejemplo de gasto de asignación:', gastosDeAsignaciones[0]);
        }
      }
      setExpenses(data);
    } catch (err) {
      console.error('Error al cargar gastos personales:', err);
      setError('Error al cargar los gastos personales');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchExpenses();
    } catch (error) {
      console.error('Error al refrescar datos:', error);
      setError('Error al refrescar los datos. Por favor, intenta de nuevo.');
    } finally {
      setRefreshing(false);
    }
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (field) => {
    const isAsc = sortBy === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortBy(field);
  };

  const handleEdit = (expense) => {
    console.log('Editar gasto personal:', expense);
    // Aquí iría la lógica para abrir un modal de edición
  };

  const handleDelete = (id) => {
    console.log('Eliminar gasto personal:', id);
    // Aquí iría la lógica para eliminar un gasto
  };

  const openFilterMenu = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const closeFilterMenu = () => {
    setFilterAnchorEl(null);
  };

  // Calcular estadísticas
  const totalAmount = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const avgAmount = expenses.length > 0 ? totalAmount / expenses.length : 0;
  const maxAmount = expenses.length > 0 ? Math.max(...expenses.map(e => e.amount || 0)) : 0;

  // Procesar los gastos para adaptarlos al formato que espera ExpensesTable
  const processedExpenses = expenses.map(expense => ({
    id: expense._id,
    description: expense.description || expense.name,
    amount: expense.amount,
    category: expense.category,
    date: expense.date,
    type: expense.type || 'expense',
    isRecurring: expense.isRecurring || false,
    sessionReference: expense.sessionReference
  }));

  if (loading && !refreshing) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="400px"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Cargando información...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0, width: '100%' }}>
      {/* Header con título y acciones */}
      <Box 
        sx={{ 
          mb: 4, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pl: 3,
          pr: 3,
          pt: 1.5
        }}
      >
        <Box>
          <Typography 
            variant="h4" 
            component="h1" 
            fontWeight="bold" 
            sx={{ 
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' } 
            }}
          >
            {t('personalExpenses')}
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.6rem' },
              mt: 0.5,
              fontWeight: 500,
              color: 'primary.main'
            }}
          >
            {capitalizedMonth}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={t('filter')}>
            <IconButton 
              onClick={openFilterMenu}
              size="medium"
              sx={{ 
                bgcolor: 'background.paper', 
                boxShadow: 1,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1)
                }
              }}
            >
              <FilterListIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={t('refresh')}>
            <IconButton 
              onClick={handleRefresh}
              disabled={refreshing}
              size="medium"
              sx={{ 
                bgcolor: 'background.paper', 
                boxShadow: 1,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1)
                }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => console.log('Añadir nuevo gasto')}
            sx={{ 
              borderRadius: 2,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)'
              }
            }}
          >
            {t('newExpense')}
          </Button>
        </Box>
        
        {/* Menú de filtros */}
        <Menu
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={closeFilterMenu}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 3,
            sx: {
              borderRadius: 2,
              minWidth: 200
            }
          }}
        >
          <MenuItem onClick={closeFilterMenu}>
            <ListItemIcon>
              <DateRangeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('filterByDate')} />
          </MenuItem>
          <MenuItem onClick={closeFilterMenu}>
            <ListItemIcon>
              <ReceiptIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('filterByCategory')} />
          </MenuItem>
          <Divider />
          <MenuItem onClick={closeFilterMenu}>
            <ListItemIcon>
              <RefreshIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('resetFilters')} />
          </MenuItem>
        </Menu>
      </Box>

      {error && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mx: 3,
            mb: 3,
            borderRadius: 3,
            backgroundColor: alpha(theme.palette.error.main, 0.1),
            borderLeft: `4px solid ${theme.palette.error.main}`
          }}
        >
          <Typography color="error.dark">{error}</Typography>
        </Paper>
      )}
      
      {/* Tarjetas de resumen */}
      <Grid container spacing={3} sx={{ mb: 4, px: 3 }}>
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              borderRadius: 4,
              backgroundImage: 'linear-gradient(135deg, rgba(76, 110, 245, 0.1) 0%, rgba(0, 0, 0, 0) 100%)',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.05)'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  sx={{ 
                    width: 44, 
                    height: 44, 
                    bgcolor: alpha(theme.palette.error.main, 0.15),
                    color: theme.palette.error.main,
                    mr: 2
                  }}
                >
                  <ReceiptIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('totalExpenses')}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main">
                    {formatAmount(totalAmount)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              borderRadius: 4,
              backgroundImage: 'linear-gradient(135deg, rgba(33, 150, 243, 0.05) 0%, rgba(0, 0, 0, 0) 100%)',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.05)'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  sx={{ 
                    width: 44, 
                    height: 44, 
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                    color: theme.palette.primary.main,
                    mr: 2
                  }}
                >
                  <TrendingUpIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('avgExpense')}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    {formatAmount(avgAmount)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              borderRadius: 4,
              backgroundImage: 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(0, 0, 0, 0) 100%)',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.05)'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  sx={{ 
                    width: 44, 
                    height: 44, 
                    bgcolor: alpha(theme.palette.warning.main, 0.15),
                    color: theme.palette.warning.main,
                    mr: 2
                  }}
                >
                  <DateRangeIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('highestExpense')}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="warning.main">
                    {formatAmount(maxAmount)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabla de gastos */}
      <Box sx={{ px: 3, pt: 1, pb: 4 }}>
        {processedExpenses.length === 0 ? (
          <Card 
            sx={{ 
              p: 5, 
              textAlign: 'center',
              borderRadius: 4,
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.05)'
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {t('noExpensesFound')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('addYourFirstExpense')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => console.log('Añadir nuevo gasto')}
              sx={{ borderRadius: 2 }}
            >
              {t('newExpense')}
            </Button>
          </Card>
        ) : (
          <ExpensesTable 
            expenses={processedExpenses}
            onEdit={handleEdit}
            onDelete={handleDelete}
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={processedExpenses.length}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        )}
      </Box>
    </Box>
  );
};

export default PersonalExpenses; 