/**
 * Configuración centralizada de endpoints de la API
 * Este archivo define todas las rutas de la API utilizadas en la aplicación
 */

// URL base de la API
export const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Endpoints de autenticación
export const AUTH_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  VERIFY: '/api/auth/verify',
  USER: '/api/auth/user',
  RESET_PASSWORD: '/api/auth/reset-password',
  LOGOUT: '/api/auth/logout'
};

// Endpoints de gastos personales
export const PERSONAL_EXPENSES_ENDPOINTS = {
  MONTHLY: '/api/personal-expenses/monthly',
  FILTERED: (month, year) => `/api/personal-expenses?month=${month}&year=${year}`,
  GENERATE_SHARED: '/api/personal-expenses/generate-shared-month',
  CREATE: '/api/personal-expenses',
  UPDATE: (id) => `/api/personal-expenses/${id}`,
  DELETE: (id) => `/api/personal-expenses/${id}`
};

// Endpoints de ingresos
export const INCOME_ENDPOINTS = {
  MONTHLY: '/api/income/monthly',
  CREATE: '/api/income',
  UPDATE: (id) => `/api/income/${id}`,
  DELETE: (id) => `/api/income/${id}`
};

// Endpoints de sesiones compartidas
export const SHARED_SESSIONS_ENDPOINTS = {
  ALL: '/api/shared-sessions',
  CREATE: '/api/shared-sessions',
  UPDATE: (id) => `/api/shared-sessions/${id}`,
  DELETE: (id) => `/api/shared-sessions/${id}`
};

// Endpoints de reportes
export const REPORTS_ENDPOINTS = {
  SUMMARY: '/api/reports/summary',
  MONTHLY: '/api/reports/monthly',
  YEARLY: '/api/reports/yearly'
};

// Endpoints de salud del servidor
export const HEALTH_ENDPOINTS = {
  CHECK: '/api/health'
};

// Crear una variable para la configuración antes de exportarla
const config = {
  API_BASE_URL,
  AUTH: AUTH_ENDPOINTS,
  PERSONAL_EXPENSES: PERSONAL_EXPENSES_ENDPOINTS,
  INCOME: INCOME_ENDPOINTS,
  SHARED_SESSIONS: SHARED_SESSIONS_ENDPOINTS,
  REPORTS: REPORTS_ENDPOINTS,
  HEALTH: HEALTH_ENDPOINTS
};

export default config; 