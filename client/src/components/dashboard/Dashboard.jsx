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
    <Container 
      maxWidth={false}
      disableGutters
      sx={{ 
        width: '100%',
        ml: 0,
        mr: 0,
        pt: 0,
        pb: 0,
        px: 0,
        overflow: 'hidden'
      }}
    >
      {/* Header con bienvenida y actualización */}
      <Box 
        sx={{ 
          mb: 4, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pl: 3, // Padding izquierdo para el contenido
          pr: 3,  // Padding derecho para el contenido
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
            {t('dashboard')}
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
            {t('welcome')}
          </Typography>
        </Box>
        
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
      </Box>

      {error && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mx: 3, // Margen horizontal
            mb: 3,
            borderRadius: 3,
            backgroundColor: alpha(theme.palette.error.main, 0.1),
            borderLeft: `4px solid ${theme.palette.error.main}`
          }}
        >
          <Typography color="error.dark">{error}</Typography>
        </Paper>
      )}
      
      {/* Resumen financiero */}
      <Grid container spacing={3} sx={{ mb: 4, px: 3 }}>
        <Grid item xs={12} md={6}>
          <Card 
            sx={{ 
              borderRadius: 4,
              height: '100%',
              backgroundImage: 'linear-gradient(135deg, rgba(76, 110, 245, 0.1) 0%, rgba(0, 0, 0, 0) 100%)',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.05)'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight="bold">{t('financialSummary')}</Typography>
                <Typography variant="subtitle2" color="text.secondary">{capitalizedMonth}</Typography>
              </Box>
              
              <Box sx={{ mb: 4, mt: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('availableBalance')}
                </Typography>
                <Typography 
                  variant="h3" 
                  fontWeight="bold" 
                  color={balance >= 0 ? 'success.main' : 'error.main'}
                  sx={{ 
                    fontSize: { xs: '1.75rem', sm: '2.25rem' },
                    mb: 1
                  }}
                >
                  {formatAmount(balance)}
                </Typography>
                
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(Math.max(calculatePercentage(), 0), 100)}
                  sx={{ 
                    height: 8, 
                    borderRadius: 2,
                    mb: 1,
                    bgcolor: alpha(getProgressColor(calculatePercentage()), 0.2),
                    '& .MuiLinearProgress-bar': {
                      bgcolor: getProgressColor(calculatePercentage())
                    }
                  }}
                />
                
                <Typography variant="caption" color="text.secondary">
                  {monthlyIncome > 0 
                    ? `${Math.round(calculatePercentage())}% de tus ingresos disponible` 
                    : 'Sin ingresos registrados este mes'}
                </Typography>
              </Box>
              
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.success.main, 0.1)
                  }}>
                    <Avatar
                      sx={{ 
                        width: 40, 
                        height: 40, 
                        bgcolor: alpha(theme.palette.success.main, 0.2),
                        color: theme.palette.success.main,
                        mr: 1.5
                      }}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {t('income')}
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="success.main">
                        {formatAmount(monthlyIncome)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.error.main, 0.1)
                  }}>
                    <Avatar
                      sx={{ 
                        width: 40, 
                        height: 40, 
                        bgcolor: alpha(theme.palette.error.main, 0.2),
                        color: theme.palette.error.main,
                        mr: 1.5
                      }}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {t('expenses')}
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="error.main">
                        {formatAmount(monthlyExpenses)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Grid container spacing={3} height="100%">
            <Grid item xs={12}>
              <Card 
                sx={{ 
                  borderRadius: 4,
                  backgroundImage: 'linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(0, 0, 0, 0) 100%)',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.05)'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
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
                        <AccountBalanceIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {t('activeSharedSessions')}
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                          {activeSessions}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Button 
                      variant="outlined" 
                      size="small" 
                      color="primary"
                      href="/shared"
                      sx={{ 
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        px: 2
                      }}
                    >
                      {t('viewAll')}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card 
                sx={{ 
                  borderRadius: 4,
                  backgroundImage: 'linear-gradient(135deg, rgba(33, 150, 243, 0.05) 0%, rgba(0, 0, 0, 0) 100%)',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.05)'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box sx={{ width: '70%' }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {t('quickActions')}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('manageYourFinances')}
                      </Typography>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Button 
                            variant="outlined"
                            color="success"
                            fullWidth
                            size="small"
                            href="/personal"
                            startIcon={<AttachMoneyIcon />}
                            sx={{ 
                              borderRadius: 2,
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              justifyContent: 'flex-start',
                              py: 1
                            }}
                          >
                            {t('newIncome')}
                          </Button>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Button 
                            variant="outlined"
                            color="error"
                            fullWidth
                            size="small"
                            href="/personal"
                            startIcon={<ReceiptIcon />}
                            sx={{ 
                              borderRadius: 2,
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              justifyContent: 'flex-start',
                              py: 1
                            }}
                          >
                            {t('newExpense')}
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Avatar
                        sx={{ 
                          width: 70, 
                          height: 70, 
                          bgcolor: alpha(theme.palette.info.main, 0.15),
                          color: theme.palette.info.main
                        }}
                      >
                        <TrendingUpIcon fontSize="large" />
                      </Avatar>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      
      {/* Sección de estadísticas anuales (opcional) */}
      <Card 
        sx={{ 
          borderRadius: 4,
          backgroundImage: 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(0, 0, 0, 0) 100%)',
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.05)',
          mb: 3,
          mx: 3
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">{t('yearToDate')}</Typography>
            <Typography variant="subtitle2" color="text.secondary">{new Date().getFullYear()}</Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('summaryYearToDate')}
          </Typography>
          
          <Box 
            sx={{ 
              p: 2.5, 
              borderRadius: 3, 
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-around',
              gap: 2
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('savingsGoalProgress')}
              </Typography>
              <Typography variant="h5" color="primary.main" fontWeight="bold">
                {monthlyIncome > monthlyExpenses ? 'En camino' : 'Necesita atención'}
              </Typography>
            </Box>
            
            <Divider orientation={isTablet ? 'horizontal' : 'vertical'} flexItem />
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('targetSavings')}
              </Typography>
              <Typography variant="h5" color="primary.main" fontWeight="bold">
                {formatAmount(monthlyIncome * 0.2)}
              </Typography>
            </Box>
            
            <Divider orientation={isTablet ? 'horizontal' : 'vertical'} flexItem />
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('monthsToContinue')}
              </Typography>
              <Typography variant="h5" color="primary.main" fontWeight="bold">
                {balance > 0 ? Math.ceil(12 * (1 - (monthlyExpenses / monthlyIncome))) : 0}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      
      {/* Panel de consejos financieros */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mx: 3,
          borderRadius: 4,
          backgroundColor: alpha(theme.palette.info.main, 0.05),
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        <Avatar
          sx={{ 
            width: 50, 
            height: 50, 
            bgcolor: alpha(theme.palette.info.main, 0.2),
            color: theme.palette.info.main
          }}
        >
          <FaceIcon />
        </Avatar>
        
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            {t('financialTip')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {balance < 0 
              ? t('tipNegativeBalance') 
              : monthlyExpenses > (monthlyIncome * 0.8)
                ? t('tipHighExpenses')
                : t('tipGoodFinances')}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Dashboard; 