import api from '../utils/api';
import axios from 'axios';

// Configuración de Axios
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir el token a todas las solicitudes
API.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
API.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // El servidor respondió con un código de estado fuera del rango 2xx
      console.error('Error de respuesta:', error.response);
      if (error.response.status === 401) {
        localStorage.removeItem('token');
      }
    } else if (error.request) {
      // La petición fue hecha pero no se recibió respuesta
      console.error('Error de petición:', error.request);
    } else {
      // Algo sucedió en la configuración de la petición que causó el error
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Tiempo de caché para las sesiones (en ms)
const CACHE_TIME = 1000 * 60 * 60; // 1 hora

// Caché para sesiones compartidas
let sessionsCache = {
  data: null,
  timestamp: 0
};

// Caché para información de usuarios por email
let userEmailCache = {};

// Constantes para el caché
const pendingRequests = {};

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
    
    throw new Error(JSON.stringify({
      originalError: error,
      userMessage: errorMessage,
      statusCode
    }));
  } else if (error.request) {
    // Error sin respuesta del servidor (problema de conectividad)
    console.warn(`${functionName}: Sin respuesta del servidor - posible problema de conectividad`);
    throw new Error(JSON.stringify({
      originalError: error,
      userMessage: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
    }));
  } else {
    // Error al configurar la solicitud
    throw new Error(JSON.stringify({
      originalError: error,
      userMessage: 'Error al procesar la solicitud: ' + error.message
    }));
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

export const invalidateUserCache = (email = null) => {
  if (email) {
    // Invalidar un usuario específico
    const normalizedEmail = email.toLowerCase().trim();
    if (userEmailCache[normalizedEmail]) {
      console.log(`Invalidando caché para usuario: ${email}`);
      delete userEmailCache[normalizedEmail];
    }
  } else {
    // Invalidar todos los usuarios
    console.log('Invalidando caché de todos los usuarios');
    userEmailCache = {};
  }
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
    const responseData = await api.post(`/api/shared-sessions/${sessionId}/respond`, { accept: response === 'accept' });
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
    
    // La respuesta del servidor puede venir directamente como la sesión
    if (response.data) {
      const sessionData = response.data.session || response.data;
      // Si hay advertencias, las agregamos a la sesión
      if (response.data.warnings) {
        sessionData.warnings = response.data.warnings;
      }
      return sessionData;
    } else {
      throw new Error('La respuesta del servidor no tiene el formato esperado');
    }
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
    // Validaciones básicas
    if (!expenseData.name?.trim()) {
      throw new Error('El nombre del gasto es requerido y no puede estar vacío');
    }

    // Procesar el monto una sola vez
    const amount = typeof expenseData.amount === 'number' 
      ? Number(expenseData.amount.toFixed(2))
      : Number(expenseData.amount.replace(',', '.').trim());

    if (isNaN(amount) || amount <= 0) {
      throw new Error('El monto debe ser un número positivo');
    }

    // Formatear los datos del gasto de manera eficiente
    const formattedExpense = {
      name: expenseData.name.trim(),
      description: expenseData.description?.trim() || '',
      amount,
      date: new Date(expenseData.date).toISOString(),
      category: expenseData.category?.trim() || 'Otros',
      paidBy: expenseData.paidBy,
      isRecurring: Boolean(expenseData.isRecurring),
      isPeriodic: Boolean(expenseData.isPeriodic),
      chargeDay: expenseData.isRecurring ? parseInt(expenseData.chargeDay) : undefined,
      periodStartDate: expenseData.isPeriodic ? new Date(expenseData.periodStartDate).toISOString() : null,
      periodEndDate: expenseData.isPeriodic ? new Date(expenseData.periodEndDate).toISOString() : null
    };

    // Enviar la petición al servidor
    const response = await api.post(`/api/shared-sessions/${sessionId}/expenses`, {
      expense: formattedExpense
    });

    return response.data;
  } catch (error) {
    console.error('Error en addExpenseToSession:', error.message);
    throw error;
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
    // Corregir la ruta para que coincida con la API del servidor
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

export const updateDistribution = async (sessionId, distribution, currentMonth, currentYear) => {
  try {
    console.log(`Actualizando distribución para la sesión ${sessionId}`);
    
    // Validar datos antes de enviar
    if (!sessionId) throw new Error('ID de sesión no proporcionado');
    if (!distribution || !Array.isArray(distribution)) throw new Error('Distribución inválida');
    if (currentMonth === undefined || currentMonth === null) throw new Error('Mes no especificado');
    if (currentYear === undefined || currentYear === null) throw new Error('Año no especificado');
    
    // Validar porcentajes
    const totalPercentage = distribution.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(`La suma de porcentajes debe ser 100%. Actual: ${totalPercentage}%`);
    }
    
    // Asegurar que todos los campos necesarios estén presentes
    const validatedDistribution = distribution.map(item => ({
      userId: item.userId,
      name: item.name || '',
      percentage: Number(item.percentage) || 0
    }));
    
    console.log('Enviando datos validados:', {
      distribution: validatedDistribution,
      currentMonth,
      currentYear
    });

    const response = await api.put(`/api/shared-sessions/${sessionId}/update-distribution`, {
      distribution: validatedDistribution,
      currentMonth,
      currentYear
    });

    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Error desconocido al actualizar la distribución');
    }

    return response.data;
  } catch (error) {
    console.error('Error en updateDistribution:', error);
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
  if (!email) return null;
  
  try {
    // Normalizar email para usar como clave de caché
    const normalizedEmail = email.toLowerCase().trim();
    
    // Comprobar si tenemos datos en caché y si son válidos
    const now = Date.now();
    const cachedUser = userEmailCache[normalizedEmail];
    
    if (cachedUser && (now - cachedUser.timestamp < CACHE_TIME)) {
      console.log(`Usando datos en caché para ${normalizedEmail}`);
      return cachedUser.data;
    }

    // Si ya hay una petición pendiente para este email, esperar su resultado
    if (pendingRequests[normalizedEmail]) {
      console.log(`Esperando petición pendiente para ${normalizedEmail}`);
      return pendingRequests[normalizedEmail];
    }

    // Crear una nueva promesa para esta petición
    pendingRequests[normalizedEmail] = (async () => {
      try {
        console.log(`Realizando petición para ${normalizedEmail}`);
        const result = await api.get(`/api/users/by-email/${encodeURIComponent(normalizedEmail)}`);
        
        const userData = result?.data?.user ? result.data : {
          user: {
            email: normalizedEmail,
            name: normalizedEmail.split('@')[0]
          }
        };

        // Guardar en caché
        userEmailCache[normalizedEmail] = {
          data: userData,
          timestamp: now
        };

        return userData;
      } catch (error) {
        console.warn(`Error al obtener datos para ${normalizedEmail}:`, error);
        // Crear datos de fallback
        const fallbackData = {
          user: {
            email: normalizedEmail,
            name: normalizedEmail.split('@')[0]
          }
        };
        
        // Guardar fallback en caché
        userEmailCache[normalizedEmail] = {
          data: fallbackData,
          timestamp: now
        };
        
        return fallbackData;
      } finally {
        // Limpiar la petición pendiente
        delete pendingRequests[normalizedEmail];
      }
    })();

    return pendingRequests[normalizedEmail];
  } catch (error) {
    console.warn(`Error general en getUserByEmail para ${email}:`, error);
    return {
      user: {
        email: email,
        name: email.split('@')[0]
      }
    };
  }
};

export const getExpensesByMonth = async (sessionId, year, month, retryCount = 0) => {
  try {
    console.log(`Solicitando gastos para sesión ${sessionId}, año=${year}, mes=${month}`);
    
    // Validar entradas para evitar problemas
    if (!sessionId) {
      throw new Error('ID de sesión requerido');
    }
    
    if (year === undefined || month === undefined) {
      throw new Error('Año y mes son requeridos');
    }
    
    // Verificar si hay token en localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No hay token JWT, el usuario debe iniciar sesión');
      throw new Error(JSON.stringify({
        response: { status: 401 },
        message: 'No hay token de autenticación'
      }));
    }
    
    // Asegurar que son números
    const yearNum = parseInt(year);
    let monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum)) {
      throw new Error('Año y mes deben ser números válidos');
    }
    
    // Validar que el mes esté en rango 0-11
    if (monthNum < 0 || monthNum > 11) {
      console.warn(`Mes fuera de rango (${monthNum}), ajustando al rango válido 0-11`);
      monthNum = Math.max(0, Math.min(11, monthNum));
    }
    
    console.log(`Enviando petición: año=${yearNum}, mes=${monthNum} (${getMonthName(monthNum)})`);
    
    // Realizar la petición usando month como 0-11
    const response = await api.get(`/api/shared-sessions/${sessionId}/expenses-by-month?year=${yearNum}&month=${monthNum}`);
    
    // Verificar y procesar la respuesta para asegurarnos de que las fechas son objetos Date válidos
    if (Array.isArray(response.data)) {
      return response.data.map(expense => {
        // Asegurar que la fecha es un objeto Date válido
        if (expense.date) {
          try {
            const fecha = new Date(expense.date);
            // Verificar si es una fecha válida
            if (isNaN(fecha.getTime())) {
              console.warn(`Fecha inválida recibida para gasto ${expense._id}: ${expense.date}`);
              expense.date = new Date(); // Usar fecha actual como fallback
            } else {
              expense.date = fecha;
            }
          } catch (error) {
            console.error(`Error al procesar fecha de gasto ${expense._id}:`, error);
            expense.date = new Date(); // Usar fecha actual como fallback
          }
        } else {
          console.warn(`Gasto ${expense._id} sin fecha, usando fecha actual`);
          expense.date = new Date();
        }
        return expense;
      });
    }
    
    return response.data || [];
  } catch (error) {
    console.error('Error al obtener gastos por mes:', error);
    
    // Manejo específico para errores de autenticación
    if (error.response && error.response.status === 401) {
      console.error('Error de autenticación: Token inválido o expirado');
      localStorage.removeItem('token'); // Limpiar token inválido
      throw error; // Propagar el error para manejo en la UI
    }
    
    // Si es un error 500 y no hemos excedido los reintentos, intentar reparar y volver a intentar
    if (error.response && error.response.status === 500 && retryCount < 3) {
      console.log(`Reintentando obtener gastos (intento ${retryCount + 1} de 3)...`);
      
      // Esperar un tiempo antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Intentar reparar la estructura de datos primero
      try {
        console.log(`Intentando reparar la estructura de datos...`);
        
        // Primero intentar reparar la sesión
        try {
          await repairSessionStructure(sessionId);
          console.log('Reparación de sesión completada con éxito');
        } catch (repairError) {
          console.warn('Error al reparar sesión, continuando con fallback:', repairError);
        }
        
        // Obtener detalles de la sesión para forzar inicialización
        await getSessionDetails(sessionId);
      } catch (repairError) {
        console.error('Error al intentar reparar:', repairError);
      }
      
      // Reintentar la petición
      return getExpensesByMonth(sessionId, year, month, retryCount + 1);
    }
    
    // Si no es un caso para reintentar o se han agotado los reintentos, devolver array vacío
    if (retryCount >= 3) {
      console.warn('Se agotaron los reintentos, devolviendo array vacío');
      return [];
    }
    
    throw error;
  }
};

// Función auxiliar para obtener el nombre del mes
function getMonthName(monthIndex) {
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return monthNames[monthIndex] || `Mes ${monthIndex + 1}`;
}

export const repairSessionStructure = async (sessionId) => {
  try {
    console.log(`Solicitando reparación para la sesión ${sessionId}...`);
    
    // Verificar si hay token en localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No hay token JWT, el usuario debe iniciar sesión');
      throw new Error(JSON.stringify({
        response: { status: 401 },
        message: 'No hay token de autenticación'
      }));
    }
    
    const response = await api.post(`/api/shared-sessions/${sessionId}/repair`);
    return response.data;
  } catch (error) {
    console.error('Error al reparar la sesión:', error);
    throw error;
  }
};

export const updateParticipants = async (sessionId, participants) => {
  try {
    console.log(`Actualizando participantes de la sesión ${sessionId}`);
    const response = await api.put(`/api/shared-sessions/${sessionId}/participants`, { participants });
    // Invalidar caché después de modificar participantes
    invalidateSessionsCache();
    return response.data;
  } catch (error) {
    return handleApiError('updateParticipants', error);
  }
};
