import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Menu,
  MenuItem,
  // eslint-disable-next-line no-unused-vars
  TextField,
  Card,
  CardContent,
  Divider,
  Container
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { 
  CalendarToday, 
  // eslint-disable-next-line no-unused-vars
  Download, 
  Refresh 
} from '@mui/icons-material';
import { fetchMonthlyReport, fetchYearlyReport, fetchSummary } from '../../services/reportService';

// Importación con manejo de errores para recharts
let BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell;
try {
  // Intentar importar recharts normalmente
  const recharts = require('recharts');
  BarChart = recharts.BarChart;
  Bar = recharts.Bar;
  XAxis = recharts.XAxis;
  YAxis = recharts.YAxis;
  Tooltip = recharts.Tooltip;
  Legend = recharts.Legend;
  ResponsiveContainer = recharts.ResponsiveContainer;
  PieChart = recharts.PieChart;
  Pie = recharts.Pie;
  Cell = recharts.Cell;
} catch (error) {
  console.warn('Error al cargar recharts localmente. Usando fallback.', error);
  
  // Si falla, crear componentes dummy para evitar errores
  const createDummyComponent = (name) => (props) => {
    console.warn(`Componente ${name} no disponible. Usando dummy.`);
    return <div>{`[${name} no disponible]`}</div>;
  };
  
  BarChart = createDummyComponent('BarChart');
  Bar = createDummyComponent('Bar');
  XAxis = createDummyComponent('XAxis');
  YAxis = createDummyComponent('YAxis');
  Tooltip = createDummyComponent('Tooltip');
  Legend = createDummyComponent('Legend');
  ResponsiveContainer = createDummyComponent('ResponsiveContainer');
  PieChart = createDummyComponent('PieChart');
  Pie = createDummyComponent('Pie');
  Cell = createDummyComponent('Cell');
  
  // Añadir la librería CDN
  if (typeof document !== 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/recharts@2.15.3/umd/Recharts.min.js';
    script.async = true;
    script.onload = () => {
      if (window.Recharts) {
        console.log('Recharts cargado desde CDN');
        BarChart = window.Recharts.BarChart;
        Bar = window.Recharts.Bar;
        XAxis = window.Recharts.XAxis;
        YAxis = window.Recharts.YAxis;
        Tooltip = window.Recharts.Tooltip;
        Legend = window.Recharts.Legend;
        ResponsiveContainer = window.Recharts.ResponsiveContainer;
        PieChart = window.Recharts.PieChart;
        Pie = window.Recharts.Pie;
        Cell = window.Recharts.Cell;
      }
    };
    document.head.appendChild(script);
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#A4DE6C', '#D0ED57'];

const ReportsDashboard = () => {
  // eslint-disable-next-line no-unused-vars
  const theme = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [summaryData, setSummaryData] = useState(null);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [monthMenuAnchor, setMonthMenuAnchor] = useState(null);
  const [yearMenuAnchor, setYearMenuAnchor] = useState(null);
  
  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar datos
      const [monthlyResponse, yearlyResponse] = await Promise.all([
        fetchMonthlyReport(selectedMonth, selectedYear),
        fetchYearlyReport(selectedYear)
      ]);
      
      setMonthlyData(monthlyResponse.data);
      setYearlyData(yearlyResponse.data);
      
      // Intentar cargar el resumen
      try {
        const summaryResponse = await fetchSummary();
        setSummaryData(summaryResponse.data);
      } catch (err) {
        console.error('Error al cargar resumen:', err);
        // No establecemos error general si solo falla el resumen
      }
      
    } catch (err) {
      console.error('Error al cargar reportes:', err);
      setError('Error al cargar los datos de reportes. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleMonthMenuOpen = (event) => {
    setMonthMenuAnchor(event.currentTarget);
  };
  
  const handleMonthMenuClose = () => {
    setMonthMenuAnchor(null);
  };
  
  const handleYearMenuOpen = (event) => {
    setYearMenuAnchor(event.currentTarget);
  };
  
  const handleYearMenuClose = () => {
    setYearMenuAnchor(null);
  };
  
  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    handleMonthMenuClose();
  };
  
  const handleYearSelect = (year) => {
    setSelectedYear(year);
    handleYearMenuClose();
  };
  
  const formatCategoryData = () => {
    if (!monthlyData || !monthlyData.byCategory) return [];
    
    return Object.entries(monthlyData.byCategory).map(([category, amount]) => ({
      name: category,
      value: amount
    }));
  };
  
  const formatMonthlyData = () => {
    const monthNames = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];
    
    if (!yearlyData || !yearlyData.monthlyTotals) return [];
    
    return yearlyData.monthlyTotals.map((amount, index) => ({
      name: monthNames[index],
      amount: amount
    }));
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container 
      maxWidth={false} 
      disableGutters 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        py: { xs: 1, sm: 2 },
        px: 0
      }}
    >
      <Box sx={{ px: { xs: 1, sm: 1.5 }, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            {t('reports.title')}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              startIcon={<CalendarToday />}
              onClick={handleMonthMenuOpen}
            >
              {selectedMonth}/
              <span onClick={(e) => { e.stopPropagation(); handleYearMenuOpen(e); }}>
                {selectedYear}
              </span>
            </Button>
            
            <IconButton onClick={loadReports}>
              <Refresh />
            </IconButton>
          </Box>
          
          <Menu
            anchorEl={monthMenuAnchor}
            open={Boolean(monthMenuAnchor)}
            onClose={handleMonthMenuClose}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <MenuItem 
                key={month} 
                onClick={() => handleMonthSelect(month)}
                selected={month === selectedMonth}
              >
                {month}
              </MenuItem>
            ))}
          </Menu>
          
          <Menu
            anchorEl={yearMenuAnchor}
            open={Boolean(yearMenuAnchor)}
            onClose={handleYearMenuClose}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
              <MenuItem 
                key={year} 
                onClick={() => handleYearSelect(year)}
                selected={year === selectedYear}
              >
                {year}
              </MenuItem>
            ))}
          </Menu>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          {/* Distribución por categorías */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                height: 340,
              }}
            >
              <Typography variant="h6" gutterBottom>
                {t('reports.categoryDistribution')}
              </Typography>
              
              {monthlyData && monthlyData.byCategory ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={formatCategoryData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {formatCategoryData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography color="text.secondary">
                    {t('reports.noData')}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Totales mensuales */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                height: 340,
              }}
            >
              <Typography variant="h6" gutterBottom>
                {t('reports.monthlyExpenses')}
              </Typography>
              
              {monthlyData ? (
                <Box sx={{ textAlign: 'center', my: 2 }}>
                  <Typography variant="h4" color="primary">
                    ${monthlyData.total?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {monthlyData.count} gastos en {selectedMonth}/{selectedYear}
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography color="text.secondary">
                    {t('reports.noData')}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
          
          {/* Tendencia anual */}
          <Grid item xs={12}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                height: 400,
              }}
            >
              <Typography variant="h6" gutterBottom>
                {t('reports.annualTrend')} {selectedYear}
              </Typography>
              
              {yearlyData && yearlyData.monthlyTotals ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={formatMonthlyData()}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="amount" name="Gastos" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography color="text.secondary">
                    {t('reports.noData')}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default ReportsDashboard; 