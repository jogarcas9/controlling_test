import axios from 'axios';
import axiosRetry from 'axios-retry';

// En producción, usar la URL del backend desplegado
// En desarrollo, usar localhost:3001
const isProduction = process.env.NODE_ENV === 'production';
const API_URL = isProduction 
  ? 'https://controling-backend.vercel.app'
  : (process.env.REACT_APP_API_URL || 'http://localhost:3001');

console.log('API URL:', API_URL, 'Environment:', process.env.NODE_ENV);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // aumentamos el timeout a 30 segundos
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
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           (error.response?.status >= 500 && error.response?.status !== 501);
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

// Interceptor para añadir el token de autenticación
api.interceptors.request.use(
  config => {
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        if (token.match(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$/)) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          localStorage.removeItem('token');
        }
      }
      
      return config;
    } catch (error) {
      console.error('Error en interceptor de request:', error);
      return config;
    }
  },
  error => Promise.reject(error)
);

// Interceptor para manejar errores
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Limpiar datos de autenticación
      localStorage.clear();
      
      // Disparar evento de storage para actualizar el estado de autenticación
      window.dispatchEvent(new Event('storage'));
      
      // Redirigir al login
      window.location.href = '/login';
      return Promise.reject(new Error('Sesión expirada. Por favor, inicia sesión nuevamente.'));
    }
    
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('La solicitud está tardando demasiado. Por favor, inténtalo de nuevo.'));
    }
    
    if (!error.response) {
      return Promise.reject(new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.'));
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
    const response = await api.get('/api/health', { timeout: 5000 });
    return { ok: response.status === 200, data: response.data };
  } catch (error) {
    console.error('Error al verificar la salud del servidor:', error);
    return { ok: false, error: error.message };
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
  getMonthly: async () => {
    const response = await api.get('/api/personal-expenses/monthly');
    return response.data;
  },
  create: async (expense) => {
    const response = await api.post('/api/personal-expenses', expense);
    return response.data;
  },
  update: async (id, expense) => {
    const response = await api.put(`/api/personal-expenses/${id}`, expense);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/api/personal-expenses/${id}`);
    return response.data;
  }
};

export const incomeAPI = {
  getMonthly: async () => {
    const response = await api.get('/api/income/monthly');
    return response.data;
  },
  create: async (income) => {
    const response = await api.post('/api/income', income);
    return response.data;
  },
  update: async (id, income) => {
    const response = await api.put(`/api/income/${id}`, income);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/api/income/${id}`);
    return response.data;
  }
};

export default api; 