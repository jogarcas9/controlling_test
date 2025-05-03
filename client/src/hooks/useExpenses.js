import { useState, useEffect, useCallback } from 'react';
import {
  fetchExpenses as fetchExpensesService,
  createExpense,
  updateExpense as updateExpenseService,
  deleteExpense as deleteExpenseService,
  getExpenseStatistics
} from '../services/expenseService';
import { getFirstDayOfMonth, getLastDayOfMonth } from '../utils/dateHelpers';

const useExpenses = (sessionId, selectedMonth, selectedYear) => {
  const [expenses, setExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);

  // Obtener todos los gastos de la sesión
  const fetchAllExpenses = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      
      // Determinar si se deben pasar los parámetros de filtrado
      let response;
      if (selectedMonth !== undefined && selectedYear !== undefined) {
        response = await fetchExpensesService({ sessionId, month: selectedMonth, year: selectedYear });
      } else {
        response = await fetchExpensesService({ sessionId });
      }
      
      setAllExpenses(response);
      
      // Obtener información de la sesión
      if (response.length > 0 && response[0].session) {
        setSessionInfo(response[0].session);
      }
      
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, selectedMonth, selectedYear]);
  
  // Actualizar los gastos filtrados por mes y año si es necesario
  useEffect(() => {
    if (!allExpenses.length) return;
    
    if (sessionInfo?.sessionType === 'permanent' && selectedMonth !== undefined && selectedYear !== undefined) {
      // Filtrar gastos por el mes y año seleccionados
      const startDate = getFirstDayOfMonth(selectedYear, selectedMonth);
      const endDate = getLastDayOfMonth(selectedYear, selectedMonth);
      
      const filteredExpenses = allExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
      
      setExpenses(filteredExpenses);
    } else {
      // Si no es permanente o no hay mes/año seleccionados, mostrar todos
      setExpenses(allExpenses);
    }
  }, [allExpenses, selectedMonth, selectedYear, sessionInfo]);

  const fetchExpenses = useCallback(async () => {
    await fetchAllExpenses();
  }, [fetchAllExpenses]);

  const addExpense = useCallback(async (expenseData) => {
    if (!sessionId) throw new Error('ID de sesión no disponible');
    
    try {
      // Si es sesión permanente y hay mes/año seleccionados, asignar esa fecha
      if (sessionInfo?.sessionType === 'permanent' && selectedMonth !== undefined && selectedYear !== undefined) {
        // Usar el día 15 del mes seleccionado o la fecha actual del gasto si existe
        const currentDate = new Date(expenseData.date || Date.now());
        const newDate = new Date(selectedYear, selectedMonth, currentDate.getDate());
        expenseData.date = newDate;
      }
      
      const response = await createExpense({ ...expenseData, sessionId });
      setAllExpenses(prev => [...prev, response]);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [sessionId, selectedMonth, selectedYear, sessionInfo]);

  const updateExpense = useCallback(async (expenseId, expenseData) => {
    if (!sessionId) throw new Error('ID de sesión no disponible');
    
    try {
      // Si es sesión permanente y hay mes/año seleccionados, mantener el mes/año actual
      if (sessionInfo?.sessionType === 'permanent' && selectedMonth !== undefined && selectedYear !== undefined) {
        // Mantener el día pero cambiar mes/año
        const currentDate = new Date(expenseData.date);
        const newDate = new Date(selectedYear, selectedMonth, currentDate.getDate());
        expenseData.date = newDate;
      }
      
      const response = await updateExpenseService(expenseId, { ...expenseData, sessionId });
      setAllExpenses(prev =>
        prev.map(expense =>
          expense._id === expenseId ? response : expense
        )
      );
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [sessionId, selectedMonth, selectedYear, sessionInfo]);

  const deleteExpense = useCallback(async (expenseId) => {
    if (!sessionId) throw new Error('ID de sesión no disponible');
    try {
      await deleteExpenseService(expenseId);
      setAllExpenses(prev => prev.filter(expense => expense._id !== expenseId));
      setExpenses(prev => prev.filter(expense => expense._id !== expenseId));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [sessionId]);

  const calculateTotal = useCallback(() => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  }, [expenses]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return {
    expenses,
    allExpenses,
    loading,
    error,
    fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    calculateTotal,
    refreshExpenses: fetchExpenses
  };
};

export default useExpenses; 