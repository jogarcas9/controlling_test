import api from '../utils/api';

const AUTH_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  VERIFY: '/api/auth/verify',
  USER: '/api/auth/user'
};

/**
 * Servicio centralizado para la autenticación
 * Maneja todas las operaciones relacionadas con la autenticación y usuarios
 */
class AuthService {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = null;
    this.initialized = false;
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
      // Guardar objeto completo de usuario
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Guardar el ID del usuario, si está disponible
      if (userData._id || userData.id) {
        localStorage.setItem('userId', userData._id || userData.id);
      }
      
      // Construir y guardar el nombre completo para mostrar
      let displayName = '';
      
      if (userData.nombre && userData.apellidos) {
        displayName = `${userData.nombre} ${userData.apellidos}`;
      } else if (userData.nombre) {
        displayName = userData.nombre;
      } else if (userData.name) {
        displayName = userData.name;
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
   * Obtener datos del usuario actual
   * @returns {Promise} - Datos del usuario
   */
  async getCurrentUser() {
    if (!this.token) return null;
    
    try {
      // Si ya tenemos los datos del usuario en memoria, devolverlos
      if (this.user) {
        return this.user;
      }
      
      // Intentar obtener los datos del usuario desde localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          this.user = JSON.parse(storedUser);
          return this.user;
        } catch (error) {
          console.error('Error al parsear datos de usuario almacenados:', error);
        }
      }
      
      // Si no tenemos los datos en memoria ni en localStorage, obtenerlos del servidor
      console.log('Obteniendo datos de usuario desde el servidor');
      const response = await api.get(AUTH_ENDPOINTS.USER);
      
      if (response.data) {
        this.user = response.data;
        this._persistUserData(this.user);
        console.log('Datos de usuario obtenidos correctamente');
      }
      
      return this.user;
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      // Solo cerrar sesión si es un error de autenticación (401)
      if (error.response && error.response.status === 401) {
        console.log('Sesión expirada o no válida, cerrando sesión');
        this.logout();
      }
      throw error;
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
}

// Crear variable para el servicio de autenticación
const authService = new AuthService();

export default authService; 