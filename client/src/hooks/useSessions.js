import { useState, useCallback } from 'react';
import * as sharedSessionService from '../services/sharedSessionService';

export const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sharedSessionService.fetchSharedSessions();
      setSessions(data);
    } catch (err) {
      console.error('Error al cargar las sesiones:', err);
      setError('Error al cargar las sesiones');
    } finally {
      setLoading(false);
    }
  }, []);

  const createSession = useCallback(async (sessionData) => {
    try {
      setLoading(true);
      setError(null);
      const data = await sharedSessionService.createSession(sessionData);
      setSessions(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error al crear la sesión:', err);
      setError('Error al crear la sesión');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSession = useCallback(async (sessionId, sessionData) => {
    try {
      setLoading(true);
      setError(null);
      const data = await sharedSessionService.updateSession(sessionId, sessionData);
      setSessions(prev => prev.map(session => 
        session._id === sessionId ? { ...session, ...data } : session
      ));
      return data;
    } catch (err) {
      console.error('Error al actualizar la sesión:', err);
      setError('Error al actualizar la sesión');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSession = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      setError(null);
      await sharedSessionService.deleteSession(sessionId);
      setSessions(prev => prev.filter(session => session._id !== sessionId));
    } catch (err) {
      console.error('Error al eliminar la sesión:', err);
      setError('Error al eliminar la sesión');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const inviteParticipants = useCallback(async (sessionId, participants) => {
    try {
      setLoading(true);
      setError(null);
      const data = await sharedSessionService.addParticipant(sessionId, { participants });
      setSessions(prev => prev.map(session => 
        session._id === sessionId ? { ...session, participants: data.participants } : session
      ));
      return data;
    } catch (err) {
      console.error('Error al invitar participantes:', err);
      setError('Error al invitar participantes');
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
    inviteParticipants
  };
};

export default useSessions; 