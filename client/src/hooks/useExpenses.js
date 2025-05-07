import { useState, useCallback, useEffect } from 'react';
import * as sharedSessionService from '../services/sharedSessionService';
import * as expenseService from '../services/expenseService';
import { getFirstDayOfMonth, getLastDayOfMonth, getMonthName } from '../utils/dateHelpers';

export const useExpenses = (sessionId, month, year) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchExpenses = useCallback(async () => {
    if (!sessionId || month === undefined || year === undefined) {
      console.log('No hay sessionId, mes o año, saltando fetchExpenses');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      console.log(`Obteniendo gastos para la sesión ${sessionId}, mes ${month} (${getMonthName(month)}), año ${year}...`);
      
      // Usar el nuevo endpoint del backend
      let response;
      try {
        // Asegurar que month se envía como 0-11 (donde 0 es enero y 11 es diciembre)
        const monthNum = Math.max(0, Math.min(11, parseInt(month)));
        response = await sharedSessionService.getExpensesByMonth(sessionId, year, monthNum);
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
              await sharedSessionService.repairSessionStructure(sessionId);
            } catch (repairError) {
              console.warn('Error al reparar sesión:', repairError);
            }
            
            // Antes de reintentar, intentar obtener los detalles de la sesión para
            // asegurarse de que el servidor tiene los datos correctos
            await sharedSessionService.getSessionDetails(sessionId);
            
            // Asegurar que month se envía en formato 0-11
            const monthNum = Math.max(0, Math.min(11, parseInt(month)));
            response = await sharedSessionService.getExpensesByMonth(sessionId, year, monthNum);
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
  }, [sessionId, month, year, retryCount]);

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
      
      // Crear un nuevo gasto formateado con la respuesta y añadirlo inmediatamente al estado
      // para que se actualice la interfaz sin necesidad de un refresco
      const newExpense = {
        ...response,
        _id: response._id || response.id || Math.random().toString(36).substring(2, 15),
        amount: typeof response.amount === 'number' ? response.amount : Number(response.amount) || 0,
        date: response.date ? new Date(response.date) : new Date(),
        name: response.name || dataToSend.name || 'Gasto',
        category: response.category || dataToSend.category || 'Otros',
        isRecurring: !!response.isRecurring
      };
      
      // Actualizar el estado local inmediatamente con el nuevo gasto
      setExpenses(prevExpenses => [...prevExpenses, newExpense]);
      
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
        
        // Retornar el gasto recién añadido (el último de la lista)
        return updatedExpenses.length > 0 ? updatedExpenses[updatedExpenses.length - 1] : null;
      } else {
        // Si solo se devuelve el gasto añadido (y no la sesión completa)
        // No es necesario actualizar el estado aquí, ya lo hicimos arriba
        return newExpense;
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
        const response = await sharedSessionService.updateSessionExpense(sessionId, expenseId, expenseData);
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
  }, [sessionId, month, year, expenses]);

  const deleteExpense = useCallback(async (expenseId) => {
    if (!sessionId) {
      throw new Error('No hay una sesión activa para eliminar el gasto');
    }
    
    // Verificar si hay token en localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No hay token JWT, el usuario debe iniciar sesión');
      setError('Se requiere iniciar sesión para eliminar gastos');
      throw new Error('No hay token de autenticación');
    }
    
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        setLoading(true);
        setError(null);
        console.log(`Eliminando gasto ${expenseId} de la sesión ${sessionId} (intento ${retryCount + 1}/${maxRetries + 1})`);
        
        // Actualizar inmediatamente el estado para mostrar el cambio en la UI
        // Guardar una copia del estado actual para poder revertir si hay error
        const previousExpenses = [...expenses];
        setExpenses(prev => prev.filter(expense => expense._id !== expenseId));
        
        try {
          // Eliminar gasto de la sesión compartida
          const response = await sharedSessionService.deleteSessionExpense(sessionId, expenseId);
          console.log('Respuesta al eliminar gasto:', response);
          
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
        } catch (error) {
          // Si hay un error al eliminar, revertir al estado anterior
          console.error('Error al eliminar, revertiendo estado:', error);
          setExpenses(previousExpenses);
          throw error; // Propagar el error para que lo maneje el bloque catch externo
        }
        
        setLoading(false);
        return true; // Éxito, salir del bucle de reintentos
      } catch (err) {
        retryCount++;
        
        // Extraer mensaje de error más amigable si existe
        const friendlyMessage = err.userMessage || 
                              (err.response?.data?.msg) || 
                              err.message || 
                              'Error desconocido';
        
        console.error(`Error al eliminar gasto (intento ${retryCount}/${maxRetries + 1}):`, err);
        console.error('Mensaje para usuario:', friendlyMessage);
        
        // Si es un error de autenticación, no seguir reintentando
        if (err.response && err.response.status === 401) {
          setError('Error de autenticación: Debes iniciar sesión nuevamente');
          setLoading(false);
          throw err;
        }
        
        // Si se agotaron los reintentos, propagar el error
        if (retryCount > maxRetries) {
          setError(`Error al eliminar gasto: ${friendlyMessage}`);
          setLoading(false);
          throw err;
        }
        
        // Esperar antes de reintentar (backoff exponencial)
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 8000);
        console.log(`Reintentando en ${backoffTime}ms...`);
        
        // Mostrar mensaje de reintento
        setError(`Error al eliminar gasto (intento ${retryCount}/${maxRetries + 1}): ${friendlyMessage}. Reintentando...`);
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }, [sessionId, month, year, expenses]);

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
    deleteExpense,
    calculateTotal
  };
};

export default useExpenses; 