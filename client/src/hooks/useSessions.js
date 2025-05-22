import { useState, useCallback, useEffect } from 'react';
import * as sharedSessionService from '../services/sharedSessionService';

export const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchSessions = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Obteniendo lista de sesiones...');
      const data = await sharedSessionService.fetchSharedSessions(forceRefresh);
      console.log(`${data.length} sesiones obtenidas`);
      setSessions(data);
      setLastUpdated(new Date());
      return data;
    } catch (err) {
      console.error('Error al cargar las sesiones:', err);
      const errorMessage = err.userMessage || 'Error al cargar las sesiones';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar sesiones automáticamente al montar el componente
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = useCallback(async (sessionData) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Creando sesión con datos:', sessionData);
      const data = await sharedSessionService.createSession(sessionData);
      console.log('Sesión creada:', data);
      
      if (data && data._id) {
        // Actualizar la lista completa en lugar de añadir solo la nueva
        await fetchSessions(true);
        
        // Si hay advertencias, mostrarlas
        if (data.warnings) {
          console.warn('Advertencias al crear la sesión:', data.warnings);
          // Aquí podrías manejar las advertencias de alguna manera específica
        }
        
        return data;
      } else {
        throw new Error('La respuesta del servidor no contiene un ID válido');
      }
    } catch (err) {
      console.error('Error al crear la sesión:', err);
      const errorMessage = err.response?.data?.msg || err.message || 'Error al crear la sesión';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchSessions]);

  const updateSession = useCallback(async (sessionId, sessionData) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Actualizando sesión ${sessionId} con datos:`, sessionData);
      const data = await sharedSessionService.updateSession(sessionId, sessionData);
      console.log('Sesión actualizada:', data);
      
      if (data) {
        // Actualizar la sesión en el array
        setSessions(prev => prev.map(session => 
          session._id === sessionId ? { ...session, ...data } : session
        ));
        setLastUpdated(new Date());
        return data;
      } else {
        throw new Error('No se recibieron datos actualizados del servidor');
      }
    } catch (err) {
      console.error('Error al actualizar la sesión:', err);
      const errorMessage = err.userMessage || 'Error al actualizar la sesión';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSession = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Eliminando sesión ${sessionId}...`);
      await sharedSessionService.deleteSession(sessionId);
      console.log(`Sesión ${sessionId} eliminada correctamente`);
      
      // Actualizar estado local
      setSessions(prev => prev.filter(session => session._id !== sessionId));
      setLastUpdated(new Date());
      return true;
    } catch (err) {
      console.error('Error al eliminar la sesión:', err);
      const errorMessage = err.userMessage || 'Error al eliminar la sesión';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSessionDetails = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Obteniendo detalles de la sesión ${sessionId}...`);
      const data = await sharedSessionService.getSessionDetails(sessionId);
      
      if (!data) {
        throw new Error('No se pudieron obtener los detalles de la sesión');
      }
      
      console.log('Detalles de sesión obtenidos:', data);
      
      // Actualizar la sesión en el estado si ya existe
      setSessions(prev => {
        const sessionExists = prev.some(s => s._id === sessionId);
        if (sessionExists) {
          return prev.map(s => s._id === sessionId ? data : s);
        }
        return prev;
      });
      
      return data;
    } catch (err) {
      console.error('Error al obtener detalles de la sesión:', err);
      const errorMessage = err.userMessage || 'Error al obtener detalles de la sesión';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async (sessionId) => {
    if (!sessionId) return null;
    try {
      return await getSessionDetails(sessionId);
    } catch (err) {
      console.error(`Error al refrescar la sesión ${sessionId}:`, err);
      return null;
    }
  }, [getSessionDetails]);

  return {
    sessions,
    loading,
    error,
    lastUpdated,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
    getSessionDetails,
    refreshSession
  };
};

export default useSessions; 