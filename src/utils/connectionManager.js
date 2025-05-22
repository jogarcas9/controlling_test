import { checkServerHealth } from './api';

class ConnectionManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.serverHealthy = true;
    this.listeners = new Set();
    this.healthCheckInterval = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('online', () => this.handleConnectionChange(true));
    window.addEventListener('offline', () => this.handleConnectionChange(false));
    
    // Iniciar chequeos de salud del servidor
    this.startHealthCheck();
  }

  startHealthCheck() {
    // Chequear inmediatamente
    this.checkHealth();
    
    // Configurar chequeos periódicos cada 30 segundos
    this.healthCheckInterval = setInterval(() => this.checkHealth(), 30000);
  }

  async checkHealth() {
    try {
      const { ok } = await checkServerHealth();
      if (this.serverHealthy !== ok) {
        this.serverHealthy = ok;
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error al verificar la salud del servidor:', error);
      if (this.serverHealthy) {
        this.serverHealthy = false;
        this.notifyListeners();
      }
    }
  }

  handleConnectionChange(isOnline) {
    this.isOnline = isOnline;
    if (isOnline) {
      // Al recuperar la conexión, verificar la salud del servidor
      this.checkHealth();
    } else {
      this.serverHealthy = false;
    }
    this.notifyListeners();
  }

  addListener(callback) {
    this.listeners.add(callback);
    // Notificar el estado actual inmediatamente
    callback({
      isOnline: this.isOnline,
      serverHealthy: this.serverHealthy
    });
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners() {
    const status = {
      isOnline: this.isOnline,
      serverHealthy: this.serverHealthy
    };
    this.listeners.forEach(callback => callback(status));
  }

  cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    window.removeEventListener('online', this.handleConnectionChange);
    window.removeEventListener('offline', this.handleConnectionChange);
  }
}

export const connectionManager = new ConnectionManager(); 