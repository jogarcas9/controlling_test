import { useState, useCallback, useEffect } from 'react';
import * as sharedSessionService from '../services/sharedSessionService';

export const useInvitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sharedSessionService.fetchPendingInvitations();
      setInvitations(data);
      setCount(data.length);
    } catch (err) {
      console.error('Error al cargar invitaciones pendientes:', err);
      setError('Error al cargar las invitaciones pendientes');
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptInvitation = useCallback(async (invitationId) => {
    try {
      setLoading(true);
      setError(null);
      await sharedSessionService.respondToInvitation(invitationId, 'accept');
      await fetchInvitations();
      return true;
    } catch (err) {
      console.error('Error al aceptar invitación:', err);
      setError('Error al aceptar la invitación');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchInvitations]);

  const rejectInvitation = useCallback(async (invitationId) => {
    try {
      setLoading(true);
      setError(null);
      await sharedSessionService.respondToInvitation(invitationId, 'reject');
      await fetchInvitations();
      return true;
    } catch (err) {
      console.error('Error al rechazar invitación:', err);
      setError('Error al rechazar la invitación');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchInvitations]);

  // Cargar invitaciones al inicializar el hook
  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return {
    invitations,
    loading,
    error,
    count,
    fetchInvitations,
    acceptInvitation,
    rejectInvitation
  };
};

export default useInvitations; 