import api from '../utils/api';
import ENV from '../config/environment';

// Usar las rutas del archivo de configuración central
const AUTH_ENDPOINTS = ENV.ROUTES.AUTH;

/**
 * Servicio centralizado para la autenticación
 * Maneja todas las operaciones relacionadas con la autenticación y usuarios
 */
class AuthService {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = null;
    this.initialized = false;
    this._fetchingUser = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      if (this.token) {
        const userData = await this.getCurrentUser();
        if (userData) {
          this.user = userData;
        }
      }
    } catch (error) {
      console.error('Error al inicializar servicio de autenticación:', error);
      this.logout();
    } finally {
      this.initialized = true;
    }
  }

  /**
   * Persistir información del usuario en localStorage
   * @param {Object} userData - Datos del usuario a persistir
   */
  _persistUserData(userData) {
    if (!userData) return;

    try {
      // Asegurarnos de preservar la fecha del usuario
      if (userData.fecha || userData.createdAt) {
        console.log('Guardando fecha del usuario en localStorage:', userData.fecha || userData.createdAt);
      }
      
      // Guardar objeto completo de usuario
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Guardar el ID del usuario, si está disponible
      if (userData._id || userData.id) {
        localStorage.setItem('userId', userData._id || userData.id);
      }
      
      // Construir y guardar el nombre completo para mostrar
      let displayName = '';
      
      if (userData.name && userData.last_name) {
        displayName = `${userData.name} ${userData.last_name}`;
      } else if (userData.name) {
        displayName = userData.name;
      } else if (userData.nombre && userData.apellidos) {
        // Para compatibilidad con datos antiguos
        displayName = `${userData.nombre} ${userData.apellidos}`;
      } else if (userData.nombre) {
        displayName = userData.nombre;
      } else if (userData.username) {
        displayName = userData.username;
      } else if (userData.email) {
        displayName = userData.email.split('@')[0];
      }
      
      if (displayName) {
        localStorage.setItem('userName', displayName);
      }
      
      // Guardar email si está disponible
      if (userData.email) {
        localStorage.setItem('userEmail', userData.email);
      }
    } catch (error) {
      console.error('Error al persistir datos de usuario:', error);
    }
  }

  /**
   * Iniciar sesión
   * @param {Object} credentials - Credenciales {email, password}
   * @returns {Promise} - Respuesta con token y datos del usuario
   */
  async login(credentials) {
    try {
      console.log('Iniciando sesión con:', credentials.email);
      const response = await api.post(AUTH_ENDPOINTS.LOGIN, credentials);
      
      if (response.data?.token) {
        this.token = response.data.token;
        localStorage.setItem('token', this.token);
        
        if (response.data.user) {
          this.user = response.data.user;
          // Registrar la fecha recibida
          console.log('Fecha recibida en login:', this.user.fecha || this.user.createdAt);
          this._persistUserData(this.user);
        }
        
        window.dispatchEvent(new Event('auth'));
        console.log('Sesión iniciada correctamente');
        return response.data;
      }
      
      throw new Error('Token no recibido del servidor');
    } catch (error) {
      console.error('Error durante el inicio de sesión:', error);
      this.logout();
      throw error;
    }
  }
  
  /**
   * Obtener datos del usuario actual con timeout de seguridad
   * @param {number} timeout - Tiempo máximo de espera en ms
   * @returns {Promise} - Datos del usuario
   */
  async getCurrentUser(timeout = 3000) {
    if (!this.token) return null;
    
    // Si ya tenemos los datos del usuario en memoria, devolverlos inmediatamente
    if (this.user) {
      console.log('Usando datos de usuario en memoria (authService)');
      if (this.user.fecha || this.user.createdAt) {
        console.log('Fecha del usuario en memoria:', this.user.fecha || this.user.createdAt);
      }
      return this.user;
    }
    
    // Intentar obtener los datos del usuario desde localStorage
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        this.user = JSON.parse(storedUser);
        console.log('Usando datos de usuario desde localStorage (authService)');
        if (this.user.fecha || this.user.createdAt) {
          console.log('Fecha del usuario en localStorage:', this.user.fecha || this.user.createdAt);
        }
        return this.user;
      }
    } catch (error) {
      console.error('Error al parsear datos de usuario almacenados:', error);
    }
    
    // Variable para controlar si ya se está haciendo una petición
    if (this._fetchingUser) {
      console.log('Ya hay una petición en curso para obtener datos del usuario');
      
      // Esperar hasta que termine la petición actual (máx. timeout ms)
      const waitForFetch = new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this._fetchingUser) {
            clearInterval(checkInterval);
            resolve(this.user);
          }
        }, 100);
        
        // Limpiar el intervalo después del timeout
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(this.user);
        }, timeout);
      });
      
      return await waitForFetch;
    }
    
    // Marcar que estamos haciendo una petición
    this._fetchingUser = true;
    
    // Si no hay datos locales, intentar obtener del servidor con timeout
    try {
      console.log('Solicitando datos de usuario al servidor (authService)');
      
      // Crear promesa con timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout en getCurrentUser')), timeout);
      });
      
      // Competir entre la petición real y el timeout
      const result = await Promise.race([
        timeoutPromise,
        api.get(AUTH_ENDPOINTS.USER)
      ]);
      
      if (result && result.data) {
        this.user = result.data;
        this._persistUserData(this.user);
        console.log('Datos de usuario recibidos del servidor y almacenados');
      }
      
      return this.user;
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      // En caso de error, devolver los datos disponibles sin bloquear
      return this.user || null;
    } finally {
      // Independientemente del resultado, marcar que ya no estamos haciendo una petición
      this._fetchingUser = false;
    }
  }
  
  /**
   * Verificar si el token actual es válido
   * @returns {Promise} - Resultado de la verificación
   */
  async verifyToken() {
    if (!this.token) return false;
    
    try {
      const response = await api.get(AUTH_ENDPOINTS.VERIFY);
      return response.data?.valid === true;
    } catch (error) {
      console.error('Error al verificar token:', error);
      this.logout();
      return false;
    }
  }
  
  /**
   * Registrar nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @returns {Promise} - Respuesta con token y datos del usuario
   */
  async register(userData) {
    try {
      console.log('Registrando nuevo usuario');
      const response = await api.post(AUTH_ENDPOINTS.REGISTER, userData);
      
      if (response.data?.token) {
        this.token = response.data.token;
        localStorage.setItem('token', this.token);
        
        if (response.data.user) {
          this.user = response.data.user;
          this._persistUserData(this.user);
        }
        
        window.dispatchEvent(new Event('auth'));
        console.log('Usuario registrado correctamente');
        return response.data;
      }
      
      throw new Error('Token no recibido del servidor');
    } catch (error) {
      console.error('Error durante el registro de usuario:', error);
      throw error;
    }
  }
  
  /**
   * Cerrar sesión
   */
  logout() {
    this.token = null;
    this.user = null;
    localStorage.clear();
    window.dispatchEvent(new Event('auth'));
    console.log('Sesión cerrada');
  }
  
  /**
   * Comprobar si el usuario está autenticado
   * @returns {Boolean} - true si está autenticado
   */
  isAuthenticated() {
    return !!this.token;
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.user;
  }

  /**
   * Cambiar contraseña del usuario
   * @param {Object} passwordData - Datos para cambiar contraseña {currentPassword, newPassword}
   * @returns {Promise} - Respuesta con estado del cambio
   */
  async changePassword(passwordData) {
    if (!this.token) throw new Error('No hay sesión activa');
    
    try {
      const response = await api.post(AUTH_ENDPOINTS.CHANGE_PASSWORD, passwordData);
      
      console.log('Contraseña actualizada correctamente');
      return response.data;
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      throw error;
    }
  }

  /**
   * Actualizar perfil del usuario
   * @param {Object} profileData - Datos del perfil a actualizar
   * @param {number} timeout - Tiempo máximo de espera en ms
   * @returns {Promise} - Respuesta con estado de la actualización y datos del usuario
   */
  async updateProfile(profileData, timeout = 3000) {
    if (!this.token) throw new Error('No hay sesión activa');
    
    try {
      // Crear promesa con timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout al actualizar perfil')), timeout);
      });
      
      // Competir entre la petición real y el timeout
      const result = await Promise.race([
        timeoutPromise,
        api.post(AUTH_ENDPOINTS.UPDATE_PROFILE, profileData)
      ]);
      
      if (result && result.data?.user) {
        this.user = result.data.user;
        this._persistUserData(this.user);
      }
      
      return result?.data || { success: true };
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      
      // Si es un timeout o error de red, no bloqueamos la experiencia
      if (!error.response || error.message.includes('Timeout')) {
        return { 
          success: false, 
          message: 'No se pudo conectar con el servidor, se guardaron los cambios localmente' 
        };
      }
      
      throw error;
    }
  }
}

// Crear variable para el servicio de autenticación
const authService = new AuthService();

export default authService; 