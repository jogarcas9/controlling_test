/**
 * Servicio para manejar la conexión WebSocket
 * Versión simplificada sin funcionalidad de notificaciones
 */

let socket = null;
let reconnectTimer = null;
let messageHandlers = [];
let connectionHandlers = { onOpen: [], onClose: [], onError: [] };

// Para pruebas y depuración
const WS_URL = process.env.NODE_ENV === 'production' 
  ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws` 
  : 'ws://localhost:3000/ws';

/**
 * Inicializa la conexión WebSocket
 */
const initSocket = () => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    console.log('WebSocket ya está conectado o conectándose.');
    return;
  }

  console.log(`Iniciando conexión WebSocket a ${WS_URL}`);
  
  try {
    socket = new WebSocket(WS_URL);

    socket.onopen = (event) => {
      console.log('Conexión WebSocket establecida');
      clearTimeout(reconnectTimer);
      
      // Autenticar la conexión
      authenticateConnection();
      
      // Notificar a todos los manejadores de conexión
      connectionHandlers.onOpen.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error en manejador onOpen:', error);
        }
      });
    };

    socket.onmessage = (event) => {
      console.log('Mensaje recibido:', event.data);
      try {
        const data = JSON.parse(event.data);
        
        // Notificar a todos los manejadores de mensajes
        messageHandlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error('Error en manejador de mensaje:', error);
          }
        });
      } catch (error) {
        console.error('Error al procesar mensaje WebSocket:', error);
      }
    };

    socket.onclose = (event) => {
      console.log('Conexión WebSocket cerrada. Reintentando en 5 segundos...');
      
      // Limpiar recursos
      socket = null;
      
      // Notificar a todos los manejadores de cierre
      connectionHandlers.onClose.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error en manejador onClose:', error);
        }
      });
      
      // Reintentar conexión después de 5 segundos
      reconnectTimer = setTimeout(initSocket, 5000);
    };

    socket.onerror = (error) => {
      console.error('Error en la conexión WebSocket:', error);
      
      // Notificar a todos los manejadores de error
      connectionHandlers.onError.forEach(handler => {
        try {
          handler(error);
        } catch (err) {
          console.error('Error en manejador onError:', err);
        }
      });
    };
  } catch (error) {
    console.error('Error al crear la conexión WebSocket:', error);
    
    // Reintentar después de un tiempo
    reconnectTimer = setTimeout(initSocket, 5000);
  }
};

/**
 * Autentica la conexión WebSocket con el token del usuario
 */
const authenticateConnection = () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('No hay conexión WebSocket para autenticar');
    return;
  }
  
  try {
    // Obtener el token de autenticación
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.warn('No hay token disponible para autenticar la conexión WebSocket');
      return;
    }
    
    // Enviar mensaje de autenticación
    socket.send(JSON.stringify({
      type: 'auth',
      token
    }));
    
    console.log('Autenticación WebSocket enviada');
  } catch (error) {
    console.error('Error al autenticar conexión WebSocket:', error);
  }
};

/**
 * Envía un mensaje a través del WebSocket
 * @param {Object} data - Datos a enviar
 * @returns {boolean} - Éxito de la operación
 */
const sendMessage = (data) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('WebSocket no está conectado. No se puede enviar mensaje.');
    return false;
  }

  try {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    socket.send(message);
    return true;
  } catch (error) {
    console.error('Error al enviar mensaje WebSocket:', error);
    return false;
  }
};

/**
 * Registra un manejador de mensajes
 * @param {Function} handler - Función que maneja mensajes
 */
const addMessageHandler = (handler) => {
  if (typeof handler === 'function' && !messageHandlers.includes(handler)) {
    messageHandlers.push(handler);
  }
};

/**
 * Elimina un manejador de mensajes
 * @param {Function} handler - Manejador a eliminar
 */
const removeMessageHandler = (handler) => {
  const index = messageHandlers.indexOf(handler);
  if (index !== -1) {
    messageHandlers.splice(index, 1);
  }
};

/**
 * Registra manejadores de eventos de conexión
 */
const addConnectionHandler = (type, handler) => {
  if (typeof handler === 'function' && ['onOpen', 'onClose', 'onError'].includes(type)) {
    if (!connectionHandlers[type].includes(handler)) {
      connectionHandlers[type].push(handler);
    }
  }
};

/**
 * Elimina manejadores de eventos de conexión
 */
const removeConnectionHandler = (type, handler) => {
  if (['onOpen', 'onClose', 'onError'].includes(type)) {
    const index = connectionHandlers[type].indexOf(handler);
    if (index !== -1) {
      connectionHandlers[type].splice(index, 1);
    }
  }
};

/**
 * Cierra la conexión WebSocket
 */
const closeConnection = () => {
  if (socket) {
    clearTimeout(reconnectTimer);
    socket.close();
    socket = null;
  }
};

// Iniciar automáticamente la conexión cuando se importa este módulo
// esto debería hacerse solo en ambientes del cliente
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Retrasar un poco la conexión para permitir que todo se cargue
    setTimeout(initSocket, 1000);
  });
  
  // Reintentar autenticación cuando cambia el storage (login/logout)
  window.addEventListener('storage', (event) => {
    if (event.key === 'token' && socket && socket.readyState === WebSocket.OPEN) {
      authenticateConnection();
    }
  });
}

// Crear variable para el servicio WebSocket antes de exportarlo
const webSocketService = {
  init: initSocket,
  close: closeConnection,
  send: sendMessage,
  addMessageHandler,
  removeMessageHandler,
  addConnectionHandler,
  removeConnectionHandler
};

export default webSocketService; 