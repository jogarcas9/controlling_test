import axios from 'axios';
import api from '../utils/api';

const BASE_URL = '/api/shared-sessions';

// Obtener el token de autenticación
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

const sessionService = {
  // Obtener todas las sesiones del usuario
  getSessions: async () => {
    console.log('Obteniendo sesiones del usuario...');
    const response = await axios.get(BASE_URL, getAuthConfig());
    console.log('Sesiones obtenidas:', response.data);
    return response.data;
  },
  
  // Obtener detalles de una sesión específica
  getSession: (id) => axios.get(`${BASE_URL}/${id}`, getAuthConfig()),
  
  // Crear una nueva sesión con participantes
  createSession: async (sessionData) => {
    try {
      console.log('Enviando datos para crear sesión:', sessionData);
      
      // Asegurarnos de que todos los participantes tienen estado 'pending' y rol 'member'
      const formattedParticipants = sessionData.participants.map(p => ({
        email: p.email.toLowerCase(),
        name: p.name || p.email.split('@')[0],
        role: 'member',
        status: 'pending',
        canEdit: p.canEdit || false,
        canDelete: p.canDelete || false
      }));

      // Obtener el email del creador
      const creatorEmail = localStorage.getItem('email');

      // Obtener información del creador
      const userId = localStorage.getItem('userId');
      const userName = localStorage.getItem('nombre') || creatorEmail;
      
      console.log('Información del creador:', { userId, userName, creatorEmail });
      
      const response = await api.post(
        BASE_URL, 
        { 
          name: sessionData.name,
          description: sessionData.description,
          participants: formattedParticipants,
          sessionType: sessionData.sessionType || 'single'
        }
      );
      
      console.log('Respuesta del servidor:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error al crear sesión:', error);
      throw error;
    }
  },
  
  // Actualizar una sesión existente
  updateSession: (id, sessionData) => api.put(`${BASE_URL}/${id}`, sessionData),
  
  // Eliminar una sesión
  deleteSession: (id) => api.delete(`${BASE_URL}/${id}`),
  
  // Invitar participantes a una sesión existente (eliminada)
  inviteParticipants: async (sessionId, participants) => {
    const errorMessage = 'La funcionalidad de invitaciones ha sido eliminada de la aplicación';
    console.error(errorMessage);
    throw new Error(errorMessage);
  },
  
  // Responder a una invitación (eliminada)
  respondToInvitation: async (sessionId, accept) => {
    const errorMessage = 'La funcionalidad de invitaciones ha sido eliminada de la aplicación';
    console.error(errorMessage);
    throw new Error(errorMessage);
  },
  
  // Sincronizar gastos de sesión compartida a gastos personales
  syncToPersonal: (sessionId) =>
    api.post(`${BASE_URL}/${sessionId}/sync-to-personal`, {}),

  // Actualizar la distribución de gastos
  updateDistribution: async (sessionId, distribution) => {
    const response = await api.put(
      `${BASE_URL}/${sessionId}/update-distribution`,
      { distribution }
    );
    return response.data;
  }
};

export default sessionService; 