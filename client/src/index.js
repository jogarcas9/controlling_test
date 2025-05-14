import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import './i18n';

// Inicialización optimizada de la aplicación
const renderApp = () => {
  const container = document.getElementById('root');
  const root = createRoot(container);
  
  // Renderizado con modo concurrente para mejor rendimiento
  root.render(
    <App />
  );
};

// Iniciar la aplicación
renderApp();

// Registrar el service worker solo en producción
if (process.env.NODE_ENV === 'production') {
  const registerServiceWorker = async () => {
    const { register } = await import('./serviceWorkerRegistration');
    register();
  };
  
  // Cargar el service worker después de que la app esté lista
  window.addEventListener('load', () => {
    registerServiceWorker();
  });
} 