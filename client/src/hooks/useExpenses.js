import { useState, useCallback, useEffect } from 'react';
import * as sharedSessionService from '../services/sharedSessionService';
import * as expenseService from '../services/expenseService';
import { getFirstDayOfMonth, getLastDayOfMonth } from '../utils/dateHelpers';

export const useExpenses = (sessionId, month, year) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExpenses = useCallback(async () => {
    if (!sessionId) {
      console.log('No hay sessionId, saltando fetchExpenses');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log(`Obteniendo gastos para la sesión ${sessionId}, mes ${month}, año ${year}...`);
      
      // Obtener detalles de la sesión que incluye los gastos
      const sessionData = await sharedSessionService.getSessionDetails(sessionId);
      console.log('Datos de sesión obtenidos:', sessionData);
      
      if (!sessionData) {
        throw new Error('No se pudieron obtener los datos de la sesión');
      }
      
      // Filtrar gastos si es necesario por mes/año
      let filteredExpenses = sessionData.expenses || [];
      
      if (month !== undefined && year !== undefined && sessionData.sessionType === 'permanent') {
        console.log(`Filtrando gastos por mes ${month} y año ${year}`);
        const startDate = getFirstDayOfMonth(year, month);
        const endDate = getLastDayOfMonth(year, month);
        
        filteredExpenses = filteredExpenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= startDate && expenseDate <= endDate;
        });
      }
      
      console.log(`${filteredExpenses.length} gastos encontrados después del filtrado`);
      setExpenses(filteredExpenses);
    } catch (err) {
      console.error('Error al cargar los gastos:', err);
      setError('Error al cargar los gastos: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, [sessionId, month, year]);

  // Efecto para cargar gastos cuando cambian los parámetros
  useEffect(() => {
    if (sessionId) {
      console.log(`Ejecutando efecto para cargar gastos (sessionId: ${sessionId})`);
      fetchExpenses().catch(err => {
        console.error('Error no manejado en fetchExpenses:', err);
      });
    }
  }, [fetchExpenses, sessionId]);

  const addExpense = useCallback(async (expenseData) => {
    if (!sessionId) {
      throw new Error('No hay una sesión activa para añadir el gasto');
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log(`Añadiendo gasto a la sesión ${sessionId}:`, expenseData);
      
      // Obtener los detalles de la sesión para verificar participantes
      const sessionDetails = await sharedSessionService.getSessionDetails(sessionId);
      console.log('Detalles de sesión obtenidos para validar paidBy:', sessionDetails);
      
      // Obtener IDs de los participantes
      const participantIds = sessionDetails.participants
        .filter(p => p.userId)
        .map(p => {
          // Manejar tanto strings como objetos
          if (typeof p.userId === 'object' && p.userId._id) {
            return p.userId._id;
          }
          return p.userId;
        });
      
      console.log('IDs de participantes válidos:', participantIds);
      
      // Validar o establecer quién pagó
      let validPaidBy = expenseData.paidBy;
      
      // Si no se proporciona un pagador o no es válido, usar el del usuario actual o el primer participante
      if (!validPaidBy || !participantIds.includes(validPaidBy)) {
        // Intentar usar el ID del usuario actual
        const currentUserId = localStorage.getItem('userId');
        if (currentUserId && participantIds.includes(currentUserId)) {
          validPaidBy = currentUserId;
          console.log(`Usando ID del usuario actual como pagador: ${validPaidBy}`);
        } else if (participantIds.length > 0) {
          // Si el usuario actual no es un participante válido, usar el primer participante
          validPaidBy = participantIds[0];
          console.log(`Usando primer participante como pagador: ${validPaidBy}`);
        } else {
          // Caso extremo: si no hay participantes válidos, usar el creador de la sesión
          validPaidBy = sessionDetails.userId;
          console.log(`Usando creador de la sesión como pagador: ${validPaidBy}`);
        }
      }
      
      // Enviar los datos con el pagador validado
      const dataToSend = {
        ...expenseData,
        paidBy: validPaidBy
      };
      
      console.log(`Enviando gasto con paidBy validado:`, dataToSend);
      
      // Añadir gasto a la sesión compartida
      const response = await sharedSessionService.addExpenseToSession(sessionId, dataToSend);
      console.log('Respuesta al añadir gasto:', response);
      
      // Si la respuesta contiene la sesión completa actualizada
      if (response && response.expenses) {
        // Actualizar con todos los gastos de la sesión, filtrando por mes/año si es necesario
        let updatedExpenses = response.expenses || [];
        
        // Si se filtran por mes/año, aplicar el mismo filtro
        if (month !== undefined && year !== undefined && response.sessionType === 'permanent') {
          const startDate = getFirstDayOfMonth(year, month);
          const endDate = getLastDayOfMonth(year, month);
          
          updatedExpenses = updatedExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= startDate && expenseDate <= endDate;
          });
        }
        
        setExpenses(updatedExpenses);
        
        // Retornar el gasto recién añadido (el último de la lista)
        return updatedExpenses.length > 0 ? updatedExpenses[updatedExpenses.length - 1] : null;
      } else {
        // Si solo se devuelve el gasto añadido (y no la sesión completa)
        setExpenses(prev => [...prev, response]);
        return response;
      }
    } catch (err) {
      console.error('Error al añadir gasto:', err);
      const errorMessage = err.userMessage || err.message || 'Error desconocido';
      setError(`Error al añadir gasto: ${errorMessage}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId, month, year]);

  const updateExpense = useCallback(async (expenseId, expenseData) => {
    if (!sessionId) {
      throw new Error('No hay una sesión activa para actualizar el gasto');
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log(`Actualizando gasto ${expenseId} en la sesión ${sessionId}:`, expenseData);
      
      // Actualizar gasto en la sesión compartida
      const response = await sharedSessionService.updateSessionExpense(sessionId, expenseId, expenseData);
      console.log('Respuesta al actualizar gasto:', response);
      
      // Si la respuesta contiene la sesión completa actualizada
      if (response && response.expenses) {
        // Actualizar con todos los gastos de la sesión, filtrando por mes/año si es necesario
        let updatedExpenses = response.expenses || [];
        
        // Si se filtran por mes/año, aplicar el mismo filtro
        if (month !== undefined && year !== undefined && response.sessionType === 'permanent') {
          const startDate = getFirstDayOfMonth(year, month);
          const endDate = getLastDayOfMonth(year, month);
          
          updatedExpenses = updatedExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= startDate && expenseDate <= endDate;
          });
        }
        
        setExpenses(updatedExpenses);
        
        // Retornar el gasto actualizado
        const updatedExpense = updatedExpenses.find(exp => exp._id === expenseId);
        return updatedExpense || null;
      } else {
        // Si solo se devuelve el gasto actualizado (y no la sesión completa)
        setExpenses(prev => prev.map(expense => 
          expense._id === expenseId ? { ...expense, ...response } : expense
        ));
        return response;
      }
    } catch (err) {
      console.error('Error al actualizar gasto:', err);
      const errorMessage = err.userMessage || err.message || 'Error desconocido';
      setError(`Error al actualizar gasto: ${errorMessage}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId, month, year]);

  const deleteExpense = useCallback(async (expenseId) => {
    if (!sessionId) {
      throw new Error('No hay una sesión activa para eliminar el gasto');
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log(`Eliminando gasto ${expenseId} de la sesión ${sessionId}`);
      
      // Eliminar gasto de la sesión compartida
      const response = await sharedSessionService.deleteSessionExpense(sessionId, expenseId);
      console.log('Respuesta al eliminar gasto:', response);
      
      // Si la respuesta contiene la sesión completa actualizada
      if (response && response.expenses) {
        // Actualizar con todos los gastos de la sesión, filtrando por mes/año si es necesario
        let updatedExpenses = response.expenses || [];
        
        // Si se filtran por mes/año, aplicar el mismo filtro
        if (month !== undefined && year !== undefined && response.sessionType === 'permanent') {
          const startDate = getFirstDayOfMonth(year, month);
          const endDate = getLastDayOfMonth(year, month);
          
          updatedExpenses = updatedExpenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= startDate && expenseDate <= endDate;
          });
        }
        
        setExpenses(updatedExpenses);
      } else {
        // Si solo se confirma la eliminación, actualizar el estado local
        setExpenses(prev => prev.filter(expense => expense._id !== expenseId));
      }
      
      return true;
    } catch (err) {
      console.error('Error al eliminar gasto:', err);
      const errorMessage = err.userMessage || err.message || 'Error desconocido';
      setError(`Error al eliminar gasto: ${errorMessage}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId, month, year]);

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