/**
 * Punto central de exportación para todos los servicios
 * Esto facilita la importación de múltiples servicios desde un solo punto
 */

const syncService = require('./syncService');
const allocationService = require('./allocationService');

// Exportar todos los servicios como un objeto
module.exports = {
  syncService,
  allocationService
}; 