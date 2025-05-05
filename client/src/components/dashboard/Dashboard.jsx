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
  alpha
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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { checkServerHealth } from '../../utils/api';
import authService from '../../services/authService';

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
      const userData = await authService.getCurrentUser();
      if (!userData) {
        console.log('No hay datos de usuario, redirigiendo a login...');
        navigate('/login');
        return;
      }

      try {
        // Verificar salud del servidor
        const serverStatus = await checkServerHealth();
        if (!serverStatus.ok) {
          throw new Error('El servidor no está respondiendo correctamente');
        }

        // Obtener datos financieros
        const [expensesResponse, incomesResponse, sessionsResponse] = await Promise.all([
          api.get('/api/personal-expenses/monthly'),
          api.get('/api/income/monthly'),
          api.get('/api/shared-sessions')
        ]);

        // Procesar gastos
        const expenses = expensesResponse.data || [];
        const totalExpenses = expenses
          .filter(exp => exp.type === 'expense')
          .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
        setMonthlyExpenses(totalExpenses);

        // Procesar ingresos
        const incomes = incomesResponse.data || [];
        const totalIncome = incomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
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
    <Box
      sx={{
        flexGrow: 1,
        overflow: 'hidden',
        minHeight: '100vh',
      }}
    >
      <Container 
        maxWidth="xl" 
        sx={{ 
          py: { xs: 1.5, sm: 3, md: 4 },
          px: { xs: 1, sm: 2, md: 3 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            mb: { xs: 1.5, sm: 3 },
            gap: 1,
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            fontWeight="bold"
            sx={{ 
              fontSize: { xs: '1.3rem', sm: '1.75rem', md: '2rem' },
              mb: { xs: 0.5, sm: 0 }
            }}
          >
            {t('dashboard')}
          </Typography>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon fontSize="small" />}
            onClick={handleRefresh}
            disabled={refreshing}
            size="small"
            sx={{ minWidth: { xs: 'auto', sm: 'auto' } }}
          >
            {refreshing ? t('refreshing') : t('refresh')}
          </Button>
        </Box>

        {error && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 3 },
              mb: { xs: 1.5, sm: 3 },
              borderRadius: 2,
              bgcolor: alpha(theme.palette.error.main, 0.1),
              border: `1px solid ${theme.palette.error.main}`,
            }}
          >
            <Typography color="error" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>{error}</Typography>
          </Paper>
        )}

        {refreshing && (
          <LinearProgress 
            sx={{ 
              mb: { xs: 1.5, sm: 3 },
              borderRadius: 1,
              height: { xs: 4, sm: 6 },
            }} 
          />
        )}

        <Typography 
          variant="h6" 
          sx={{ 
            mb: { xs: 1, sm: 2 },
            fontWeight: 500,
            fontSize: { xs: '0.9rem', sm: '1.1rem', md: '1.25rem' },
          }}
        >
          {t('overview')} - {capitalizedMonth}
        </Typography>

        <Grid container spacing={{ xs: 1, sm: 3 }}>
          {/* Tarjeta de Balance */}
          <Grid item xs={6} sm={6} md={3}>
            <Card 
              elevation={2} 
              sx={{ 
                borderRadius: { xs: 1.5, sm: 2 }, 
                height: '100%',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: { xs: 'none', sm: 'translateY(-5px)' },
                  boxShadow: { xs: 2, sm: 6 },
                },
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, sm: 3 } }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1,
                    gap: { xs: 1, sm: 1.5 },
                  }}
                >
                  <Avatar 
                    sx={{ 
                      bgcolor: theme.palette.primary.main,
                      width: { xs: 32, sm: 48 },
                      height: { xs: 32, sm: 48 },
                    }}
                  >
                    <AccountBalanceIcon fontSize={_isMobile ? 'small' : 'medium'} />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontSize: { xs: '0.85rem', sm: '1.1rem', md: '1.25rem' } }}>
                    {t('balance')}
                  </Typography>
                </Box>
                
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: balance >= 0 ? 'success.main' : 'error.main',
                    mb: 1,
                    fontSize: { xs: '1.1rem', sm: '1.75rem', md: '2rem' },
                  }}
                >
                  {formatAmount(balance)}
                </Typography>
                
                <Box sx={{ mt: { xs: 1, sm: 2 } }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(Math.max(calculatePercentage(), 0), 100)}
                    sx={{ 
                      height: { xs: 6, sm: 8 }, 
                      borderRadius: 4,
                      mb: 0.5,
                      bgcolor: alpha(getProgressColor(calculatePercentage()), 0.2),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getProgressColor(calculatePercentage()),
                      }
                    }}
                  />
                  <Typography 
                    variant="caption" 
                    display="block" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                  >
                    {calculatePercentage() >= 0
                      ? t('savingsGoalProgress', { percentage: Math.round(calculatePercentage()) })
                      : t('negativeBalanceWarning')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Tarjeta de Ingresos */}
          <Grid item xs={6} sm={6} md={3}>
            <Card 
              elevation={2} 
              sx={{ 
                borderRadius: { xs: 1.5, sm: 2 }, 
                height: '100%',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: { xs: 'none', sm: 'translateY(-5px)' },
                  boxShadow: { xs: 2, sm: 6 },
                },
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, sm: 3 } }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1,
                    gap: { xs: 1, sm: 1.5 },
                  }}
                >
                  <Avatar 
                    sx={{ 
                      bgcolor: theme.palette.success.main,
                      width: { xs: 32, sm: 48 },
                      height: { xs: 32, sm: 48 },
                    }}
                  >
                    <ArrowUpwardIcon fontSize={_isMobile ? 'small' : 'medium'} />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontSize: { xs: '0.85rem', sm: '1.1rem', md: '1.25rem' } }}>
                    {t('income')}
                  </Typography>
                </Box>
                
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'success.main',
                    fontSize: { xs: '1.1rem', sm: '1.75rem', md: '2rem' },
                  }}
                >
                  {formatAmount(monthlyIncome)}
                </Typography>
                
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mt: { xs: 1, sm: 1.5 },
                    gap: 0.5,
                  }}
                >
                  <TrendingUpIcon color="success" fontSize="small" />
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
                  >
                    {t('incomeThisMonth')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Tarjeta de Gastos */}
          <Grid item xs={6} sm={6} md={3}>
            <Card 
              elevation={2} 
              sx={{ 
                borderRadius: { xs: 1.5, sm: 2 }, 
                height: '100%',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: { xs: 'none', sm: 'translateY(-5px)' },
                  boxShadow: { xs: 2, sm: 6 },
                },
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, sm: 3 } }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1,
                    gap: { xs: 1, sm: 1.5 },
                  }}
                >
                  <Avatar 
                    sx={{ 
                      bgcolor: theme.palette.error.main,
                      width: { xs: 32, sm: 48 },
                      height: { xs: 32, sm: 48 },
                    }}
                  >
                    <ArrowDownwardIcon fontSize={_isMobile ? 'small' : 'medium'} />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontSize: { xs: '0.85rem', sm: '1.1rem', md: '1.25rem' } }}>
                    {t('expenses')}
                  </Typography>
                </Box>
                
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'error.main',
                    fontSize: { xs: '1.1rem', sm: '1.75rem', md: '2rem' },
                  }}
                >
                  {formatAmount(monthlyExpenses)}
                </Typography>
                
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mt: { xs: 1, sm: 1.5 },
                    gap: 0.5,
                  }}
                >
                  <ReceiptIcon color="error" fontSize="small" />
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
                  >
                    {t('expensesThisMonth')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Tarjeta de Sesiones Activas */}
          <Grid item xs={6} sm={6} md={3}>
            <Card 
              elevation={2} 
              sx={{ 
                borderRadius: { xs: 1.5, sm: 2 }, 
                height: '100%',
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: { xs: 'none', sm: 'translateY(-5px)' },
                  boxShadow: { xs: 2, sm: 6 },
                },
              }}
            >
              <CardContent sx={{ p: { xs: 1.5, sm: 3 } }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1,
                    gap: { xs: 1, sm: 1.5 },
                  }}
                >
                  <Avatar 
                    sx={{ 
                      bgcolor: theme.palette.info.main,
                      width: { xs: 32, sm: 48 },
                      height: { xs: 32, sm: 48 },
                    }}
                  >
                    <FaceIcon fontSize={_isMobile ? 'small' : 'medium'} />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontSize: { xs: '0.85rem', sm: '1.1rem', md: '1.25rem' } }}>
                    {t('activeSessions')}
                  </Typography>
                </Box>
                
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'info.main',
                    fontSize: { xs: '1.1rem', sm: '1.75rem', md: '2rem' },
                  }}
                >
                  {activeSessions}
                </Typography>
                
                <Box sx={{ mt: { xs: 1, sm: 2 } }}>
                  <Button 
                    variant="text" 
                    color="primary" 
                    onClick={() => navigate('/shared')}
                    size="small"
                    sx={{ 
                      px: 0,
                      fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    }}
                  >
                    {t('viewAllSessions')}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Acciones Rápidas */}
        <Box sx={{ mt: { xs: 2, sm: 4 } }}>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: { xs: 1, sm: 2 }, 
              fontWeight: 500,
              fontSize: { xs: '0.9rem', sm: '1.1rem', md: '1.25rem' },
            }}
          >
            {t('quickActions')}
          </Typography>
          
          <Grid container spacing={{ xs: 1, sm: 3 }}>
            <Grid item xs={6} sm={6} md={3}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => navigate('/personal/add')}
                startIcon={<ReceiptIcon fontSize={_isMobile ? 'small' : 'medium'} />}
                sx={{ 
                  py: { xs: 1, sm: 2 },
                  borderRadius: { xs: 1.5, sm: 2 },
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: { xs: 1, sm: 2 },
                  fontSize: { xs: '0.75rem', sm: '1rem' },
                }}
              >
                {t('addExpense')}
              </Button>
            </Grid>
            
            <Grid item xs={6} sm={6} md={3}>
              <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={() => navigate('/personal/income/add')}
                startIcon={<AttachMoneyIcon fontSize={_isMobile ? 'small' : 'medium'} />}
                sx={{ 
                  py: { xs: 1, sm: 2 },
                  borderRadius: { xs: 1.5, sm: 2 },
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: { xs: 1, sm: 2 },
                  fontSize: { xs: '0.75rem', sm: '1rem' },
                }}
              >
                {t('addIncome')}
              </Button>
            </Grid>
            
            <Grid item xs={6} sm={6} md={3}>
              <Button
                variant="contained"
                color="info"
                fullWidth
                onClick={() => navigate('/shared/create')}
                startIcon={<FaceIcon fontSize={_isMobile ? 'small' : 'medium'} />}
                sx={{ 
                  py: { xs: 1, sm: 2 },
                  borderRadius: { xs: 1.5, sm: 2 },
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: { xs: 1, sm: 2 },
                  fontSize: { xs: '0.75rem', sm: '1rem' },
                }}
              >
                {t('createSession')}
              </Button>
            </Grid>
            
            <Grid item xs={6} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/reports')}
                startIcon={<TrendingUpIcon fontSize={_isMobile ? 'small' : 'medium'} />}
                sx={{ 
                  py: { xs: 1, sm: 2 },
                  borderRadius: { xs: 1.5, sm: 2 },
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: { xs: '0.75rem', sm: '1rem' },
                }}
              >
                {t('viewReports')}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default Dashboard; 