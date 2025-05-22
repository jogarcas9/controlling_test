import api from '../utils/api';

// Función para enviar notificaciones a los participantes
export const sendInvitationNotifications = async (sessionId, participants) => {
  try {
    const response = await api.post(`/api/notifications/send-invitations`, {
      sessionId,
      participants
    });
    return response.data;
  } catch (error) {
    console.error('Error al enviar notificaciones:', error);
    throw error;
  }
};

// Función para obtener notificaciones pendientes
export const getPendingNotifications = async () => {
  try {
    const response = await api.get('/api/notifications/pending');
    return response.data;
  } catch (error) {
    console.error('Error al obtener notificaciones pendientes:', error);
    throw error;
  }
};

// Función para marcar una notificación como leída
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    throw error;
  }
}; 