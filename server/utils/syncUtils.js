const { ParticipantAllocation } = require('../models');
const syncService = require('../services/syncService');

/**
 * Verifica y corrige todas las asignaciones de participantes que no tienen gastos personales asociados
 * @returns {Object} Resultado de la operación con estadísticas
 */
const syncAllAllocations = async () => {
  console.log('Iniciando sincronización de todas las asignaciones de participantes...');
  
  const stats = {
    total: 0,
    processed: 0,
    errors: 0,
    created: 0,
    updated: 0,
    skipped: 0
  };
  
  try {
    // Encontrar todas las asignaciones que no tienen un gasto personal asociado
    // o que tienen el campo personalExpenseId pero el gasto no existe
    const allocations = await ParticipantAllocation.find({
      $or: [
        { personalExpenseId: null },
        { personalExpenseId: { $exists: false } }
      ]
    });
    
    stats.total = allocations.length;
    console.log(`Se encontraron ${stats.total} asignaciones que requieren verificación`);
    
    // Procesar cada asignación
    for (const allocation of allocations) {
      try {
        const result = await syncService.syncAllocationToPersonalExpense(allocation);
        stats.processed++;
        
        if (result.personalExpense._id) {
          if (allocation.personalExpenseId) {
            stats.updated++;
          } else {
            stats.created++;
          }
        }
      } catch (error) {
        console.error(`Error al sincronizar asignación ${allocation._id}:`, error);
        stats.errors++;
      }
    }
    
    console.log('Sincronización completada');
    console.log('Estadísticas:', stats);
    return stats;
  } catch (error) {
    console.error('Error durante la sincronización masiva:', error);
    throw error;
  }
};

module.exports = {
  syncAllAllocations
}; 