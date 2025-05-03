import api from '../utils/api';
import config from '../utils/config';

/**
 * Servicio para gestión de reportes
 */

/**
 * Obtener reporte mensual
 * @param {number} month - Mes (1-12)
 * @param {number} year - Año
 * @returns {Promise} - Datos del reporte mensual
 */
export const fetchMonthlyReport = async (month, year) => {
  try {
    console.log(`Obteniendo reporte mensual para ${month}/${year}`);
    const response = await api.get(`${config.REPORTS.MONTHLY}-summary`, {
      params: { month, year }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener reporte mensual:', error);
    throw error;
  }
};

/**
 * Obtener reporte anual
 * @param {number} year - Año
 * @returns {Promise} - Datos del reporte anual
 */
export const fetchYearlyReport = async (year) => {
  try {
    console.log(`Obteniendo reporte anual para ${year}`);
    const response = await api.get(`${config.REPORTS.YEARLY}-summary`, {
      params: { year }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener reporte anual:', error);
    throw error;
  }
};

/**
 * Obtener resumen general
 * @returns {Promise} - Resumen general de finanzas
 */
export const fetchSummary = async () => {
  try {
    console.log('Obteniendo resumen general');
    const response = await api.get(config.REPORTS.SUMMARY);
    return response.data;
  } catch (error) {
    console.error('Error al obtener resumen general:', error);
    throw error;
  }
};

// Crear una variable para el servicio antes de exportarlo
const reportService = {
  fetchMonthlyReport,
  fetchYearlyReport,
  fetchSummary
};

export default reportService; 