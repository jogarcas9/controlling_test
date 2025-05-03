import api from '../utils/api';
import config from '../utils/config';

/**
 * Servicio para gestionar gastos personales
 */

/**
 * Obtener gastos personales del mes actual
 * @returns {Promise} - Lista de gastos personales del mes actual
 */
export const getMonthlyExpenses = async () => {
  try {
    console.log('Obteniendo gastos mensuales actuales');
    const response = await api.get(config.PERSONAL_EXPENSES.MONTHLY);
    return response.data;
  } catch (error) {
    console.error('Error al obtener gastos mensuales:', error);
    throw error;
  }
};

/**
 * Obtener gastos personales filtrados por mes y año
 * @param {number} month - Mes (1-12)
 * @param {number} year - Año
 * @returns {Promise} - Lista de gastos personales filtrados
 */
export const getFilteredExpenses = async (month, year) => {
  try {
    console.log(`Obteniendo gastos filtrados para ${month}/${year}`);
    const response = await api.get(config.PERSONAL_EXPENSES.FILTERED(month, year));
    return response.data;
  } catch (error) {
    console.error(`Error al obtener gastos para ${month}/${year}:`, error);
    throw error;
  }
};

/**
 * Generar resumen de gastos compartidos del mes actual
 * @returns {Promise} - Resumen de gastos compartidos
 */
export const generateSharedMonthSummary = async () => {
  try {
    console.log('Generando resumen de gastos compartidos');
    const response = await api.get(config.PERSONAL_EXPENSES.GENERATE_SHARED);
    return response.data;
  } catch (error) {
    console.error('Error al generar resumen de gastos compartidos:', error);
    throw error;
  }
};

/**
 * Crear un nuevo gasto personal
 * @param {Object} expenseData - Datos del gasto
 * @returns {Promise} - Gasto creado
 */
export const createPersonalExpense = async (expenseData) => {
  try {
    console.log('Creando gasto personal:', expenseData);
    const response = await api.post(config.PERSONAL_EXPENSES.CREATE, expenseData);
    return response.data;
  } catch (error) {
    console.error('Error al crear gasto personal:', error);
    throw error;
  }
};

/**
 * Actualizar un gasto personal existente
 * @param {string} id - ID del gasto
 * @param {Object} expenseData - Datos actualizados
 * @returns {Promise} - Gasto actualizado
 */
export const updatePersonalExpense = async (id, expenseData) => {
  try {
    console.log('Actualizando gasto personal:', id, expenseData);
    const response = await api.put(config.PERSONAL_EXPENSES.UPDATE(id), expenseData);
    return response.data;
  } catch (error) {
    console.error('Error al actualizar gasto personal:', error);
    throw error;
  }
};

/**
 * Eliminar un gasto personal
 * @param {string} id - ID del gasto
 * @returns {Promise} - Resultado de la eliminación
 */
export const deletePersonalExpense = async (id) => {
  try {
    console.log('Eliminando gasto personal:', id);
    const response = await api.delete(config.PERSONAL_EXPENSES.DELETE(id));
    return response.data;
  } catch (error) {
    console.error('Error al eliminar gasto personal:', error);
    throw error;
  }
}; 