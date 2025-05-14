/**
 * Administrador centralizado de configuraciones de usuario
 * Este módulo maneja todas las operaciones relacionadas con la configuración del usuario
 * sin tener que depender de la lógica de los componentes
 */

import i18n from '../i18n';
import authService from '../services/authService';

// Configuración predeterminada
const DEFAULT_SETTINGS = {
  darkMode: false,
  language: 'es',
  currency: 'EUR',
  notifications: false
};

// Cargar configuración desde localStorage
const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error('Error al cargar configuración:', error);
  }
  return DEFAULT_SETTINGS;
};

// Guardar configuración en localStorage
const saveSettings = (settings) => {
  try {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    return false;
  }
};

// Sincronizar configuración con el servidor (en segundo plano)
const syncSettingsWithServer = async (setting, value) => {
  // Crear una promesa que se rechaza automáticamente después de 3 segundos
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout al conectar con el servidor')), 3000);
  });
  
  try {
    // Competir entre la petición real y el timeout
    await Promise.race([
      timeoutPromise,
      (async () => {
        const userData = await authService.getCurrentUser();
        if (!userData) return false;
        
        const updatedProfile = {
          settings: {
            ...(userData.settings || {}),
            [setting]: value
          }
        };
        
        await authService.updateProfile(updatedProfile);
        return true;
      })()
    ]);
    
    return true;
  } catch (error) {
    console.error('Error al sincronizar configuración con servidor:', error);
    // No afecta la experiencia del usuario, solo log
    return false;
  }
};

// Actualizar una configuración específica
const updateSetting = (setting, value) => {
  try {
    // Cargar configuración actual
    const currentSettings = loadSettings();
    
    // Actualizar valor
    const updatedSettings = {
      ...currentSettings,
      [setting]: value
    };
    
    // Guardar localmente
    saveSettings(updatedSettings);
    
    // Aplicar cambios específicos
    if (setting === 'language') {
      i18n.changeLanguage(value);
    }
    
    // Notificar el cambio
    window.dispatchEvent(new CustomEvent('settingsChanged', { 
      detail: { setting, value } 
    }));
    
    // Intentar sincronizar en segundo plano sin esperar resultado
    setTimeout(() => {
      try {
        syncSettingsWithServer(setting, value)
          .catch(err => console.error('Error en sincronización en segundo plano:', err));
      } catch (error) {
        console.error('Error en actualización en segundo plano:', error);
      }
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return false;
  }
};

// Obtener una configuración específica
const getSetting = (setting) => {
  const settings = loadSettings();
  return settings[setting];
};

// Exportar funciones
const settingsManager = {
  loadSettings,
  saveSettings,
  updateSetting,
  getSetting,
  syncSettingsWithServer
};

export default settingsManager; 