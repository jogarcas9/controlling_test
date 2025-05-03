import api from '../utils/api';

export const fetchExpenses = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters).toString();
    const response = await api.get(`/expenses?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('Error en fetchExpenses:', error);
    throw error;
  }
};

export const createExpense = async (expenseData) => {
  try {
    const response = await api.post('/expenses', expenseData);
    return response.data;
  } catch (error) {
    console.error('Error en createExpense:', error);
    throw error;
  }
};

export const updateExpense = async (id, expenseData) => {
  try {
    const response = await api.put(`/expenses/${id}`, expenseData);
    return response.data;
  } catch (error) {
    console.error('Error en updateExpense:', error);
    throw error;
  }
};

export const deleteExpense = async (id) => {
  try {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error en deleteExpense:', error);
    throw error;
  }
};

export const getExpenseStatistics = async (period) => {
  try {
    const response = await api.get(`/expenses/statistics?period=${period}`);
    return response.data;
  } catch (error) {
    console.error('Error en getExpenseStatistics:', error);
    throw error;
  }
};

export const getPersonalExpenses = async () => {
  try {
    const response = await api.get('/personal-expenses/monthly');
    return response.data;
  } catch (error) {
    console.error('Error en getPersonalExpenses:', error);
    throw error;
  }
}; 