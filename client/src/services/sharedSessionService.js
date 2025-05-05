import api from '../utils/api';

export const fetchSharedSessions = async () => {
  try {
    const response = await api.get('/api/shared-sessions');
    return response.data;
  } catch (error) {
    console.error('Error en fetchSharedSessions:', error);
    throw error;
  }
};

export const getSessionDetails = async (sessionId) => {
  try {
    const response = await api.get(`/api/shared-sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error en getSessionDetails:', error);
    throw error;
  }
};

export const createSession = async (sessionData) => {
  try {
    const response = await api.post('/api/shared-sessions', sessionData);
    return response.data;
  } catch (error) {
    console.error('Error en createSession:', error);
    throw error;
  }
};

export const updateSession = async (sessionId, sessionData) => {
  try {
    const response = await api.put(`/api/shared-sessions/${sessionId}`, sessionData);
    return response.data;
  } catch (error) {
    console.error('Error en updateSession:', error);
    throw error;
  }
};

export const deleteSession = async (sessionId) => {
  try {
    const response = await api.delete(`/api/shared-sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error en deleteSession:', error);
    throw error;
  }
};

export const addParticipant = async (sessionId, participantData) => {
  try {
    const response = await api.post(`/api/shared-sessions/${sessionId}/participants`, participantData);
    return response.data;
  } catch (error) {
    console.error('Error en addParticipant:', error);
    throw error;
  }
};

export const removeParticipant = async (sessionId, participantId) => {
  try {
    const response = await api.delete(`/api/shared-sessions/${sessionId}/participants/${participantId}`);
    return response.data;
  } catch (error) {
    console.error('Error en removeParticipant:', error);
    throw error;
  }
};

export const addExpenseToSession = async (sessionId, expenseData) => {
  try {
    const response = await api.post(`/api/shared-sessions/${sessionId}/expenses`, expenseData);
    return response.data;
  } catch (error) {
    console.error('Error en addExpenseToSession:', error);
    throw error;
  }
};

export const updateSessionExpense = async (sessionId, expenseId, expenseData) => {
  try {
    const response = await api.put(`/api/shared-sessions/${sessionId}/expenses/${expenseId}`, expenseData);
    return response.data;
  } catch (error) {
    console.error('Error en updateSessionExpense:', error);
    throw error;
  }
};

export const deleteSessionExpense = async (sessionId, expenseId) => {
  try {
    const response = await api.delete(`/api/shared-sessions/${sessionId}/expenses/${expenseId}`);
    return response.data;
  } catch (error) {
    console.error('Error en deleteSessionExpense:', error);
    throw error;
  }
};

export const generateSessionReport = async (sessionId) => {
  try {
    const response = await api.get(`/api/shared-sessions/${sessionId}/report`);
    return response.data;
  } catch (error) {
    console.error('Error en generateSessionReport:', error);
    throw error;
  }
};

export const syncToPersonal = async (sessionId) => {
  try {
    const response = await api.post(`/api/shared-sessions/${sessionId}/sync`);
    return response.data;
  } catch (error) {
    console.error('Error en syncToPersonal:', error);
    throw error;
  }
};

export const updateDistribution = async (sessionId, distribution) => {
  try {
    const response = await api.put(`/api/shared-sessions/${sessionId}/distribution`, { distribution });
    return response.data;
  } catch (error) {
    console.error('Error en updateDistribution:', error);
    throw error;
  }
}; 