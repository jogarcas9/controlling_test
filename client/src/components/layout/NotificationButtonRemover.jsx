import React, { useEffect } from 'react';

/**
 * Componente que se encarga de eliminar específicamente el botón de notificaciones
 * mostrado en el HTML proporcionado
 */
const NotificationButtonRemover = () => {
  useEffect(() => {
    const removeNotificationButton = () => {
      // Función para comprobar si un elemento coincide con la estructura del botón
      const matchesNotificationButton = (element) => {
        // Verificar si es un botón con las clases correctas
        if (!element || element.tagName !== 'BUTTON') return false;
        
        if (!element.classList.contains('MuiButtonBase-root') || 
            !element.classList.contains('MuiIconButton-root') ||
            !element.classList.contains('MuiIconButton-colorInherit')) {
          return false;
        }
        
        // Verificar si contiene un SVG con data-testid="NotificationsIcon"
        const svg = element.querySelector('svg[data-testid="NotificationsIcon"]');
        if (!svg) return false;
        
        // Verificar si tiene un span.MuiBadge-root
        const badge = element.querySelector('.MuiBadge-root');
        if (!badge) return false;
        
        return true;
      };
      
      // Buscar todos los botones en el documento
      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        if (matchesNotificationButton(button)) {
          console.log('Botón de notificaciones encontrado y eliminado');
          button.style.display = 'none';
          
          // Alternativa: eliminar completamente del DOM
          // button.parentNode?.removeChild(button);
        }
      });
      
      // Buscar específicamente el botón con la clase CSS exacta
      const specificButtons = document.querySelectorAll('.css-zylse7-MuiButtonBase-root-MuiIconButton-root');
      specificButtons.forEach(button => {
        console.log('Botón con clase específica encontrado y eliminado');
        button.style.display = 'none';
      });
    };
    
    // Ejecutar inmediatamente
    removeNotificationButton();
    
    // Observar cambios en el DOM
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          // Cuando se añadan nuevos nodos, verificar si el botón de notificaciones está presente
          removeNotificationButton();
        }
      }
    });
    
    // Iniciar observación
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Limpiar al desmontar
    return () => observer.disconnect();
  }, []);
  
  return null;
};

export default NotificationButtonRemover; 