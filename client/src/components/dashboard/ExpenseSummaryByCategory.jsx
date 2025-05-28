import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  alpha
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { formatAmount, CATEGORY_ICONS, CATEGORY_COLORS } from '../../utils/expenseUtils';
import { PieChart } from '@mui/x-charts/PieChart';
import api from '../../utils/api';

const ExpenseSummaryByCategory = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [loading, setLoading] = useState(true);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [error, setError] = useState(null);

  // Función para obtener el color de una categoría
  const getCategoryColor = (category) => {
    return CATEGORY_COLORS[category] || theme.palette.grey[500];
  };

  useEffect(() => {
    const fetchCategorySummary = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Obtener gastos del mes actual
        const response = await api.get('/api/personal-expenses/monthly');
        const expenses = response.data || [];
        
        // Filtrar solo gastos (no ingresos)
        const onlyExpenses = expenses.filter(exp => exp.type === 'expense');
        
        // Agrupar por categoría y sumar montos
        const categoryMap = {};
        onlyExpenses.forEach(expense => {
          const category = expense.category || 'Otros';
          if (!categoryMap[category]) {
            categoryMap[category] = {
              category,
              total: 0,
              count: 0
            };
          }
          categoryMap[category].total += Math.abs(Number(expense.amount) || 0);
          categoryMap[category].count += 1;
        });
        
        // Convertir a array y ordenar de mayor a menor
        const categorySummary = Object.values(categoryMap).sort((a, b) => b.total - a.total);
        
        setExpensesByCategory(categorySummary);
      } catch (err) {
        console.error('Error al obtener resumen por categorías:', err);
        setError('Error al cargar los datos de categorías');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategorySummary();
  }, []);

  // Preparar datos para el gráfico de pastel
  const pieChartData = expensesByCategory.map(item => ({
    id: item.category,
    value: item.total,
    label: item.category,
    color: getCategoryColor(item.category)
  }));

  // Calcular el total de gastos
  const totalExpenses = expensesByCategory.reduce((sum, item) => sum + item.total, 0);

  // Mostrar el esqueleto mientras se cargan los datos
  if (loading) {
    return (
      <Card 
        sx={{ 
          height: '100%', 
          borderRadius: 2, 
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('Gastos por Categoría')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant="rectangular" height={isMobile ? 200 : 250} animation="wave" />
            <Skeleton variant="rectangular" height={200} animation="wave" />
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Mostrar mensaje de error si falla la carga
  if (error) {
    return (
      <Card 
        sx={{ 
          height: '100%', 
          borderRadius: 2, 
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('Gastos por Categoría')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: 250
            }}
          >
            <Typography color="error">
              {error}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        height: '100%', 
        borderRadius: 2, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
      }}
    >
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('Gastos por Categoría')}
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {expensesByCategory.length === 0 ? (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: 250
            }}
          >
            <Typography color="text.secondary">
              {t('No hay gastos registrados este mes')}
            </Typography>
          </Box>
        ) : (
          <Box>
            <Grid container spacing={2}>
              {/* Gráfico de pastel - Ocupa toda la anchura en móvil, mitad en escritorio */}
              <Grid item xs={12} md={6}>
                <Box 
                  sx={{ 
                    height: isMobile ? 220 : 270,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <PieChart
                    series={[
                      {
                        data: pieChartData,
                        innerRadius: 30,
                        outerRadius: isMobile ? 80 : 100,
                        paddingAngle: 1,
                        cornerRadius: 5,
                        startAngle: 0,
                        endAngle: 360,
                        cx: isMobile ? 110 : 130,
                        cy: isMobile ? 100 : 120
                      }
                    ]}
                    height={isMobile ? 200 : 250}
                    width={isMobile ? 220 : 260}
                    slotProps={{
                      legend: { hidden: true }
                    }}
                  />
                </Box>
              </Grid>
              
              {/* Tabla de categorías */}
              <Grid item xs={12} md={6}>
                <TableContainer 
                  component={Paper} 
                  sx={{ 
                    boxShadow: 'none', 
                    maxHeight: isMobile ? 220 : 270,
                    overflow: 'auto'
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('Categoría')}</TableCell>
                        <TableCell align="right">{t('Importe')}</TableCell>
                        <TableCell align="right">{t('%')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {expensesByCategory.map((item) => (
                        <TableRow key={item.category}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                size="small"
                                sx={{
                                  bgcolor: alpha(getCategoryColor(item.category), 0.15),
                                  color: getCategoryColor(item.category),
                                  fontWeight: 'medium',
                                  minWidth: '8px',
                                  width: '8px',
                                  height: '8px',
                                  '& .MuiChip-label': { 
                                    padding: 0
                                  }
                                }}
                              />
                              {item.category}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            {formatAmount(item.total)}
                          </TableCell>
                          <TableCell align="right">
                            {totalExpenses ? Math.round((item.total / totalExpenses) * 100) : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
            
            <Box mt={2} sx={{ textAlign: 'right' }}>
              <Typography variant="subtitle1" fontWeight="medium">
                {t('Total de gastos')}: {formatAmount(totalExpenses)}
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpenseSummaryByCategory; 