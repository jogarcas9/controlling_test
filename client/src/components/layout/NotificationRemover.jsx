import React, { useEffect } from 'react';

/**
 * Componente que se encarga de eliminar cualquier botón de notificaciones
 * que pueda aparecer en la interfaz de usuario
 */
const NotificationRemover = () => {
  useEffect(() => {
    // Función para eliminar elementos de notificaciones
    const removeNotificationElements = () => {
      // Buscar elementos por diferentes atributos que podrían indicar un botón de notificaciones
      const selectors = [
        '[aria-label*="notification" i]',
        '[aria-label*="notificación" i]',
        '[aria-label*="notificaciones" i]',
        '[data-testid*="notification" i]',
        '.MuiButtonBase-root:has(svg[data-testid*="Notifications"])',
        '.MuiButtonBase-root:has(svg[class*="Notifications"])',
        '.MuiButtonBase-root:has(svg[class*="NotificationsIcon"])',
        'button:has(svg[data-testid*="Notifications"])',
        'button:has(svg[class*="Notifications"])',
        // Selectores específicos para el botón mostrado en la imagen
        '.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-colorInherit:has(.MuiBadge-root svg[data-testid="NotificationsIcon"])',
        '.MuiButtonBase-root:has(.MuiBadge-root svg[data-testid="NotificationsIcon"])',
        '.css-zylse7-MuiButtonBase-root-MuiIconButton-root',
        'div[class*="notifications-container"]',
        // Selector por estructura exacta
        'button.MuiButtonBase-root.MuiIconButton-root.MuiIconButton-colorInherit',
        // Selector para el componente padre
        'div[class*="notificationsContainer"]',
        'div[class="notifications-container"]'
      ];

      // Combinar todos los selectores
      const combinedSelector = selectors.join(', ');
      
      // Buscar elementos que coincidan con los selectores
      const elements = document.querySelectorAll(combinedSelector);
      
      // Eliminar los elementos encontrados
      elements.forEach(element => {
        element.style.display = 'none';
        // Alternativa: remover el elemento del DOM
        // element.parentNode?.removeChild(element);
      });

      // Buscar específicamente por el data-testid del SVG dentro de cualquier botón
      document.querySelectorAll('svg[data-testid="NotificationsIcon"]').forEach(svg => {
        // Subir en el DOM hasta encontrar el botón padre
        let parent = svg.parentElement;
        while (parent && parent.tagName !== 'BUTTON') {
          parent = parent.parentElement;
        }
        
        if (parent) {
          parent.style.display = 'none';
        }
      });
      
      // Eliminar también por la clase específica del botón mostrado en la imagen
      document.querySelectorAll('.css-zylse7-MuiButtonBase-root-MuiIconButton-root').forEach(button => {
        button.style.display = 'none';
      });
    };

    // Ejecutar la función inmediatamente
    removeNotificationElements();

    // Crear un observador de mutaciones para detectar cambios en el DOM
    const observer = new MutationObserver(removeNotificationElements);
    
    // Iniciar la observación del documento
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Limpiar el observador cuando se desmonte el componente
    return () => {
      observer.disconnect();
    };
  }, []);

  // Este componente no renderiza nada visible
  return null;
};

export default NotificationRemover; 