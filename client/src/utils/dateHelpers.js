// Formato de fecha para mostrar
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString();
};

// Obtener el nombre del mes a partir del índice (0-11)
export const getMonthName = (monthIndex) => {
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  // Asegurar que el índice está en el rango válido
  if (monthIndex < 0 || monthIndex > 11) {
    return `Mes ${monthIndex < 0 ? 1 : monthIndex > 11 ? 12 : monthIndex + 1}`;
  }
  return monthNames[monthIndex];
};

// Formatear mes y año
export const formatMonthYear = (month, year) => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  // Asegurar que el mes esté en el rango 0-11
  const safeMonth = month < 0 ? 0 : month > 11 ? 11 : month;
  return `${months[safeMonth]} ${year}`;
};

// Obtener el primer día del mes especificado (o el actual si no se especifica)
export const getFirstDayOfMonth = (year = null, month = null) => {
  if (year === null || month === null) {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  // Usar mes en formato 0-11 donde 0 es enero y 11 es diciembre
  return new Date(year, month, 1);
};

// Obtener el último día del mes especificado (o el actual si no se especifica)
export const getLastDayOfMonth = (year = null, month = null) => {
  if (year === null || month === null) {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }
  // Para obtener el último día del mes: usar el día 0 del mes siguiente
  return new Date(year, month + 1, 0);
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
    // Usar formato año-mes para la clave donde mes está en formato 0-11
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    
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