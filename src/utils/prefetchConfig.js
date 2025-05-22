import config from './config';
import { optimizedRequests } from './api';

// Rutas comunes que se prefetchearán
const commonRoutes = [
  config.EXPENSES.MONTHLY,
  config.INCOME.MONTHLY,
  config.REPORTS.SUMMARY
];

// Función para iniciar el prefetch de datos comunes
export const initializePrefetch = async () => {
  try {
    await optimizedRequests.prefetch(commonRoutes);
    console.log('Prefetch de datos comunes completado');
  } catch (error) {
    console.warn('Error en prefetch de datos comunes:', error);
  }
};

// Función para prefetchear datos específicos de una ruta
export const prefetchRouteData = async (route) => {
  try {
    await optimizedRequests.prefetch([route]);
    console.log(`Prefetch completado para: ${route}`);
  } catch (error) {
    console.warn(`Error en prefetch para ${route}:`, error);
  }
};

// Exportar rutas comunes para uso en otros componentes
export const PREFETCH_ROUTES = commonRoutes; 