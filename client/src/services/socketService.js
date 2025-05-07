import { io } from 'socket.io-client';
import authService from './authService';

// URL del servidor Socket.IO - Detectamos automáticamente entorno de producción vs desarrollo
const isProduction = process.env.NODE_ENV === 'production';
const SOCKET_URL = isProduction 
  ? window.location.origin                 // En producción: misma URL de la app
  : process.env.REACT_APP_API_URL || 'http://localhost:5000'; // En desarrollo: URL de la API

// Opciones de conexión
const socketOptions = {
  autoConnect: false, // Conectar manualmente
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 3000,
  timeout: 10000,
  // En producción, no es necesario establecer el path, ya que la ruta /socket.io está configurada en vercel.json
  ...(isProduction ? {} : { path: '/socket.io' })
};

// Crear instancia de Socket.IO
let socket = null;

// Callbacks de eventos
const eventCallbacks = {
  'data-update': [],
  'expense-added': [],
  'expense-updated': [],
  'expense-deleted': [],
  'session-updated': [],
  'allocation-updated': [],
  'notification': [],
};

/**
 * Inicia la conexión con el servidor Socket.IO
 */
const connect = async () => {
  try {
    if (socket) return socket;
    
    console.log(`Conectando a Socket.IO en ${SOCKET_URL} (${isProduction ? 'producción' : 'desarrollo'})`);
    
    // Crear nueva conexión
    socket = io(SOCKET_URL, socketOptions);
    
    // Configurar eventos base
    setupEventListeners();
    
    // Conectar al servidor
    socket.connect();
    
    // Autenticar después de conectarse
    socket.on('connect', () => {
      console.log('Socket.IO conectado con ID:', socket.id);
      const token = authService.getToken();
      if (token) {
        socket.emit('authenticate', token);
        console.log('Socket conectado y autenticado');
      }
    });
    
    return socket;
  } catch (error) {
    console.error('Error al conectar con el servidor Socket.IO:', error);
    return null;
  }
};

/**
 * Configura los listeners de eventos
 */
const setupEventListeners = () => {
  if (!socket) return;
  
  // Evento de desconexión
  socket.on('disconnect', (reason) => {
    console.log(`Socket desconectado: ${reason}`);
  });
  
  // Evento de reconexión
  socket.on('reconnect', (attemptNumber) => {
    console.log(`Socket reconectado después de ${attemptNumber} intentos`);
    
    // Re-autenticar después de reconectar
    const token = authService.getToken();
    if (token) {
      socket.emit('authenticate', token);
    }
  });
  
  // Eventos de datos
  socket.on('data-update', (data) => {
    console.log('Actualización de datos recibida:', data);
    triggerCallbacks('data-update', data);
  });
  
  socket.on('expense-added', (data) => {
    console.log('Nuevo gasto agregado:', data);
    triggerCallbacks('expense-added', data);
  });
  
  socket.on('expense-updated', (data) => {
    console.log('Gasto actualizado:', data);
    triggerCallbacks('expense-updated', data);
  });
  
  socket.on('expense-deleted', (data) => {
    console.log('Gasto eliminado:', data);
    triggerCallbacks('expense-deleted', data);
  });
  
  socket.on('session-updated', (data) => {
    console.log('Sesión actualizada:', data);
    triggerCallbacks('session-updated', data);
  });
  
  socket.on('allocation-updated', (data) => {
    console.log('Asignación actualizada:', data);
    triggerCallbacks('allocation-updated', data);
  });
  
  socket.on('notification', (data) => {
    console.log('Notificación recibida:', data);
    triggerCallbacks('notification', data);
  });
};

/**
 * Desconecta del servidor Socket.IO
 */
const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Suscribe a un evento de Socket.IO
 * @param {string} event - Nombre del evento
 * @param {Function} callback - Función a ejecutar cuando ocurra el evento
 * @returns {Function} - Función para cancelar la suscripción
 */
const subscribe = (event, callback) => {
  if (!eventCallbacks[event]) {
    eventCallbacks[event] = [];
  }
  
  eventCallbacks[event].push(callback);
  
  // Devolver función para cancelar suscripción
  return () => {
    eventCallbacks[event] = eventCallbacks[event].filter(cb => cb !== callback);
  };
};

/**
 * Ejecuta todos los callbacks registrados para un evento
 * @param {string} event - Nombre del evento
 * @param {any} data - Datos del evento
 */
const triggerCallbacks = (event, data) => {
  if (eventCallbacks[event]) {
    eventCallbacks[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error en callback de evento ${event}:`, error);
      }
    });
  }
};

const socketService = {
  connect,
  disconnect,
  subscribe,
  getSocket: () => socket,
};

export default socketService; 