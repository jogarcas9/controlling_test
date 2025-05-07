/**
 * Configuración centralizada de endpoints de la API
 * Este archivo define todas las rutas de la API utilizadas en la aplicación
 */

const API_BASE_URL = '/api';

const config = {
  API: {
    BASE_URL: API_BASE_URL,
    TIMEOUT: 15000,
    RETRY_ATTEMPTS: 3
  },
  
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    VERIFY: '/api/auth/verify',
    USER: `${API_BASE_URL}/auth/user`
  },
  
  EXPENSES: {
    MONTHLY: '/api/personal-expenses/monthly',
    BASE: '/api/personal-expenses',
    FILTERED: (month, year) => `/api/personal-expenses?month=${month}&year=${year}`,
    DETAIL: (id) => `/api/personal-expenses/${id}`
  },
  
  PERSONAL_EXPENSES: {
    BASE: `${API_BASE_URL}/personal-expenses`,
    MONTHLY: `${API_BASE_URL}/personal-expenses/monthly`,
    FILTERED: (month, year) => `${API_BASE_URL}/personal-expenses?month=${month}&year=${year}`,
    GENERATE_SHARED: `${API_BASE_URL}/personal-expenses/generate-shared-month`,
    CREATE: '/api/personal-expenses',
    UPDATE: (id) => `/api/personal-expenses/${id}`,
    DELETE: (id) => `/api/personal-expenses/${id}`,
    SHARED_SUMMARY: '/api/personal-expenses/generate-shared-month'
  },
  
  INCOME: {
    MONTHLY: '/api/income/monthly',
    BASE: '/api/income',
    DETAIL: (id) => `/api/income/${id}`
  },
  
  SHARED: {
    BASE: '/api/shared-sessions',
    DETAIL: (id) => `/api/shared-sessions/${id}`,
    EXPENSES: (id) => `/api/shared-sessions/${id}/expenses`,
    EXPENSE: (sessionId, expenseId) => `/api/shared-sessions/${sessionId}/expenses/${expenseId}`,
    SYNC_TO_PERSONAL: (id) => `/api/shared-sessions/${id}/sync-to-personal`
  },
  
  REPORTS: {
    SUMMARY: '/api/reports/summary',
    MONTHLY: '/api/reports/monthly',
    YEARLY: '/api/reports/yearly'
  },
  
  HEALTH: `${API_BASE_URL}/health`
};

export default config; 