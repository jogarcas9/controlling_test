import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Button,
  useMediaQuery,
  useTheme,
  Avatar,
  IconButton,
  LinearProgress,
  Tooltip,
  alpha,
  Skeleton
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Face as FaceIcon,
  AttachMoney as AttachMoneyIcon,
  Add as AddIcon,
  Group as GroupIcon,
  AssignmentInd as AssignmentIndIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { checkServerHealth } from '../../utils/api';
import authService from '../../services/authService';
import ExpenseSummaryByCategory from './ExpenseSummaryByCategory';

const Dashboard = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const _isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [activeSessions, setActiveSessions] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);

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

  const navigate = useNavigate();

  // Mover la lógica de loadExampleData dentro de fetchData
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar autenticación
      const token = authService.getToken();
      if (!token) {
        console.log('No hay token, redirigiendo a login...');
        navigate('/login');
        return;
      }

      // Verificar usuario actual
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        console.log('No hay datos de usuario, redirigiendo a login...');
        navigate('/login');
        return;
      }
      
      // Guardar los datos del usuario
      setUserData(currentUser);

      try {
        // Verificar salud del servidor
        const serverStatus = await checkServerHealth();
        if (!serverStatus.ok) {
          throw new Error('El servidor no está respondiendo correctamente');
        }

        // Obtener datos financieros
        const [expensesResponse, sessionsResponse] = await Promise.all([
          api.get('/api/personal-expenses/monthly'),
          api.get('/api/shared-sessions')
        ]);

        // Procesar gastos e ingresos desde la misma respuesta
        const personalItems = expensesResponse.data || [];
        
        // Calcular gastos totales
        const totalExpenses = personalItems
          .filter(item => item.type === 'expense')
          .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        setMonthlyExpenses(totalExpenses);

        // Calcular ingresos totales
        const totalIncome = personalItems
          .filter(item => item.type === 'income')
          .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        setMonthlyIncome(totalIncome);

        // Procesar sesiones compartidas
        const sessions = sessionsResponse.data || [];
        setActiveSessions(sessions.length);

        // Calcular balance
        setBalance(totalIncome - totalExpenses);

      } catch (apiError) {
        console.error('Error al obtener datos:', apiError);
        setError('Error al cargar los datos. Por favor, intenta de nuevo más tarde.');
        
        // Restablecer valores por defecto
        setMonthlyExpenses(0);
        setMonthlyIncome(0);
        setBalance(0);
        setActiveSessions(0);
      }

    } catch (error) {
      console.error('Error en fetchData:', error);
      setError('Error al cargar los datos. Por favor, verifica tu conexión.');
      
      // Restablecer valores por defecto
      setMonthlyExpenses(0);
      setMonthlyIncome(0);
      setBalance(0);
      setActiveSessions(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch (error) {
      console.error('Error al refrescar datos:', error);
      setError('Error al refrescar los datos. Por favor, intenta de nuevo.');
    } finally {
      setRefreshing(false);
    }
  };

  // Calcular el porcentaje del balance respecto a los ingresos
  const calculatePercentage = () => {
    if (monthlyIncome === 0) return 0;
    return (balance / monthlyIncome) * 100;
  };

  // Determinar el color según el porcentaje
  const getProgressColor = (percentage) => {
    if (percentage < 0) return theme.palette.error.main;
    if (percentage < 30) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  // Manejadores de acciones rápidas
  const handleAddExpense = () => {
    // Navegar a gastos personales y abrir directamente formulario para gastos
    navigate('/personal', { 
      state: { openExpenseDialog: true, expenseType: 'expense' } 
    });
  };
  
  const handleAddIncome = () => {
    // Navegar a gastos personales y abrir directamente formulario para ingresos
    navigate('/personal', { 
      state: { openExpenseDialog: true, expenseType: 'income' } 
    });
  };
  
  const handleCreateSession = () => {
    // Navegar a la página principal de sesiones compartidas con estado para abrir el formulario de creación
    navigate('/shared', { 
      state: { openSessionForm: true } 
    });
  };

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
    <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
      {/* Sección de saludo simplificada - sin botones */}
      <Box mb={4}>
        <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
          <Grid item xs={12}>
            <Typography 
              variant="h5" 
              component="h1" 
              gutterBottom 
              className="page-title"
            >
              {t('Resumen')}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {capitalizedMonth}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Mostrar error o cargando */}
      {error && (
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 2, 
            bgcolor: alpha(theme.palette.error.main, 0.1),
            color: theme.palette.error.main,
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`
          }}
        >
          <Typography>{error}</Typography>
        </Paper>
      )}

      {/* Tarjetas de resumen financiero */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%', 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                height: '100%',
                width: '8px',
                backgroundColor: theme.palette.primary.main,
                borderTopRightRadius: 8,
                borderBottomRightRadius: 8
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    {t('Balance mensual')}
                  </Typography>
                  {loading ? (
                    <Skeleton width={100} height={36} />
                  ) : (
                    <Typography variant="h5" component="div">
                      {formatAmount(balance)}
                    </Typography>
                  )}
                </Box>
                <Avatar 
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main
                  }}
                >
                  <AccountBalanceIcon />
                </Avatar>
              </Box>
              {!loading && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(Math.max(calculatePercentage(), 0), 100)}
                    sx={{ 
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: alpha(getProgressColor(calculatePercentage()), 0.2),
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getProgressColor(calculatePercentage()),
                        borderRadius: 3
                      }
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    {/* Quitamos el texto del porcentaje */}
                    {/* <Typography variant="body2" color="textSecondary">
                      {`${Math.round(calculatePercentage())}% ${t('of_income')}`}
                    </Typography> */}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%', 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                height: '100%',
                width: '8px',
                backgroundColor: theme.palette.success.main,
                borderTopRightRadius: 8,
                borderBottomRightRadius: 8
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    {t('Ingresos mensuales')}
                  </Typography>
                  {loading ? (
                    <Skeleton width={100} height={36} />
                  ) : (
                    <Typography variant="h5" component="div" sx={{ color: theme.palette.success.main }}>
                      {formatAmount(monthlyIncome)}
                    </Typography>
                  )}
                </Box>
                <Avatar 
                  sx={{ 
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main
                  }}
                >
                  <ArrowUpwardIcon />
                </Avatar>
              </Box>
              {/* Tarjeta de ingresos mensuales */}
              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="outlined" 
                  color="success"
                  fullWidth
                  size="small" 
                  startIcon={<AddIcon />} 
                  onClick={handleAddIncome}
                  sx={{ 
                    py: 0.5,
                    textTransform: 'none',
                    borderRadius: 2,
                    fontSize: '0.75rem',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  {t('Agregar Ingreso')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%', 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                height: '100%',
                width: '8px',
                backgroundColor: theme.palette.error.main,
                borderTopRightRadius: 8,
                borderBottomRightRadius: 8
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    {t('Gastos mensuales')}
                  </Typography>
                  {loading ? (
                    <Skeleton width={100} height={36} />
                  ) : (
                    <Typography variant="h5" component="div" sx={{ color: theme.palette.error.main }}>
                      {formatAmount(monthlyExpenses)}
                    </Typography>
                  )}
                </Box>
                <Avatar 
                  sx={{ 
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    color: theme.palette.error.main
                  }}
                >
                  <ArrowDownwardIcon />
                </Avatar>
              </Box>
              {/* Tarjeta de gastos mensuales */}
              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="outlined" 
                  color="error"
                  fullWidth
                  size="small" 
                  startIcon={<AddIcon />} 
                  onClick={handleAddExpense}
                  sx={{ 
                    py: 0.5,
                    textTransform: 'none',
                    borderRadius: 2,
                    fontSize: '0.75rem',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  {t('Agregar Gasto')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              height: '100%', 
              borderRadius: 2, 
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                height: '100%',
                width: '8px',
                backgroundColor: theme.palette.info.main,
                borderTopRightRadius: 8,
                borderBottomRightRadius: 8
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    {t('Sesiones activas')}
                  </Typography>
                  {loading ? (
                    <Skeleton width={100} height={36} />
                  ) : (
                    <Typography variant="h5" component="div">
                      {activeSessions}
                    </Typography>
                  )}
                </Box>
                <Avatar 
                  sx={{ 
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main
                  }}
                >
                  <GroupIcon />
                </Avatar>
              </Box>
              {/* Tarjeta de sesiones activas */}
              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="outlined" 
                  color="info"
                  fullWidth
                  size="small" 
                  startIcon={<AddIcon />} 
                  onClick={handleCreateSession}
                  sx={{ 
                    py: 0.5,
                    textTransform: 'none',
                    borderRadius: 2,
                    fontSize: '0.75rem',
                    zIndex: 10,
                    position: 'relative'
                  }}
                >
                  {t('Crear Sesión')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Componente de resumen de gastos por categoría con ancho completo */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 2 }}>
            {t('Resumen de Gastos')}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          {/* Componente de resumen de gastos por categoría */}
          <ExpenseSummaryByCategory />
        </Grid>
      </Grid>
      
      {/* Botón de recarga */}
      <Box sx={{ position: 'fixed', bottom: 20, right: 20 }}>
        <Tooltip title={t('refresh_data')}>
          <IconButton
            color="primary"
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ 
              backgroundColor: theme.palette.background.paper,
              boxShadow: 3,
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
              }
            }}
          >
            {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Box>
    </Container>
  );
};

export default Dashboard; 