import React, { createContext, useState, useContext } from 'react';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState({
    code: 'EUR',
    symbol: '€',
    name: 'Euro'
  });

  const [availableCurrencies] = useState([
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'GBP', symbol: '£', name: 'British Pound' }
  ]);

  const changeCurrency = (currencyCode) => {
    const newCurrency = availableCurrencies.find(c => c.code === currencyCode);
    if (newCurrency) {
      setCurrency(newCurrency);
      localStorage.setItem('preferredCurrency', currencyCode);
    }
  };

  // Formatear cantidad según la moneda seleccionada
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency.code
    }).format(amount);
  };

  const value = {
    currency,
    availableCurrencies,
    changeCurrency,
    formatAmount
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency debe ser usado dentro de un CurrencyProvider');
  }
  return context;
};

export default CurrencyContext; 