import axios from 'axios';
import { formatAmount } from '../utils/expenseUtils';

const API_URL = '/api/shared-sessions';

// Símbolos de moneda
const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  MXN: '$',
  GBP: '£',
  JPY: '¥'
};

// Formato de moneda según el locale
const CURRENCY_LOCALES = {
  EUR: 'es-ES',
  USD: 'en-US',
  MXN: 'es-MX',
  GBP: 'en-GB',
  JPY: 'ja-JP'
};

/**
 * Formatea un valor a la moneda seleccionada
 * @param {number} value - Valor a formatear
 * @param {string} currency - Código de moneda (EUR, USD, etc.)
 * @param {boolean} showSymbol - Mostrar el símbolo de moneda
 * @returns {string} - Valor formateado
 */
export const formatCurrency = (value, currency = 'EUR', showSymbol = true) => {
  if (value === undefined || value === null) return '';
  
  try {
    if (currency === 'EUR') {
      return formatAmount(value);
    }
    
    // Para otras monedas, usar Intl.NumberFormat
    return new Intl.NumberFormat(CURRENCY_LOCALES[currency] || 'es-ES', {
      style: showSymbol ? 'currency' : 'decimal',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    }).format(value);
  } catch (error) {
    // Fallback simple en caso de error
    return showSymbol 
      ? `${value.toFixed(2)} ${CURRENCY_SYMBOLS[currency] || '€'}`
      : value.toFixed(2);
  }
};

/**
 * Obtiene el símbolo de una moneda
 * @param {string} currency - Código de moneda
 * @returns {string} - Símbolo de moneda
 */
export const getCurrencySymbol = (currency = 'EUR') => {
  return CURRENCY_SYMBOLS[currency] || '€';
};

export default {
  formatCurrency,
  getCurrencySymbol
}; 