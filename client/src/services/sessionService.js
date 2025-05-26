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
      const response = await api.post(BASE_URL, sessionData);
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