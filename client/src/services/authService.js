import api from '../utils/api';
import config from '../utils/config';

/**
 * Servicio centralizado para la autenticación
 * Maneja todas las operaciones relacionadas con la autenticación y usuarios
 */
class AuthService {
  /**
   * Iniciar sesión
   * @param {Object} credentials - Credenciales {email, password}
   * @returns {Promise} - Respuesta con token y datos del usuario
   */
  async login(credentials) {
    try {
      console.log('AuthService: Iniciando login con:', credentials.email);
      const response = await api.post(config.AUTH.LOGIN, credentials);
      
      if (response.data && response.data.token) {
        console.log('AuthService: Login exitoso. Guardando token');
        localStorage.setItem('token', response.data.token);
        
        if (response.data.user) {
          const { id, email, username, nombre } = response.data.user;
          localStorage.setItem('userId', id);
          localStorage.setItem('userEmail', email);
          localStorage.setItem('userName', nombre || username || email.split('@')[0]);
        }
        
        // Disparar evento storage para actualizar componentes
        window.dispatchEvent(new Event('storage'));
      }
      
      return response.data;
    } catch (error) {
      console.error('AuthService: Error en login:', error);
      throw error;
    }
  }
  
  /**
   * Obtener datos del usuario actual
   * @returns {Promise} - Datos del usuario
   */
  async getCurrentUser() {
    try {
      console.log('AuthService: Obteniendo datos del usuario actual');
      const response = await api.get(config.AUTH.USER);
      return response.data;
    } catch (error) {
      console.error('AuthService: Error al obtener usuario:', error);
      throw error;
    }
  }
  
  /**
   * Verificar si el token actual es válido
   * @returns {Promise} - Resultado de la verificación
   */
  async verifyToken() {
    try {
      console.log('AuthService: Verificando token');
      const response = await api.get(config.AUTH.VERIFY);
      return response.data;
    } catch (error) {
      console.error('AuthService: Error al verificar token:', error);
      this.logout();
      throw error;
    }
  }
  
  /**
   * Registrar nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @returns {Promise} - Respuesta con token y datos del usuario
   */
  async register(userData) {
    try {
      console.log('AuthService: Registrando usuario:', userData.email);
      const response = await api.post(config.AUTH.REGISTER, userData);
      
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        
        if (response.data.user) {
          const { id, email, username, nombre } = response.data.user;
          localStorage.setItem('userId', id);
          localStorage.setItem('userEmail', email);
          localStorage.setItem('userName', nombre || username || email.split('@')[0]);
        }
        
        window.dispatchEvent(new Event('storage'));
      }
      
      return response.data;
    } catch (error) {
      console.error('AuthService: Error en registro:', error);
      throw error;
    }
  }
  
  /**
   * Cerrar sesión
   */
  logout() {
    console.log('AuthService: Cerrando sesión');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    window.dispatchEvent(new Event('storage'));
  }
  
  /**
   * Comprobar si el usuario está autenticado
   * @returns {Boolean} - true si está autenticado
   */
  isAuthenticated() {
    return !!localStorage.getItem('token');
  }
}

// Crear variable para el servicio de autenticación
const authService = new AuthService();

export default authService; 