// utils/helpers.js
// Eliminamos las importaciones de date-fns
// import format from 'date-fns/format';
// import es from 'date-fns/locale/es';

import { formatAmount } from './expenseUtils';

// Exportar la función formatCurrency como alias de formatAmount para mantener compatibilidad
export const formatCurrency = formatAmount;

export const formatDate = (date) => {
  if (!date) return 'Fecha no disponible';
  
  try {
    // Manejar diferentes tipos de entrada
    let dateObj;
    
    if (typeof date === 'string') {
      // Para cadenas, intentar crear un objeto Date
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      // Ya es un objeto Date
      dateObj = date;
    } else if (typeof date === 'number') {
      // Para timestamps en milisegundos
      dateObj = new Date(date);
    } else {
      console.warn('Tipo de fecha desconocido en formatDate:', typeof date, date);
      return 'Formato de fecha inválido';
    }
    
    // Verificar si es una fecha válida
    if (isNaN(dateObj.getTime())) {
      console.warn('Fecha inválida detectada en formatDate:', date);
      return 'Fecha inválida';
    }
    
    try {
      // Usar toLocaleDateString con manejo de errores
      return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (formatError) {
      console.error('Error al formatear con toLocaleDateString:', formatError);
      // Formatear manualmente como último recurso
      return `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
    }
  } catch (error) {
    console.error('Error crítico al formatear fecha:', error, 'date:', date);
    return 'Fecha inválida';
  }
};

export const formatDateTime = (date) => {
  if (!date) return 'Fecha no disponible';
  
  try {
    // Manejar diferentes tipos de entrada
    let dateObj;
    
    if (typeof date === 'string') {
      // Para cadenas, intentar crear un objeto Date
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      // Ya es un objeto Date
      dateObj = date;
    } else if (typeof date === 'number') {
      // Para timestamps en milisegundos
      dateObj = new Date(date);
    } else {
      console.warn('Tipo de fecha desconocido en formatDateTime:', typeof date, date);
      return 'Formato de fecha inválido';
    }
    
    // Verificar si es una fecha válida
    if (isNaN(dateObj.getTime())) {
      console.warn('Fecha inválida detectada en formatDateTime:', date);
      return 'Fecha inválida';
    }
    
    try {
      // Usar toLocaleString con manejo de errores
      return dateObj.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (formatError) {
      console.error('Error al formatear con toLocaleString:', formatError);
      // Formatear manualmente como último recurso
      return `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
    }
  } catch (error) {
    console.error('Error crítico al formatear fecha y hora:', error, 'date:', date);
    return 'Fecha inválida';
  }
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const calculatePercentage = (amount, total) => {
  if (!total) return 0;
  return Math.round((amount / total) * 100);
};

export const roundToTwo = (num) => {
  return Math.round(num * 100) / 100;
};

export const validatePercentages = (percentages) => {
  const total = Object.values(percentages).reduce((acc, val) => acc + val, 0);
  return Math.abs(total - 100) < 0.01;
};

export const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const generateRandomColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB',
    '#E67E22', '#2ECC71'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const sortByDate = (a, b) => {
  return new Date(b.date) - new Date(a.date);
};

export const groupExpensesByMonth = (expenses) => {
  return expenses.reduce((groups, expense) => {
    try {
      const date = new Date(expense.date);
      if (isNaN(date.getTime())) {
        console.warn('Fecha inválida en gastos:', expense.date);
        // Si la fecha es inválida, agrupamos en "Sin fecha"
        if (!groups["Sin fecha"]) {
          groups["Sin fecha"] = [];
        }
        groups["Sin fecha"].push(expense);
        return groups;
      }
      
      // Usamos toLocalString en lugar de date-fns
      const month = date.toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric'
      });
      
      if (!groups[month]) {
        groups[month] = [];
      }
      
      groups[month].push(expense);
      return groups;
    } catch (error) {
      console.error('Error al agrupar gastos por mes:', error, 'expense:', expense);
      // Si hay error, agregar al grupo "Error"
      if (!groups["Error"]) {
        groups["Error"] = [];
      }
      groups["Error"].push(expense);
      return groups;
    }
  }, {});
};

export const calculateTotalsByCategory = (expenses) => {
  return expenses.reduce((totals, expense) => {
    const { category, amount } = expense;
    totals[category] = (totals[category] || 0) + amount;
    return totals;
  }, {});
};

export const getCategoryColor = (category) => {
  const colors = {
    'Alquiler': '#f44336',
    'Comida': '#4caf50',
    'Transporte': '#2196f3',
    'Entretenimiento': '#ff9800',
    'Salud': '#9c27b0',
    'Educación': '#673ab7',
    'Otros': '#9e9e9e'
  };
  return colors[category] || '#9e9e9e';
};