/**
 * Configuración centralizada de endpoints de la API
 * Este archivo define todas las rutas de la API utilizadas en la aplicación
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const config = {
  API: {
    BASE_URL: API_BASE_URL,
    TIMEOUT: 15000,
    RETRY_ATTEMPTS: 3
  },
  
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    VERIFY: '/api/auth/verify',
    USER: '/api/auth/user'
  },
  
  EXPENSES: {
    MONTHLY: '/api/personal-expenses/monthly',
    BASE: '/api/personal-expenses',
    FILTERED: (month, year) => `/api/personal-expenses?month=${month}&year=${year}`,
    DETAIL: (id) => `/api/personal-expenses/${id}`
  },
  
  INCOME: {
    MONTHLY: '/api/income/monthly',
    BASE: '/api/income',
    DETAIL: (id) => `/api/income/${id}`
  },
  
  SHARED: {
    BASE: '/api/shared-sessions',
    DETAIL: (id) => `/api/shared-sessions/${id}`
  },
  
  REPORTS: {
    SUMMARY: '/api/reports/summary',
    MONTHLY: '/api/reports/monthly',
    YEARLY: '/api/reports/yearly'
  },
  
  HEALTH: {
    CHECK: '/api/health'
  }
};

export default config; 