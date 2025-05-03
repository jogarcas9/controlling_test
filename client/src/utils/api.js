import axios from 'axios';
import axiosRetry from 'axios-retry';

const API_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Configuración de reintentos
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500;
  }
});

// Función para convertir rutas antiguas
const convertLegacyRoutes = (config) => {
  // Ya no necesitamos convertir las rutas /invite porque ahora existen
  // Simplemente dejamos pasar la solicitud sin modificarla
  return config;
};

// Aplicar el interceptor tanto a axios global como a nuestra instancia api
// Interceptor para axios global
axios.interceptors.request.use(
  config => convertLegacyRoutes(config),
  error => Promise.reject(error)
);

// Interceptor para nuestra instancia personalizada
api.interceptors.request.use(
  config => convertLegacyRoutes(config),
  error => Promise.reject(error)
);

// Interceptor para añadir el token a todas las peticiones
api.interceptors.request.use(
  config => {
    try {
      const token = localStorage.getItem('token');
      console.log('Interceptor - Token existente:', token ? 'Sí' : 'No');
      
      if (token) {
        // Validar formato del token (JWT básico)
        if (!token.match(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$/)) {
          console.warn('Interceptor - Formato de token inválido. Eliminando token...');
          localStorage.removeItem('token');
        } else {
          console.log('Interceptor - Añadiendo token al header Authorization');
          // Asegurarse de que el token se envía en el formato correcto
          config.headers.Authorization = `Bearer ${token}`;
        }
      } else {
        console.warn('Interceptor - No hay token disponible para:', config.url);
      }
      
      return config;
    } catch (error) {
      console.error('Interceptor - Error al procesar request:', error);
      return config;
    }
  },
  error => {
    console.error('Interceptor - Error en request:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  response => response,
  error => {
    // Si el error es de autenticación (401), redirigir al login
    if (error.response?.status === 401) {
      // Limpiar datos de autenticación
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      
      // Disparar evento de storage para actualizar el estado de autenticación
      window.dispatchEvent(new Event('storage'));
      
      // Redirigir al login
      window.location.href = '/login';
      return Promise.reject(new Error('Sesión expirada. Por favor, inicia sesión nuevamente.'));
    }
    
    // Si el error es de timeout
    if (error.code === 'ECONNABORTED') {
      error.message = 'La solicitud está tardando demasiado. Por favor, inténtalo de nuevo.';
    }
    
    // Si es un error de red
    if (error.message === 'Network Error') {
      error.message = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
    }

    // Log del error en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      if (error.response) {
        console.error('Error en la respuesta:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('No se recibió respuesta del servidor:', error.request);
      } else {
        console.error('Error en la configuración de la solicitud:', error.message);
      }
    }
    
    return Promise.reject(error);
  }
);

// Cache simple para respuestas
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Función para obtener datos con caché
export const fetchWithCache = async (url, options = {}) => {
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await api.get(url, options);
    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw error;
    }
    throw new Error('Error al conectar con el servidor');
  }
};

// Función para verificar la salud del servidor
export const checkServerHealth = async () => {
  try {
    const response = await api.get('/api/health');
    return response.status === 200;
  } catch (error) {
    console.error('Error al verificar la salud del servidor:', error);
    return false;
  }
};

// Función para manejar errores de red
export const handleNetworkError = (error) => {
  if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
    return 'Error de conexión al servidor. Por favor, verifica tu conexión a internet.';
  }
  return error.message || 'Error desconocido';
};

// Servicios de API
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },
  verifyToken: async () => {
    const response = await api.get('/api/auth/verify');
    return response.data;
  }
};

export const categoriesAPI = {
  getAll: async () => {
    const response = await api.get('/api/categories');
    return response.data;
  },
  create: async (category) => {
    const response = await api.post('/api/categories', category);
    return response.data;
  },
  update: async (id, category) => {
    const response = await api.put(`/api/categories/${id}`, category);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/api/categories/${id}`);
    return response.data;
  }
};

export const expensesAPI = {
  getAll: async (filters) => {
    const response = await api.get('/api/expenses', { params: filters });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/api/expenses/${id}`);
    return response.data;
  },
  create: async (expense) => {
    const response = await api.post('/api/expenses', expense);
    return response.data;
  },
  update: async (id, expense) => {
    const response = await api.put(`/api/expenses/${id}`, expense);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/api/expenses/${id}`);
    return response.data;
  }
};

export default api; 