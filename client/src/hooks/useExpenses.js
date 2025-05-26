import { useState, useCallback, useEffect } from 'react';
import * as sharedSessionService from '../services/sharedSessionService';
import * as expenseService from '../services/expenseService';
import { getFirstDayOfMonth, getLastDayOfMonth, getMonthName } from '../utils/dateHelpers';

export const useExpenses = (sessionId, month, year) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId || null);

  // Actualizar currentSessionId cuando cambia sessionId
  useEffect(() => {
    setCurrentSessionId(sessionId || null);
  }, [sessionId]);

  const fetchExpenses = useCallback(async () => {
    if (!currentSessionId || month === undefined || year === undefined) {
      console.log('No hay sessionId, mes o año, saltando fetchExpenses');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      console.log(`Obteniendo gastos para la sesión ${currentSessionId}, mes ${month} (${getMonthName(month)}), año ${year}...`);
      
      // Usar el nuevo endpoint del backend
      let response;
      try {
        // Asegurar que month se envía como 0-11 (donde 0 es enero y 11 es diciembre)
        const monthNum = Math.max(0, Math.min(11, parseInt(month)));
        response = await sharedSessionService.getExpensesByMonth(currentSessionId, year, monthNum);
      } catch (err) {
        // Verificar si es un error de autenticación
        if (err.response && err.response.status === 401) {
          console.error('Error de autenticación, el usuario debe iniciar sesión nuevamente');
          localStorage.removeItem('token'); // Limpiar token inválido
          setError('Sesión expirada. Por favor, inicie sesión nuevamente.');
          setLoading(false);
          return; // No reintentar en caso de error de autenticación
        }
        
        // Si falla la petición, intentar una vez más después de un segundo
        console.error('Primera petición falló, reintentando en 1 segundo...', err);
        
        if (retryCount < 3) {
          setRetryCount(prev => prev + 1);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            // Primero intentar reparar la estructura
            try {
              console.log('Intentando reparar la estructura de datos de la sesión...');
              await sharedSessionService.repairSessionStructure(currentSessionId);
            } catch (repairError) {
              console.warn('Error al reparar sesión:', repairError);
            }
            
            // Antes de reintentar, intentar obtener los detalles de la sesión para
            // asegurarse de que el servidor tiene los datos correctos
            await sharedSessionService.getSessionDetails(currentSessionId);
            
            // Asegurar que month se envía en formato 0-11
            const monthNum = Math.max(0, Math.min(11, parseInt(month)));
            response = await sharedSessionService.getExpensesByMonth(currentSessionId, year, monthNum);
          } catch (retryErr) {
            // Verificar si es un error de autenticación en el reintento
            if (retryErr.response && retryErr.response.status === 401) {
              console.error('Error de autenticación en reintento, el usuario debe iniciar sesión nuevamente');
              localStorage.removeItem('token');
              setError('Sesión expirada. Por favor, inicie sesión nuevamente.');
              setLoading(false);
              return;
            }
            
            console.error('Falló el reintento, utilizando array vacío', retryErr);
            response = []; // Si falla el reintento, usar array vacío
          }
        } else {
          console.warn('Se alcanzó el límite de reintentos');
          response = []; // Si se ha alcanzado el límite de reintentos, usar array vacío
        }
      }
      
      // Asegurar que los campos estén bien formateados
      const formattedExpenses = (response || []).map(exp => ({
        ...exp,
        amount: typeof exp.amount === 'number' ? exp.amount : Number(exp.amount) || 0,
        date: exp.date ? new Date(exp.date) : null,
        name: exp.name || '',
        category: exp.category || '',
        isRecurring: !!exp.isRecurring,
        _id: exp._id || exp.id || Math.random().toString(36).substring(2, 15)
      }));
      setExpenses(formattedExpenses);
    } catch (err) {
      console.error('Error al cargar los gastos:', err);
      
      // Manejo específico para errores de autenticación
      if (err.response && err.response.status === 401) {
        setError('Sesión expirada. Por favor, inicie sesión nuevamente.');
        localStorage.removeItem('token');
      } else {
        setError('Error al cargar los gastos: ' + (err.message || 'Error desconocido'));
      }
      // No dejar la lista vacía, mantener los datos anteriores
    } finally {
      setLoading(false);
    }
  }, [currentSessionId, month, year, retryCount]);

  // Efecto para cargar gastos cuando cambian los parámetros
  useEffect(() => {
    if (currentSessionId) {
      console.log(`Ejecutando efecto para cargar gastos (sessionId: ${currentSessionId})`);
      fetchExpenses().catch(err => {
        console.error('Error no manejado en fetchExpenses:', err);
      });
    }
  }, [fetchExpenses, currentSessionId]);

  const addExpense = useCallback(async (expenseData) => {
    if (!currentSessionId) {
      throw new Error('No hay una sesión activa para añadir el gasto');
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('\n=== DATOS RECIBIDOS EN useExpenses ===');
      console.log('Datos completos recibidos:', JSON.stringify(expenseData, null, 2));
      console.log('Tipo de amount:', typeof expenseData.amount);
      console.log('Valor de amount:', expenseData.amount);
      
      // Procesar el monto antes de cualquier otra operación
      let amount = expenseData.amount;
      
      // Si no es un número, intentar convertirlo
      if (typeof amount !== 'number') {
        try {
          // Asegurar que tenemos un string y reemplazar coma por punto
          const amountStr = amount.toString().replace(',', '.');
          // Convertir a número
          amount = parseFloat(amountStr);
          
          if (isNaN(amount)) {
            throw new Error('El monto no es un número válido');
          }
        } catch (error) {
          console.error('Error procesando el monto en useExpenses:', error);
          throw new Error('El monto debe ser un número válido');
        }
      }
      
      // Fijar a 2 decimales y asegurar que es número
      amount = Number(Number(amount).toFixed(2));
      
      if (isNaN(amount)) {
        throw new Error('El monto final no es un número válido');
      }
      
      console.log('\nMONTO PROCESADO:');
      console.log('- Valor final:', amount);
      console.log('- Tipo final:', typeof amount);
      console.log('- Es número válido:', !isNaN(amount));
      
      // Obtener los detalles de la sesión para verificar participantes
      const sessionDetails = await sharedSessionService.getSessionDetails(currentSessionId);
      
      // Obtener IDs de los participantes
      const participantIds = sessionDetails.participants
        .filter(p => p.userId)
        .map(p => {
          if (typeof p.userId === 'object' && p.userId._id) {
            return p.userId._id;
          }
          return p.userId;
        });
      
      // Validar o establecer quién pagó
      let validPaidBy = expenseData.paidBy;
      
      if (!validPaidBy || !participantIds.includes(validPaidBy)) {
        const currentUserId = localStorage.getItem('userId');
        if (currentUserId && participantIds.includes(currentUserId)) {
          validPaidBy = currentUserId;
        } else if (participantIds.length > 0) {
          validPaidBy = participantIds[0];
        } else {
          validPaidBy = sessionDetails.userId;
        }
      }
      
      // Enviar los datos con el pagador validado y el monto procesado
      const dataToSend = {
        ...expenseData,
        name: expenseData.name?.trim() || 'Gasto sin nombre',
        description: expenseData.description?.trim() || '',
        amount, // Usar el monto procesado
        category: expenseData.category?.trim() || 'Otros',
        date: expenseData.date ? new Date(expenseData.date).toISOString() : new Date().toISOString(),
        paidBy: validPaidBy,
        isRecurring: !!expenseData.isRecurring
      };
      
      console.log('\nDATOS FINALES A ENVIAR:');
      console.log(JSON.stringify(dataToSend, null, 2));
      console.log('Tipo de amount en datos finales:', typeof dataToSend.amount);
      console.log('Valor de amount en datos finales:', dataToSend.amount);
      
      const response = await sharedSessionService.addExpenseToSession(currentSessionId, dataToSend);
      return response;
    } catch (err) {
      console.error('Error en addExpense:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentSessionId]);

  const updateExpense = useCallback(async (expenseId, expenseData) => {
    if (!currentSessionId) {
      throw new Error('No hay una sesión activa para actualizar el gasto');
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log(`Actualizando gasto ${expenseId} en la sesión ${currentSessionId}:`, expenseData);
      
      // Actualizar inmediatamente el estado para mostrar cambios en la UI
      // Guardar una copia del estado anterior para poder revertir si hay error
      const previousExpenses = [...expenses];
      const updatedExpense = {
        ...expenses.find(e => e._id === expenseId),
        ...expenseData,
        _id: expenseId,
        amount: typeof expenseData.amount === 'number' ? expenseData.amount : Number(expenseData.amount) || 0,
        date: expenseData.date ? new Date(expenseData.date) : new Date()
      };
      
      setExpenses(prev => prev.map(expense => 
        expense._id === expenseId ? updatedExpense : expense
      ));
      
      try {
        // Actualizar gasto en la sesión compartida
        const response = await sharedSessionService.updateSessionExpense(currentSessionId, expenseId, expenseData);
        console.log('Respuesta al actualizar gasto:', response);
        
        // Si la respuesta contiene la sesión completa actualizada
        if (response && response.expenses) {
          // Actualizar con todos los gastos de la sesión, filtrando por mes/año si es necesario
          let updatedExpenses = response.expenses || [];
          
          // Si se filtran por mes/año, aplicar el mismo filtro
          if (month !== undefined && year !== undefined && response.sessionType === 'permanent') {
            // Asegurar que month esté en rango 0-11
            const monthNum = Math.max(0, Math.min(11, parseInt(month)));
            const startDate = getFirstDayOfMonth(year, monthNum);
            const endDate = getLastDayOfMonth(year, monthNum);
            
            console.log(`Filtrando gastos entre ${startDate.toISOString()} y ${endDate.toISOString()}`);
            
            updatedExpenses = updatedExpenses.filter(expense => {
              const expenseDate = new Date(expense.date);
              return expenseDate >= startDate && expenseDate <= endDate;
            });
          }
          
          setExpenses(updatedExpenses);
        }
        // Si no hay respuesta detallada, ya actualizamos el estado al inicio
        
        // Retornar el gasto actualizado
        return updatedExpense;
      } catch (error) {
        // Si hay un error, revertir al estado anterior
        console.error('Error al actualizar, revertiendo estado:', error);
        setExpenses(previousExpenses);
        throw error; // Propagar el error para que lo maneje el bloque catch externo
      }
    } catch (err) {
      console.error('Error al actualizar gasto:', err);
      const errorMessage = err.userMessage || err.message || 'Error desconocido';
      setError(`Error al actualizar gasto: ${errorMessage}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentSessionId, month, year, expenses]);

  const calculateTotal = useCallback(() => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  }, [expenses]);

  return {
    expenses,
    loading,
    error,
    setExpenses,
    fetchExpenses,
    addExpense,
    updateExpense,
    calculateTotal
  };
};

export default useExpenses; 