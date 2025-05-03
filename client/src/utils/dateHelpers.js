// Formato de fecha para mostrar
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString();
};

// Obtener el primer día del mes actual
export const getFirstDayOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

// Obtener el último día del mes actual
export const getLastDayOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

// Obtener el primer día del mes anterior
export const getFirstDayOfPreviousMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
};

// Obtener el último día del mes anterior
export const getLastDayOfPreviousMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 0);
};

// Agrupar gastos por mes
export const groupExpensesByMonth = (expenses) => {
  return expenses.reduce((acc, expense) => {
    const date = new Date(expense.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    
    acc[monthKey].push(expense);
    return acc;
  }, {});
};

// Calcular el total de gastos
export const calculateTotal = (expenses) => {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
};

// Formatear cantidad como moneda
export const formatCurrency = (amount, currency = 'EUR') => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Obtener el rango de fechas para un período específico
export const getDateRangeForPeriod = (period) => {
  const today = new Date();
  let startDate, endDate;

  switch (period) {
    case 'week':
      startDate = new Date(today.setDate(today.getDate() - today.getDay()));
      endDate = new Date(today.setDate(today.getDate() + 6));
      break;
    case 'month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'year':
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear(), 11, 31);
      break;
    default:
      startDate = new Date(today.setDate(today.getDate() - 30));
      endDate = new Date();
  }

  return { startDate, endDate };
}; 