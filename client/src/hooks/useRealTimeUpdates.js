import { useEffect, useState, useCallback } from 'react';
import socketService from '../services/socketService';

/**
 * Hook personalizado para manejar actualizaciones en tiempo real
 * @param {Object} options - Opciones de configuración
 * @param {Array<string>} options.events - Lista de eventos a los que suscribirse
 * @param {Function} options.onDataUpdate - Callback cuando hay actualización de datos
 * @param {Function} options.onExpenseAdded - Callback cuando se añade un gasto
 * @param {Function} options.onExpenseUpdated - Callback cuando se actualiza un gasto
 * @param {Function} options.onExpenseDeleted - Callback cuando se elimina un gasto
 * @param {Function} options.onSessionUpdated - Callback cuando se actualiza una sesión
 * @param {Function} options.onAllocationUpdated - Callback cuando se actualiza una asignación
 * @param {Function} options.onNotification - Callback cuando se recibe una notificación
 * @returns {Object} - Estado de la conexión y funciones de utilidad
 */
const useRealTimeUpdates = (options = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Conectar al servidor Socket.IO al montar el componente
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const socket = await socketService.connect();
        if (socket) {
          setIsConnected(true);
          socket.on('connect', () => setIsConnected(true));
          socket.on('disconnect', () => setIsConnected(false));
        }
      } catch (error) {
        console.error('Error al inicializar Socket.IO:', error);
        setIsConnected(false);
      }
    };
    
    initializeSocket();
    
    // Limpieza al desmontar el componente
    return () => {
      // No desconectamos al desmontar para mantener una única conexión en toda la app
      // Solo eliminaremos las suscripciones específicas de este componente
    };
  }, []);
  
  // Suscribirse a eventos específicos
  useEffect(() => {
    const unsubscribeFunctions = [];
    
    // Evento de actualización de datos
    if (options.onDataUpdate) {
      const unsubscribe = socketService.subscribe('data-update', (data) => {
        options.onDataUpdate(data);
        setLastUpdate(new Date());
      });
      unsubscribeFunctions.push(unsubscribe);
    }
    
    // Evento de gasto añadido
    if (options.onExpenseAdded) {
      const unsubscribe = socketService.subscribe('expense-added', (data) => {
        options.onExpenseAdded(data);
        setLastUpdate(new Date());
      });
      unsubscribeFunctions.push(unsubscribe);
    }
    
    // Evento de gasto actualizado
    if (options.onExpenseUpdated) {
      const unsubscribe = socketService.subscribe('expense-updated', (data) => {
        options.onExpenseUpdated(data);
        setLastUpdate(new Date());
      });
      unsubscribeFunctions.push(unsubscribe);
    }
    
    // Evento de gasto eliminado
    if (options.onExpenseDeleted) {
      const unsubscribe = socketService.subscribe('expense-deleted', (data) => {
        options.onExpenseDeleted(data);
        setLastUpdate(new Date());
      });
      unsubscribeFunctions.push(unsubscribe);
    }
    
    // Evento de sesión actualizada
    if (options.onSessionUpdated) {
      const unsubscribe = socketService.subscribe('session-updated', (data) => {
        options.onSessionUpdated(data);
        setLastUpdate(new Date());
      });
      unsubscribeFunctions.push(unsubscribe);
    }
    
    // Evento de asignación actualizada
    if (options.onAllocationUpdated) {
      const unsubscribe = socketService.subscribe('allocation-updated', (data) => {
        options.onAllocationUpdated(data);
        setLastUpdate(new Date());
      });
      unsubscribeFunctions.push(unsubscribe);
    }
    
    // Evento de notificación
    if (options.onNotification) {
      const unsubscribe = socketService.subscribe('notification', (data) => {
        options.onNotification(data);
        setLastUpdate(new Date());
      });
      unsubscribeFunctions.push(unsubscribe);
    }
    
    // Limpiar suscripciones al desmontar o cuando cambien las opciones
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [
    options.onDataUpdate,
    options.onExpenseAdded,
    options.onExpenseUpdated,
    options.onExpenseDeleted,
    options.onSessionUpdated,
    options.onAllocationUpdated,
    options.onNotification
  ]);
  
  // Función para forzar una reconexión
  const reconnect = useCallback(async () => {
    try {
      await socketService.disconnect();
      const socket = await socketService.connect();
      if (socket) {
        setIsConnected(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error al reconectar:', error);
      setIsConnected(false);
      return false;
    }
  }, []);
  
  return {
    isConnected,
    lastUpdate,
    reconnect
  };
};

export default useRealTimeUpdates; 