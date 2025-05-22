import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as sharedSessionService from '../services/sharedSessionService';

export const useSession = () => {
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchSession = useCallback(async (sessionId) => {
    try {
      if (!sessionId) {
        throw new Error('Se requiere el ID de la sesión');
      }

      setLoading(true);
      setError(null);
      
      console.log('Obteniendo detalles de la sesión:', sessionId);
      const session = await sharedSessionService.getSessionDetails(sessionId);
      
      if (!session || !session._id) {
        throw new Error('Los datos de la sesión están incompletos');
      }

      console.log('Sesión obtenida:', session);
      setCurrentSession(session);
      
      // Guardar la sesión actual en localStorage para persistencia
      localStorage.setItem('currentSessionId', sessionId);
      localStorage.setItem('currentSessionData', JSON.stringify(session));
    } catch (err) {
      console.error('Error al cargar la sesión:', err);
      setError(err.message || 'Error al cargar la sesión');
      setCurrentSession(null);
      localStorage.removeItem('currentSessionId');
      localStorage.removeItem('currentSessionData');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSession = useCallback(() => {
    setCurrentSession(null);
    localStorage.removeItem('currentSessionId');
    localStorage.removeItem('currentSessionData');
  }, []);

  useEffect(() => {
    // Recuperar sesión del localStorage al montar el componente
    const savedSessionId = localStorage.getItem('currentSessionId');
    const savedSessionData = localStorage.getItem('currentSessionData');
    
    if (savedSessionId && savedSessionData) {
      try {
        const parsedSession = JSON.parse(savedSessionData);
        setCurrentSession(parsedSession);
        
        // Refrescar los datos de la sesión en segundo plano
        fetchSession(savedSessionId).catch(console.error);
      } catch (error) {
        console.error('Error al recuperar la sesión guardada:', error);
        clearSession();
      }
    }
  }, [fetchSession, clearSession]);

  const createSession = async (sessionData) => {
    try {
      setLoading(true);
      setError(null);
      
      const newSession = await sharedSessionService.createSession(sessionData);
      setCurrentSession(newSession);
      localStorage.setItem('currentSessionId', newSession._id);
      localStorage.setItem('currentSessionData', JSON.stringify(newSession));
      
      return newSession;
    } catch (err) {
      setError(err.message || 'Error al crear la sesión');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSession = async (sessionId, updateData) => {
    try {
      if (!sessionId) {
        throw new Error('Se requiere el ID de la sesión');
      }

      setLoading(true);
      setError(null);
      
      const updatedSession = await sharedSessionService.updateSession(sessionId, updateData);
      setCurrentSession(updatedSession);
      localStorage.setItem('currentSessionData', JSON.stringify(updatedSession));
      
      return updatedSession;
    } catch (err) {
      setError(err.message || 'Error al actualizar la sesión');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async (expenseData) => {
    try {
      if (!currentSession?._id) {
        throw new Error('No hay una sesión activa');
      }

      setLoading(true);
      setError(null);
      
      const updatedSession = await sharedSessionService.addExpenseToSession(currentSession._id, expenseData);
      setCurrentSession(updatedSession);
      localStorage.setItem('currentSessionData', JSON.stringify(updatedSession));
      
      return updatedSession;
    } catch (err) {
      setError(err.message || 'Error al añadir el gasto');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (expenseId) => {
    try {
      if (!currentSession?._id) {
        throw new Error('No hay una sesión activa');
      }

      setLoading(true);
      setError(null);
      
      const updatedSession = await sharedSessionService.deleteSessionExpense(currentSession._id, expenseId);
      setCurrentSession(updatedSession);
      localStorage.setItem('currentSessionData', JSON.stringify(updatedSession));
      
      return updatedSession;
    } catch (err) {
      setError(err.message || 'Error al eliminar el gasto');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const switchSession = async (sessionId) => {
    try {
      await fetchSession(sessionId);
      navigate(`/shared-sessions/${sessionId}`);
    } catch (err) {
      setError(err.message || 'Error al cambiar de sesión');
      throw err;
    }
  };

  const refreshCurrentSession = async () => {
    try {
      if (currentSession?._id) {
        await fetchSession(currentSession._id);
      }
    } catch (err) {
      console.error('Error al refrescar la sesión actual:', err);
    }
  };

  return {
    currentSession,
    loading,
    error,
    fetchSession,
    clearSession,
    createSession,
    updateSession,
    addExpense,
    deleteExpense,
    switchSession,
    refreshCurrentSession
  };
}; 