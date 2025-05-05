import api from '../utils/api';

export const fetchExpenses = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await api.get(`/api/expenses?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('Error en fetchExpenses:', error);
    throw error;
  }
};

export const createExpense = async (expenseData) => {
  try {
    const response = await api.post('/api/expenses', expenseData);
    return response.data;
  } catch (error) {
    console.error('Error en createExpense:', error);
    throw error;
  }
};

export const updateExpense = async (id, expenseData) => {
  try {
    const response = await api.put(`/api/expenses/${id}`, expenseData);
    return response.data;
  } catch (error) {
    console.error('Error en updateExpense:', error);
    throw error;
  }
};

export const deleteExpense = async (id) => {
  try {
    const response = await api.delete(`/api/expenses/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en deleteExpense:', error);
    throw error;
  }
};

export const getExpenseStatistics = async (period) => {
  try {
    const response = await api.get(`/api/expenses/statistics?period=${period}`);
    return response.data;
  } catch (error) {
    console.error('Error en getExpenseStatistics:', error);
    throw error;
  }
};

export const getPersonalExpenses = async () => {
  try {
    const response = await api.get('/api/personal-expenses/monthly');
    return response.data;
  } catch (error) {
    console.error('Error en getPersonalExpenses:', error);
    throw error;
  }
}; 