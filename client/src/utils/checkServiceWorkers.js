/**
 * Verifica y desregistra todos los service workers y desactiva las notificaciones
 * @returns {Promise<Array>} Lista de service workers desregistrados
 */
export const checkServiceWorkers = async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers no están soportados en este navegador');
    return [];
  }

  try {
    // Desactivar notificaciones primero
    if ('Notification' in window) {
      try {
        // Intentar denegar explícitamente los permisos de notificaciones
        if (Notification.permission === 'granted') {
          // En algunos navegadores no se puede revocar el permiso directamente
          // pero podemos desuscribir todas las suscripciones
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
              await subscription.unsubscribe();
              console.log('Suscripción a notificaciones cancelada');
            }
          }
        }
      } catch (error) {
        console.error('Error al desactivar notificaciones:', error);
      }
    }

    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('Service Workers encontrados:', registrations.length);
    
    // Desregistrar todos los service workers
    await Promise.all(registrations.map(async (registration) => {
      try {
        // Desactivar cualquier funcionalidad de notificaciones primero
        if (registration.pushManager) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            await subscription.unsubscribe();
          }
        }

        const unregistered = await registration.unregister();
        console.log('Service Worker desregistrado:', {
          scope: registration.scope,
          success: unregistered
        });
      } catch (error) {
        console.error('Error al desregistrar Service Worker:', error);
      }
    }));

    // Limpiar cualquier dato relacionado con notificaciones del localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.toLowerCase().includes('notification') || 
            key.toLowerCase().includes('push') || 
            key.toLowerCase().includes('subscribe')) {
          localStorage.removeItem(key);
          console.log('Eliminada configuración de notificaciones:', key);
        }
      });
    } catch (error) {
      console.error('Error al limpiar localStorage:', error);
    }

    return registrations;
  } catch (error) {
    console.error('Error al verificar Service Workers:', error);
    return [];
  }
};

/**
 * Reinicia los Service Workers de la aplicación
 * @returns {Promise<boolean>} true si se reinició correctamente
 */
export const resetServiceWorkers = async () => {
  try {
    // Primero desregistrar todos los Service Workers existentes
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));

    // Limpiar la caché
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map(key => caches.delete(key)));
    }

    // Recargar la página para que se registre un nuevo Service Worker limpio
    window.location.reload();
    return true;
  } catch (error) {
    console.error('Error al reiniciar Service Workers:', error);
    return false;
  }
};

// Función para verificar si hay conflictos de Service Workers
export const checkForServiceWorkerConflicts = async () => {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    // Si hay más de un Service Worker, podría haber conflictos
    if (registrations.length > 1) {
      console.warn('Se detectaron múltiples Service Workers. Reiniciando...');
      await resetServiceWorkers();
      return true;
    }

    // Si hay un Service Worker pero no está activo correctamente
    if (registrations.length === 1) {
      const registration = registrations[0];
      if (registration.active && !navigator.serviceWorker.controller) {
        console.warn('Service Worker en estado inconsistente. Reiniciando...');
        await resetServiceWorkers();
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error al verificar conflictos de Service Workers:', error);
    return false;
  }
}; 