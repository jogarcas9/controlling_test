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
      this.logout();
    } finally {
      this.initialized = true;
    }
  }

  /**
   * Iniciar sesión
   * @param {Object} credentials - Credenciales {email, password}
   * @returns {Promise} - Respuesta con token y datos del usuario
   */
  async login(credentials) {
    try {
      const response = await api.post(AUTH_ENDPOINTS.LOGIN, credentials);
      
      if (response.data?.token) {
        this.token = response.data.token;
        localStorage.setItem('token', this.token);
        
        if (response.data.user) {
          this.user = response.data.user;
          localStorage.setItem('user', JSON.stringify(this.user));
          
          // Guardar también el nombre y email por separado para compatibilidad
          let nombreCompleto = '';
          
          // Construir nombre completo si hay nombre y apellidos
          if (this.user.nombre && this.user.apellidos) {
            nombreCompleto = `${this.user.nombre} ${this.user.apellidos}`;
            localStorage.setItem('userName', nombreCompleto);
          } 
          else if (this.user.nombre) {
            localStorage.setItem('userName', this.user.nombre);
          }
          else if (this.user.username) {
            localStorage.setItem('userName', this.user.username);
          }
          
          if (this.user.email) {
            localStorage.setItem('userEmail', this.user.email);
          }
        }
        
        window.dispatchEvent(new Event('auth'));
        return response.data;
      }
      
      throw new Error('Token no recibido del servidor');
    } catch (error) {
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
      const response = await api.get(AUTH_ENDPOINTS.USER);
      if (response.data) {
        this.user = response.data;
        
        // Guardar los datos del usuario en localStorage
        localStorage.setItem('user', JSON.stringify(this.user));
        
        // También guardar el nombre y email por separado para compatibilidad
        let nombreCompleto = '';
        
        if (this.user.nombre && this.user.apellidos) {
          nombreCompleto = `${this.user.nombre} ${this.user.apellidos}`;
          localStorage.setItem('userName', nombreCompleto);
        } 
        else if (this.user.nombre) {
          localStorage.setItem('userName', this.user.nombre);
        }
        else if (this.user.username) {
          localStorage.setItem('userName', this.user.username);
        }
        else if (this.user.email) {
          // Si no hay nombre, usar la parte local del email
          localStorage.setItem('userName', this.user.email.split('@')[0]);
        }
        
        if (this.user.email) {
          localStorage.setItem('userEmail', this.user.email);
        }
      }
      
      return this.user;
    } catch (error) {
      this.logout();
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
    const response = await api.post(AUTH_ENDPOINTS.REGISTER, userData);
    
    if (response.data?.token) {
      this.token = response.data.token;
      localStorage.setItem('token', this.token);
      
      if (response.data.user) {
        this.user = response.data.user;
        localStorage.setItem('user', JSON.stringify(this.user));
        
        // Guardar también el nombre y email por separado para compatibilidad
        let nombreCompleto = '';
        
        // Construir nombre completo si hay nombre y apellidos
        if (this.user.nombre && this.user.apellidos) {
          nombreCompleto = `${this.user.nombre} ${this.user.apellidos}`;
          localStorage.setItem('userName', nombreCompleto);
        } 
        else if (this.user.nombre) {
          localStorage.setItem('userName', this.user.nombre);
        }
        else if (this.user.username) {
          localStorage.setItem('userName', this.user.username);
        }
        
        if (this.user.email) {
          localStorage.setItem('userEmail', this.user.email);
        }
      }
      
      window.dispatchEvent(new Event('auth'));
      return response.data;
    }
    
    throw new Error('Token no recibido del servidor');
  }
  
  /**
   * Cerrar sesión
   */
  logout() {
    this.token = null;
    this.user = null;
    localStorage.clear();
    window.dispatchEvent(new Event('auth'));
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