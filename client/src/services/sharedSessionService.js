import api from '../utils/api';
import axios from 'axios';

// Configuración de Axios
const API = axios.create({
  baseURL: '/api'
});

// Interceptor para añadir el token a todas las solicitudes
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Tiempo de caché para las sesiones (en ms)
const CACHE_TIME = 60000; // 1 minuto

// Caché para sesiones compartidas
let sessionsCache = {
  data: null,
  timestamp: 0
};

// Función para manejar errores y logging consistente
const handleApiError = (functionName, error) => {
  console.error(`Error en ${functionName}:`, error);
  
  // Proporcionar un mensaje de error más informativo basado en el tipo de error
  if (error.response) {
    // Error con respuesta del servidor
    const statusCode = error.response.status;
    const errorMessage = error.response.data?.msg || error.response.data?.message || 'Error desconocido';
    
    if (statusCode === 401) {
      console.warn(`${functionName}: No autorizado - sesión expirada o credenciales inválidas`);
    } else if (statusCode === 403) {
      console.warn(`${functionName}: Acceso prohibido - no tienes permisos para esta operación`);
    } else if (statusCode === 404) {
      console.warn(`${functionName}: Recurso no encontrado`);
    }
    
    throw {
      ...error,
      userMessage: errorMessage,
      statusCode
    };
  } else if (error.request) {
    // Error sin respuesta del servidor (problema de conectividad)
    console.warn(`${functionName}: Sin respuesta del servidor - posible problema de conectividad`);
    throw {
      ...error,
      userMessage: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
    };
  } else {
    // Error al configurar la solicitud
    throw {
      ...error,
      userMessage: 'Error al procesar la solicitud: ' + error.message
    };
  }
};

export const fetchSharedSessions = async (forceRefresh = false) => {
  try {
    // Si tenemos datos en caché y no ha expirado, usarlos
    const now = Date.now();
    if (!forceRefresh && sessionsCache.data && (now - sessionsCache.timestamp < CACHE_TIME)) {
      console.log('Usando sesiones en caché');
      return sessionsCache.data;
    }
    
    console.log('Obteniendo sesiones compartidas del servidor');
    const response = await api.get('/api/shared-sessions');
    
    // Guardar en caché
    sessionsCache = {
      data: response.data,
      timestamp: now
    };
    
    return response.data;
  } catch (error) {
    return handleApiError('fetchSharedSessions', error);
  }
};

export const invalidateSessionsCache = () => {
  console.log('Invalidando caché de sesiones compartidas');
  sessionsCache = {
    data: null,
    timestamp: 0
  };
};

export const fetchPendingInvitations = async () => {
  try {
    const response = await api.get('/api/shared-sessions/invitations/pending');
    return response.data;
  } catch (error) {
    return handleApiError('fetchPendingInvitations', error);
  }
};

export const respondToInvitation = async (sessionId, response) => {
  try {
    const responseData = await api.post(`/api/shared-sessions/${sessionId}/respond`, { response });
    // Invalidar caché después de responder a una invitación
    invalidateSessionsCache();
    return responseData.data;
  } catch (error) {
    return handleApiError('respondToInvitation', error);
  }
};

export const getSessionDetails = async (sessionId) => {
  try {
    console.log(`Obteniendo detalles de la sesión: ${sessionId}`);
    const response = await api.get(`/api/shared-sessions/${sessionId}`);
    console.log('Detalles de sesión obtenidos:', response.data);
    return response.data;
  } catch (error) {
    return handleApiError('getSessionDetails', error);
  }
};

export const createSession = async (sessionData) => {
  try {
    console.log('Creando nueva sesión compartida');
    const response = await api.post('/api/shared-sessions', sessionData);
    console.log('Sesión creada:', response.data);
    // Invalidar caché después de crear una sesión
    invalidateSessionsCache();
    return response.data;
  } catch (error) {
    return handleApiError('createSession', error);
  }
};

export const updateSession = async (sessionId, sessionData) => {
  try {
    console.log(`Actualizando sesión: ${sessionId}`);
    const response = await api.put(`/api/shared-sessions/${sessionId}`, sessionData);
    console.log('Sesión actualizada:', response.data);
    // Invalidar caché después de actualizar una sesión
    invalidateSessionsCache();
    return response.data;
  } catch (error) {
    return handleApiError('updateSession', error);
  }
};

export const deleteSession = async (sessionId) => {
  try {
    console.log(`Eliminando sesión: ${sessionId}`);
    const response = await api.delete(`/api/shared-sessions/${sessionId}`);
    // Invalidar caché después de eliminar una sesión
    invalidateSessionsCache();
    return response.data;
  } catch (error) {
    return handleApiError('deleteSession', error);
  }
};

export const removeParticipant = async (sessionId, participantId) => {
  try {
    console.log(`Eliminando participante ${participantId} de la sesión ${sessionId}`);
    const response = await api.delete(`/api/shared-sessions/${sessionId}/participants/${participantId}`);
    // Invalidar caché después de modificar participantes
    invalidateSessionsCache();
    return response.data;
  } catch (error) {
    return handleApiError('removeParticipant', error);
  }
};

export const addExpenseToSession = async (sessionId, expenseData) => {
  try {
    console.log(`Añadiendo gasto a la sesión ${sessionId}`, expenseData);
    // Corrección de la ruta para que coincida con la API del servidor
    const response = await api.post(`/api/shared-sessions/${sessionId}/expenses`, expenseData);
    console.log('Respuesta al añadir gasto:', response.data);
    return response.data;
  } catch (error) {
    return handleApiError('addExpenseToSession', error);
  }
};

export const updateSessionExpense = async (sessionId, expenseId, expenseData) => {
  try {
    console.log(`Actualizando gasto ${expenseId} en la sesión ${sessionId}`, expenseData);
    // Corrección de la ruta para que coincida con la API del servidor
    const response = await api.put(`/api/shared-sessions/${sessionId}/expenses/${expenseId}`, expenseData);
    console.log('Respuesta al actualizar gasto:', response.data);
    return response.data;
  } catch (error) {
    return handleApiError('updateSessionExpense', error);
  }
};

export const deleteSessionExpense = async (sessionId, expenseId) => {
  try {
    console.log(`Eliminando gasto ${expenseId} de la sesión ${sessionId}`);
    // Corrección de la ruta para que coincida con la API del servidor
    const response = await api.delete(`/api/shared-sessions/${sessionId}/expenses/${expenseId}`);
    console.log('Respuesta al eliminar gasto:', response.data);
    return response.data;
  } catch (error) {
    return handleApiError('deleteSessionExpense', error);
  }
};

export const generateSessionReport = async (sessionId) => {
  try {
    console.log(`Generando informe para la sesión ${sessionId}`);
    const response = await api.get(`/api/shared-sessions/${sessionId}/report`);
    return response.data;
  } catch (error) {
    return handleApiError('generateSessionReport', error);
  }
};

export const syncToPersonal = async (sessionId) => {
  try {
    console.log(`Sincronizando sesión ${sessionId} a gastos personales`);
    const response = await api.post(`/api/shared-sessions/${sessionId}/sync-to-personal`);
    return response.data;
  } catch (error) {
    return handleApiError('syncToPersonal', error);
  }
};

export const updateDistribution = async (sessionId, distribution) => {
  try {
    console.log(`Actualizando distribución para la sesión ${sessionId}`);
    const response = await api.put(`/api/shared-sessions/${sessionId}/update-distribution`, { distribution });
    return response.data;
  } catch (error) {
    return handleApiError('updateDistribution', error);
  }
};

export const getSessionAllocations = async (sessionId) => {
  try {
    console.log(`Obteniendo asignaciones para la sesión ${sessionId}`);
    const response = await api.get(`/api/shared-sessions/${sessionId}/allocations`);
    return response.data;
  } catch (error) {
    return handleApiError('getSessionAllocations', error);
  }
};

export const getUserAllocations = async () => {
  try {
    console.log('Obteniendo asignaciones del usuario actual');
    const response = await api.get('/api/shared-sessions/user/allocations');
    return response.data;
  } catch (error) {
    return handleApiError('getUserAllocations', error);
  }
};

export const updateAllocationStatus = async (allocationId, status) => {
  try {
    console.log(`Actualizando estado de asignación ${allocationId} a ${status}`);
    const response = await api.put(`/api/shared-sessions/allocations/${allocationId}`, { status });
    return response.data;
  } catch (error) {
    return handleApiError('updateAllocationStatus', error);
  }
};

export const listSessions = async (forceRefresh = false) => {
  // Alias para fetchSharedSessions para mantener compatibilidad
  return fetchSharedSessions(forceRefresh);
};

export const getUserByEmail = async (email) => {
  try {
    // Realizar la consulta al backend para obtener el usuario por email
    console.log(`Buscando usuario con email: ${email}`);
    const response = await api.get(`/api/users/by-email/${encodeURIComponent(email)}`);
    
    if (response.data && response.data.user) {
      // Verificar si existe nombre real, si no, buscar en otros campos
      const user = response.data.user;
      const result = { user: { ...user } };
      
      // Intentar construir un nombre de visualización más amigable
      if (!user.name || user.name === email || email.includes(user.name)) {
        // Si el nombre es igual al email o parte del email, usar nombre/apellido si existen
        if (user.name && user.last_name) {
          result.user.name = `${user.name} ${user.last_name}`.trim();
        } else if (user.name) {
          result.user.name = user.name;
        } else if (user.last_name) {
          result.user.name = user.last_name;
        } else if (user.nombre && user.apellidos) {
          // Para compatibilidad con datos antiguos
          result.user.name = `${user.nombre} ${user.apellidos}`.trim();
        } else if (user.nombre) {
          result.user.name = user.nombre;
        } else if (user.apellidos) {
          result.user.name = user.apellidos;
        } else if (user.username) {
          result.user.name = user.username;
        } else {
          // Si no hay otra opción, usar la parte local del email
          result.user.name = email.split('@')[0];
        }
      }
      
      console.log(`Usuario encontrado: ${result.user.name}`);
      return result;
    }
    
    // Si no se encuentra el usuario, crear uno básico con el email
    console.log(`No se encontró usuario con email: ${email}, creando uno básico`);
    return { 
      user: {
        email: email,
        name: email.split('@')[0]
      } 
    };
  } catch (error) {
    console.error('Error al buscar usuario por email:', error);
    // Devolver un objeto básico en caso de error
    return { 
      user: {
        email: email,
        name: email.split('@')[0]
      } 
    };
  }
};

export default {
  fetchSharedSessions,
  fetchPendingInvitations,
  respondToInvitation,
  getSessionDetails,
  createSession,
  updateSession,
  deleteSession,
  removeParticipant,
  addExpenseToSession,
  updateSessionExpense,
  deleteSessionExpense,
  generateSessionReport,
  syncToPersonal,
  updateDistribution,
  listSessions,
  getUserByEmail,
  invalidateSessionsCache,
  getSessionAllocations,
  getUserAllocations,
  updateAllocationStatus
}; 