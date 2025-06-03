/**
 * Configuración global de la aplicación
 * Todas las URIs y variables de entorno se centralizan aquí
 */

const ENV = {
  // Entorno de la aplicación
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // URLs base
  PRODUCTION_URL: 'https://controling-backend.vercel.app',
  DEVELOPMENT_URL: 'http://localhost:3001',
  
  // Puertos
  CLIENT_PORT: 3000,
  SERVER_PORT: 3001,
  
  // Timeouts y reintentos
  API_TIMEOUT: 15000,
  API_RETRY_ATTEMPTS: 3,
  
  // Socket.IO
  SOCKET_PATH: '/socket.io',
  
  // Prefijos de rutas
  API_PREFIX: '/api',
  AUTH_PREFIX: '/auth',
  PERSONAL_EXPENSES_PREFIX: '/personal-expenses',
  SHARED_SESSIONS_PREFIX: '/shared-sessions',
  INCOME_PREFIX: '/income',
  REPORTS_PREFIX: '/reports',
};

// Construir la URL base según el entorno
ENV.BASE_URL = ENV.NODE_ENV === 'production' ? ENV.PRODUCTION_URL : ENV.DEVELOPMENT_URL;
ENV.API_URL = `${ENV.BASE_URL}${ENV.API_PREFIX}`;

// Construir las rutas completas
ENV.ROUTES = {
  API: {
    BASE: ENV.API_URL,
    HEALTH: `${ENV.API_URL}/health`,
  },
  
  AUTH: {
    BASE: `${ENV.API_URL}${ENV.AUTH_PREFIX}`,
    LOGIN: `${ENV.API_URL}${ENV.AUTH_PREFIX}/login`,
    REGISTER: `${ENV.API_URL}${ENV.AUTH_PREFIX}/register`,
    VERIFY: `${ENV.API_URL}${ENV.AUTH_PREFIX}/verify`,
    USER: `${ENV.API_URL}${ENV.AUTH_PREFIX}/user`,
  },
  
  PERSONAL_EXPENSES: {
    BASE: `${ENV.API_URL}${ENV.PERSONAL_EXPENSES_PREFIX}`,
    MONTHLY: `${ENV.API_URL}${ENV.PERSONAL_EXPENSES_PREFIX}/monthly`,
    FILTERED: (month, year) => `${ENV.API_URL}${ENV.PERSONAL_EXPENSES_PREFIX}?month=${month}&year=${year}`,
    DETAIL: (id) => `${ENV.API_URL}${ENV.PERSONAL_EXPENSES_PREFIX}/${id}`,
    GENERATE_SHARED: `${ENV.API_URL}${ENV.PERSONAL_EXPENSES_PREFIX}/generate-shared-month`,
  },
  
  SHARED_SESSIONS: {
    BASE: `${ENV.API_URL}${ENV.SHARED_SESSIONS_PREFIX}`,
    DETAIL: (id) => `${ENV.API_URL}${ENV.SHARED_SESSIONS_PREFIX}/${id}`,
    EXPENSES: (id) => `${ENV.API_URL}${ENV.SHARED_SESSIONS_PREFIX}/${id}/expenses`,
    EXPENSE: (sessionId, expenseId) => `${ENV.API_URL}${ENV.SHARED_SESSIONS_PREFIX}/${sessionId}/expenses/${expenseId}`,
    SYNC_TO_PERSONAL: (id) => `${ENV.API_URL}${ENV.SHARED_SESSIONS_PREFIX}/${id}/sync-to-personal`,
  },
  
  INCOME: {
    BASE: `${ENV.API_URL}${ENV.INCOME_PREFIX}`,
    MONTHLY: `${ENV.API_URL}${ENV.INCOME_PREFIX}/monthly`,
    DETAIL: (id) => `${ENV.API_URL}${ENV.INCOME_PREFIX}/${id}`,
  },
  
  REPORTS: {
    BASE: `${ENV.API_URL}${ENV.REPORTS_PREFIX}`,
    SUMMARY: `${ENV.API_URL}${ENV.REPORTS_PREFIX}/summary`,
    MONTHLY: `${ENV.API_URL}${ENV.REPORTS_PREFIX}/monthly`,
    YEARLY: `${ENV.API_URL}${ENV.REPORTS_PREFIX}/yearly`,
  },
};

export default ENV; 