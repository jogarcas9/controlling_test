/**
 * Punto central de exportación para todos los servicios
 * Esto facilita la importación de múltiples servicios desde un solo punto
 */

const allocationService = require('./allocationService');
const syncService = require('./syncService');

// Exportar todos los servicios como un objeto
module.exports = {
  allocationService,
  syncService
}; 