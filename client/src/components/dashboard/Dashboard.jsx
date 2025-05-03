import React, { useState, useEffect } from 'react';
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
  Group as GroupIcon,
  Receipt as ReceiptIcon,
  Paid as PaidIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Face as FaceIcon,
  AttachMoney as AttachMoneyIcon,
  Dashboard as DashboardIcon,
  MenuBook as MenuBookIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api, { checkServerHealth } from '../../utils/api';
import authService from '../../services/authService';

const Dashboard = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  // eslint-disable-next-line no-unused-vars
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [balance, setBalance] = useState(0);
  const [activeSessions, setActiveSessions] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const currentDate = new Date();
  // Usar formato nativo en lugar de date-fns
  let capitalizedMonth = ""; 
  try {
    // Formatear usando toLocaleString en lugar de date-fns
    const formattedMonth = currentDate.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric'
    });
    // Asegurar que el mes comienza con mayúscula
    capitalizedMonth = formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1);
  } catch (err) {
    console.error("Error al formatear fecha:", err);
    capitalizedMonth = "Mes actual";
  }

  // Función para formatear cantidades monetarias
  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return '0,00 €';
    return amount.toLocaleString('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 2
    });
  };

  // Función para obtener las iniciales del nombre de usuario
  const getUserInitials = () => {
    if (!userName) return "U";
    return userName.split(' ').map(name => name[0]).join('').toUpperCase().substring(0, 2);
  };

  const loadExampleData = (showError = true) => {
    const storedName = localStorage.getItem('userName') || localStorage.getItem('nombre');
    if (storedName) {
      setUserName(storedName);
    }
    
    // Usar valores cero en lugar de datos de ejemplo
    setMonthlyExpenses(0);
    setMonthlyIncome(0);
    setBalance(0);
    setActiveSessions(0);
    
    if (showError) {
      setError('Datos no disponibles. Mostrando valores iniciales.');
    }
  };

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        console.log('Token al cargar Dashboard:', token ? 'Existe' : 'No existe');

        if (!token) {
          console.log('No hay token, redirigiendo a login...');
          navigate('/login');
          return;
        }

        // Verificar el token primero
        try {
          const userData = await authService.getCurrentUser();
          console.log('Usuario autenticado:', userData);
          
          // Actualizar nombre de usuario si está disponible
          if (userData) {
            const userName = userData.nombre || userData.name || userData.username || userData.email.split('@')[0];
            setUserName(userName);
          }
        } catch (authError) {
          console.error('Error al obtener datos del usuario:', authError);
          navigate('/login');
          return;
        }

        // Si llegamos aquí, el token es válido
        const results = await Promise.allSettled([
          api.get('/api/personal-expenses/monthly'),
          api.get('/api/income/monthly'),
          api.get('/api/shared-sessions')
        ]);
        
        if (results[0].status === 'fulfilled') {
          const expenses = results[0].value.data;
          const totalExpenses = expenses
            .filter(exp => exp.type === 'expense')
            .reduce((sum, exp) => sum + exp.amount, 0);
          setMonthlyExpenses(totalExpenses);
          
          const totalIncome = expenses
            .filter(exp => exp.type === 'income')
            .reduce((sum, exp) => sum + exp.amount, 0);
          
          if (totalIncome > 0) {
            setMonthlyIncome(totalIncome);
          }
        }
        
        if (results[1].status === 'fulfilled') {
          const incomes = results[1].value.data;
          const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
          
          if (!(results[0].status === 'fulfilled' && 
              results[0].value.data.some(exp => exp.type === 'income'))) {
            setMonthlyIncome(totalIncome);
          }
        }
        
        if (results[2].status === 'fulfilled') {
          const sessions = results[2].value.data;
          setActiveSessions(sessions.length);
        }
        
        let calculatedExpenses = 0;
        let calculatedIncome = 0;
        
        if (results[0].status === 'fulfilled') {
          const expenses = results[0].value.data;
          calculatedExpenses = expenses
            .filter(exp => exp.type === 'expense')
            .reduce((sum, exp) => sum + exp.amount, 0);
            
          calculatedIncome = expenses
            .filter(exp => exp.type === 'income')
            .reduce((sum, exp) => sum + exp.amount, 0);
        }
        
        if (results[1].status === 'fulfilled' && 
            !(results[0].status === 'fulfilled' && 
              results[0].value.data.some(exp => exp.type === 'income'))) {
          const incomes = results[1].value.data;
          calculatedIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
        }
        
        setBalance(calculatedIncome - calculatedExpenses);
        
        if (results.every(result => result.status === 'rejected')) {
          setError('No se pudieron cargar los datos del usuario. Verifica tu conexión.');
        } else {
          setError(null);
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError('Error al cargar los datos del dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleRefresh = () => {
    setRefreshing(true);
    const fetchData = async () => {
      try {
        const serverAvailable = await checkServerHealth();
        if (!serverAvailable) {
          setError('No se pudo conectar al servidor. Verifica que el servidor esté en ejecución en http://localhost:5000');
          loadExampleData(false);
          return;
        }
        
        const token = localStorage.getItem('token');
        console.log('Token al refrescar:', token ? 'Existe' : 'No existe');
        
        if (!token) {
          console.log('No hay token en refresh, redirigiendo a login...');
          navigate('/login');
          return;
        }
        
        const results = await Promise.allSettled([
          api.get('/api/personal-expenses/monthly'),
          api.get('/api/income/monthly'),
          api.get('/api/shared-sessions')
        ]);
        
        if (results[0].status === 'fulfilled') {
          const expenses = results[0].value.data;
          const totalExpenses = expenses
            .filter(exp => exp.type === 'expense')
            .reduce((sum, exp) => sum + exp.amount, 0);
          setMonthlyExpenses(totalExpenses);
          
          const totalIncome = expenses
            .filter(exp => exp.type === 'income')
            .reduce((sum, exp) => sum + exp.amount, 0);
          
          if (totalIncome > 0) {
            setMonthlyIncome(totalIncome);
          }
        }
        
        if (results[1].status === 'fulfilled') {
          const incomes = results[1].value.data;
          const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
          
          if (!(results[0].status === 'fulfilled' && 
              results[0].value.data.some(exp => exp.type === 'income'))) {
            setMonthlyIncome(totalIncome);
          }
        }
        
        if (results[2].status === 'fulfilled') {
          const sessions = results[2].value.data;
          setActiveSessions(sessions.length);
        }
        
        let calculatedExpenses = 0;
        let calculatedIncome = 0;
        
        if (results[0].status === 'fulfilled') {
          const expenses = results[0].value.data;
          calculatedExpenses = expenses
            .filter(exp => exp.type === 'expense')
            .reduce((sum, exp) => sum + exp.amount, 0);
            
          calculatedIncome = expenses
            .filter(exp => exp.type === 'income')
            .reduce((sum, exp) => sum + exp.amount, 0);
        }
        
        if (results[1].status === 'fulfilled' && 
            !(results[0].status === 'fulfilled' && 
              results[0].value.data.some(exp => exp.type === 'income'))) {
          const incomes = results[1].value.data;
          calculatedIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
        }
        
        setBalance(calculatedIncome - calculatedExpenses);
        
        if (results.every(result => result.status === 'rejected')) {
          setError('No se pudieron cargar los datos del usuario. Verifica tu conexión.');
        } else {
          setError(null);
        }
      } catch (error) {
        console.error('Error al actualizar datos:', error);
        setError('No se pudieron actualizar los datos. Intenta de nuevo más tarde.');
        loadExampleData(false);
      } finally {
        setRefreshing(false);
      }
    };
    fetchData();
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
      sx={{ 
        width: { xs: '100%', sm: `calc(100% - 240px)` },
        ml: { xs: 0, sm: 0 },
        mr: 0,
        pt: 3,
        pb: 4,
        px: { xs: 2, sm: 3 }
      }}
    >
      {/* Header con bienvenida y actualización */}
      <Box 
        sx={{ 
          mb: 4, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            sx={{ 
              width: 48, 
              height: 48, 
              mr: 2,
              bgcolor: 'primary.main',
              fontSize: '1.25rem',
              fontWeight: 'bold'
            }}
          >
            {getUserInitials()}
          </Avatar>
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
              variant="subtitle1" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '1rem' },
                mt: 0.5
              }}
            >
              {t('welcome')}, {userName}
            </Typography>
          </Box>
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
      <Grid container spacing={3} sx={{ mb: 4 }}>
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
          mb: 3
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