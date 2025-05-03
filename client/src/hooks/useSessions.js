import { useState, useCallback, useEffect } from 'react';
import sessionService from '../services/sessionService';

const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Obteniendo sesiones compartidas...');
      const data = await sessionService.getSessions();
      console.log(`Obtenidas ${data.length} sesiones compartidas`);
      
      if (Array.isArray(data)) {
        setSessions(data);
      } else {
        console.error('El formato de datos recibido no es un array:', data);
        setSessions([]);
      }
      
      setError(null);
    } catch (err) {
      const errorMsg = err.response?.data?.msg || err.message;
      setError(errorMsg);
      console.error('Error al obtener sesiones:', errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Efecto para cargar sesiones automáticamente al montar el componente
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = useCallback(async (sessionData) => {
    setLoading(true);
    try {
      console.log('Creando nueva sesión compartida:', sessionData);
      const newSession = await sessionService.createSession(sessionData);
      
      // Actualizar la lista de sesiones
      setSessions(prevSessions => [...prevSessions, newSession]);
      
      console.log('Sesión creada con éxito:', newSession);
      return newSession;
    } catch (err) {
      const errorMsg = err.response?.data?.msg || err.message;
      setError(errorMsg);
      console.error('Error al crear sesión:', errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSession = useCallback(async (sessionId, sessionData) => {
    setLoading(true);
    try {
      console.log(`Actualizando sesión ${sessionId}:`, sessionData);
      const updatedSession = await sessionService.updateSession(sessionId, sessionData);
      
      // Actualizar la lista de sesiones
      setSessions(prevSessions =>
        prevSessions.map(session =>
          session._id === sessionId ? updatedSession : session
        )
      );
      
      console.log('Sesión actualizada con éxito:', updatedSession);
      return updatedSession;
    } catch (err) {
      const errorMsg = err.response?.data?.msg || err.message;
      setError(errorMsg);
      console.error(`Error al actualizar sesión ${sessionId}:`, errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSession = useCallback(async (sessionId) => {
    setLoading(true);
    try {
      console.log(`Eliminando sesión ${sessionId}`);
      await sessionService.deleteSession(sessionId);
      
      // Eliminar la sesión de la lista
      setSessions(prevSessions =>
        prevSessions.filter(session => session._id !== sessionId)
      );
      
      console.log(`Sesión ${sessionId} eliminada con éxito`);
      return true;
    } catch (err) {
      const errorMsg = err.response?.data?.msg || err.message;
      setError(errorMsg);
      console.error(`Error al eliminar sesión ${sessionId}:`, errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
    setSessions
  };
};

export default useSessions; 