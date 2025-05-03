import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  Fab,
  useTheme,
  alpha
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import ExpenseList from '../shared/ExpenseList';
import { useCurrency } from '../../context/CurrencyContext';
import * as expenseService from '../../services/expenseService';

const PersonalExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const { formatAmount } = useCurrency();
  const { t } = useTranslation();
  const theme = useTheme();

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await expenseService.getPersonalExpenses();
      setExpenses(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los gastos personales');
      showSnackbar('Error al cargar los gastos personales', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = () => {
    // Implementar lógica para abrir modal de nuevo gasto
  };

  const handleEditExpense = (expense) => {
    // Implementar lógica para editar gasto
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      await expenseService.deleteExpense(expenseId);
      setExpenses(expenses.filter(expense => expense._id !== expenseId));
      showSnackbar('Gasto eliminado correctamente', 'success');
    } catch (err) {
      showSnackbar('Error al eliminar el gasto', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };

  const calculateTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h4" component="h1">
                {t('personalExpenses')}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddExpense}
              >
                {t('newExpense')}
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                bgcolor: theme.palette.mode === 'dark' 
                  ? alpha(theme.palette.primary.main, 0.1) 
                  : alpha(theme.palette.primary.light, 0.1),
                borderRadius: 2
              }}
            >
              <Typography variant="h6" gutterBottom>
                {t('totalExpenses')}
              </Typography>
              <Typography variant="h4" component="div" sx={{ color: 'primary.main' }}>
                {formatAmount(calculateTotalExpenses())}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            {error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : (
              <ExpenseList
                expenses={expenses}
                onEdit={handleEditExpense}
                onDelete={handleDeleteExpense}
              />
            )}
          </Grid>
        </Grid>
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert 
          onClose={() => setOpenSnackbar(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: { xs: 72, sm: 32 },
          right: 32
        }}
        onClick={handleAddExpense}
      >
        <AddIcon />
      </Fab>
    </Container>
  );
};

export default PersonalExpenses; 