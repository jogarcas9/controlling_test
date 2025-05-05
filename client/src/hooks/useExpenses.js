import { useState, useCallback, useEffect } from 'react';
import * as sharedSessionService from '../services/sharedSessionService';
import * as expenseService from '../services/expenseService';
import { getFirstDayOfMonth, getLastDayOfMonth } from '../utils/dateHelpers';

export const useExpenses = (sessionId, month, year) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExpenses = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let data;
      if (sessionId) {
        // Fetching expenses for a shared session
        data = await sharedSessionService.getSessionDetails(sessionId);
        setExpenses(data.expenses || []);
      } else {
        // Fetching personal expenses
        data = await expenseService.getPersonalExpenses();
        setExpenses(data || []);
      }
    } catch (err) {
      console.error('Error al cargar los gastos:', err);
      setError('Error al cargar los gastos');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses, month, year]);

  const addExpense = useCallback(async (expenseData) => {
    try {
      setLoading(true);
      setError(null);
      
      let data;
      if (sessionId) {
        // Add expense to shared session
        data = await sharedSessionService.addExpenseToSession(sessionId, expenseData);
      } else {
        // Add personal expense
        data = await expenseService.createExpense(expenseData);
      }
      
      setExpenses(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error al añadir gasto:', err);
      setError('Error al añadir gasto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const updateExpense = useCallback(async (expenseId, expenseData) => {
    try {
      setLoading(true);
      setError(null);
      
      let data;
      if (sessionId) {
        // Update expense in shared session
        data = await sharedSessionService.updateSessionExpense(sessionId, expenseId, expenseData);
      } else {
        // Update personal expense
        data = await expenseService.updateExpense(expenseId, expenseData);
      }
      
      setExpenses(prev => prev.map(expense => 
        expense._id === expenseId ? { ...expense, ...data } : expense
      ));
      return data;
    } catch (err) {
      console.error('Error al actualizar gasto:', err);
      setError('Error al actualizar gasto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const deleteExpense = useCallback(async (expenseId) => {
    try {
      setLoading(true);
      setError(null);
      
      if (sessionId) {
        // Delete expense from shared session
        await sharedSessionService.deleteSessionExpense(sessionId, expenseId);
      } else {
        // Delete personal expense
        await expenseService.deleteExpense(expenseId);
      }
      
      setExpenses(prev => prev.filter(expense => expense._id !== expenseId));
    } catch (err) {
      console.error('Error al eliminar gasto:', err);
      setError('Error al eliminar gasto');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const calculateTotal = useCallback(() => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  }, [expenses]);

  return {
    expenses,
    loading,
    error,
    fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    calculateTotal
  };
};

export default useExpenses; 