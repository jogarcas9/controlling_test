import {
  Restaurant as RestaurantIcon,
  DirectionsCar as DirectionsCarIcon,
  Home as HomeIcon,
  SportsEsports as SportsEsportsIcon,
  EuroSymbol as EuroSymbolIcon,
  MoreHoriz as MoreHorizIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import React from 'react';

// Constantes para categorías
export const EXPENSE_CATEGORIES = [
  'Alquiler',
  'Gasolina',
  'Gastos hijo',
  'Ocio',
  'Otros',
  'Tarjetas',
  'Préstamos',
  'Comida',
  'Transporte',
  'Servicios',
  'Gastos Compartidos'
];

export const INCOME_CATEGORIES = ['Nómina', 'Otros'];

export const CATEGORY_ICONS = {
  'Alquiler': <HomeIcon fontSize="small" />,
  'Gasolina': <DirectionsCarIcon fontSize="small" />,
  'Gastos hijo': <MoreHorizIcon fontSize="small" />,
  'Ocio': <SportsEsportsIcon fontSize="small" />,
  'Otros': <MoreHorizIcon fontSize="small" />,
  'Tarjetas': <EuroSymbolIcon fontSize="small" />,
  'Préstamos': <EuroSymbolIcon fontSize="small" />,
  'Comida': <RestaurantIcon fontSize="small" />,
  'Transporte': <DirectionsCarIcon fontSize="small" />,
  'Servicios': <EuroSymbolIcon fontSize="small" />,
  'Nómina': <WorkIcon fontSize="small" />,
  'Gastos Compartidos': <EuroSymbolIcon fontSize="small" />
};

export const CATEGORY_COLORS = {
  'Alquiler': '#4caf50',
  'Gasolina': '#f44336',
  'Gastos hijo': '#2196f3',
  'Ocio': '#ff9800',
  'Otros': '#9e9e9e',
  'Tarjetas': '#e91e63',
  'Préstamos': '#9c27b0',
  'Comida': '#8bc34a',
  'Transporte': '#3f51b5',
  'Servicios': '#00bcd4',
  'Nómina': '#4caf50',
  'Gastos Compartidos': '#2196f3'
};

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Funciones de utilidad
export const formatAmount = (amount) => {
  if (!amount && amount !== 0) return '0,00 €';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  }).format(amount);
};

// Obtiene el color asignado a una categoría o devuelve un color por defecto
export const getCategoryColor = (category) => CATEGORY_COLORS[category] || '#9e9e9e';

// Determina si un gasto es compartido, usando isFromSharedSession como criterio principal
export const isSharedExpense = (expense) => {
  return expense.isFromSharedSession === true || (expense.sessionReference && expense.sessionReference.sessionId);
};

// Genera una key única para un gasto (útil para gastos sin ID)
export const generateExpenseKey = (expense) => {
  const timestamp = new Date(expense.date).getTime();
  const randomSuffix = Math.random().toString(36).substring(7);
  return `${expense._id || 'new'}-${timestamp}-${expense.amount}-${randomSuffix}`;
};

/**
 * Calcula el tipo de gasto y los pagos pendientes
 * @param {Object} expense - El gasto a evaluar
 * @param {Date} currentDate - La fecha actual para calcular los pagos pendientes
 * @returns {string} - El tipo de gasto formateado (PT, REC, P#)
 */
export const getExpenseTypeLabel = (expense, currentDate = new Date()) => {
  if (!expense) return 'PT';

  // Si es recurrente, devolver REC
  if (expense.isRecurring) {
    return 'REC';
  }

  // Si es periódico, calcular los pagos pendientes
  if (expense.isPeriodic && expense.periodStartDate && expense.periodEndDate) {
    const startDate = new Date(expense.periodStartDate);
    const endDate = new Date(expense.periodEndDate);
    
    // Si la fecha actual es posterior a la fecha de fin, no hay pagos pendientes
    if (currentDate > endDate) {
      return 'P0';
    }

    // Si la fecha actual es anterior a la fecha de inicio, mostrar el total de pagos
    if (currentDate < startDate) {
      const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 
        + (endDate.getMonth() - startDate.getMonth()) + 1;
      return `P${totalMonths}`;
    }

    // Calcular los meses restantes desde la fecha actual hasta la fecha de fin
    const remainingMonths = (endDate.getFullYear() - currentDate.getFullYear()) * 12 
      + (endDate.getMonth() - currentDate.getMonth()) + 1;

    return `P${Math.max(0, remainingMonths)}`;
  }

  // Si no es ni recurrente ni periódico, es puntual
  return 'PT';
}; 